import { describe, expect, it } from "vitest";
import { garments, getGarment } from "@/data/wardrobe";
import {
  archiveReducer,
  canAdvance,
  canSaveLook,
  countWorn,
  createArchiveState,
  isArchived,
  MINIMUM_LOOK_SLOTS,
  nextWardrobeStep,
  type ArchiveAction,
  type ArchiveState,
} from "@/lib/game/wardrobe-archive";
import {
  deserializeOutfit,
  serializeOutfit,
  SAVED_LOOK_KEY,
} from "@/lib/storage/saved-look";
import { OUTFIT_SLOTS, WARDROBE_STEPS } from "@/types/wardrobe";

function apply(state: ArchiveState, ...actions: readonly ArchiveAction[]) {
  return actions.reduce(archiveReducer, state);
}

describe("wardrobe catalogue", () => {
  it("covers every outfit slot with at least two options", () => {
    for (const slot of OUTFIT_SLOTS) {
      const options = garments.filter((garment) => garment.slot === slot);
      expect(options.length, `slot ${slot}`).toBeGreaterThanOrEqual(2);
    }
  });

  it("uses unique ids and carries only structural metadata", () => {
    expect(new Set(garments.map((g) => g.id)).size).toBe(garments.length);
    for (const garment of garments) {
      expect(garment.name.length).toBeGreaterThan(0);
      expect(garment.fabric.length).toBeGreaterThan(0);
      expect(garment.colour).toMatch(/^#[0-9A-Fa-f]{6}$/);
      // Nothing inferred, scored or claimed about the garment.
      expect(Object.keys(garment).sort()).toEqual([
        "colour",
        "colourName",
        "fabric",
        "id",
        "name",
        "season",
        "slot",
      ]);
    }
  });
});

describe("archive rules", () => {
  it("walks the product's own loop and stops at the end", () => {
    for (let index = 0; index < WARDROBE_STEPS.length - 1; index += 1) {
      expect(nextWardrobeStep(WARDROBE_STEPS[index])).toBe(
        WARDROBE_STEPS[index + 1],
      );
    }
    expect(nextWardrobeStep("COMPLETE")).toBe("COMPLETE");
  });

  it("will not let a garment be worn before it has been archived", () => {
    const state = apply(createArchiveState(), {
      type: "WEAR",
      garmentId: "grey-hoodie",
    });
    expect(state.outfit).toEqual({});
    expect(countWorn(state.outfit)).toBe(0);
  });

  it("archives on capture, and captures the same garment only once", () => {
    const once = apply(createArchiveState(), {
      type: "CAPTURE",
      garmentId: "grey-hoodie",
    });
    const twice = apply(once, { type: "CAPTURE", garmentId: "grey-hoodie" });
    expect(once.archived).toEqual(["grey-hoodie"]);
    expect(twice.archived).toEqual(["grey-hoodie"]);
    expect(isArchived(twice, "grey-hoodie")).toBe(true);
  });

  it("puts a garment in its own slot and replaces what was there", () => {
    const state = apply(
      createArchiveState(),
      { type: "CAPTURE", garmentId: "grey-hoodie" },
      { type: "CAPTURE", garmentId: "cream-tee" },
      { type: "WEAR", garmentId: "grey-hoodie" },
      { type: "WEAR", garmentId: "cream-tee" },
    );
    expect(state.outfit.TOP).toBe("cream-tee");
    expect(countWorn(state.outfit)).toBe(1);
    expect(getGarment("cream-tee")?.slot).toBe("TOP");
  });

  it("takes a garment back off", () => {
    const state = apply(
      createArchiveState(),
      { type: "CAPTURE", garmentId: "faded-denim" },
      { type: "WEAR", garmentId: "faded-denim" },
      { type: "REMOVE", slot: "BOTTOM" },
    );
    expect(state.outfit.BOTTOM).toBeUndefined();
  });

  it("refuses to save a look that is barely a look", () => {
    const thin = apply(
      createArchiveState(),
      { type: "CAPTURE", garmentId: "grey-hoodie" },
      { type: "WEAR", garmentId: "grey-hoodie" },
    );
    expect(canSaveLook(thin)).toBe(false);
    expect(apply(thin, { type: "SAVE" }).savedOutfit).toBeNull();

    const enough = apply(thin, ...[
      { type: "CAPTURE", garmentId: "faded-denim" } as const,
      { type: "WEAR", garmentId: "faded-denim" } as const,
    ]);
    expect(countWorn(enough.outfit)).toBe(MINIMUM_LOOK_SLOTS);
    expect(canSaveLook(enough)).toBe(true);
    const saved = apply(enough, { type: "SAVE" });
    expect(saved.savedOutfit).toEqual({ TOP: "grey-hoodie", BOTTOM: "faded-denim" });
    expect(saved.step).toBe("COMPLETE");
  });

  it("holds each step until its own precondition is met", () => {
    const fresh = createArchiveState();
    expect(canAdvance(fresh)).toBe(false);
    expect(apply(fresh, { type: "ADVANCE" }).step).toBe("CAPTURE");

    const captured = apply(fresh, { type: "CAPTURE", garmentId: "grey-hoodie" });
    expect(canAdvance(captured)).toBe(true);
    expect(apply(captured, { type: "ADVANCE" }).step).toBe("ARCHIVE");
  });

  it("needs more than one kind of garment before organising is meaningful", () => {
    const oneKind = apply(
      { ...createArchiveState(), step: "ORGANISE" },
      { type: "CAPTURE", garmentId: "grey-hoodie" },
      { type: "CAPTURE", garmentId: "cream-tee" },
    );
    expect(canAdvance(oneKind)).toBe(false);

    const twoKinds = apply(oneKind, { type: "CAPTURE", garmentId: "faded-denim" });
    expect(canAdvance(twoKinds)).toBe(true);
  });
});

describe("saved look storage", () => {
  it("round-trips an outfit", () => {
    const outfit = { TOP: "grey-hoodie", BOTTOM: "faded-denim" } as const;
    expect(deserializeOutfit(serializeOutfit(outfit))).toEqual(outfit);
  });

  it("returns null for anything it did not write", () => {
    expect(deserializeOutfit(null)).toBeNull();
    expect(deserializeOutfit("")).toBeNull();
    expect(deserializeOutfit("not json at all")).toBeNull();
    expect(deserializeOutfit("[1,2,3]")).toBeNull();
    expect(deserializeOutfit('"a string"')).toBeNull();
    expect(deserializeOutfit("{}")).toBeNull();
  });

  it("drops slots holding unknown or mismatched garments", () => {
    expect(deserializeOutfit('{"TOP":"no-such-garment"}')).toBeNull();
    // A real garment filed under the wrong slot is not trusted either.
    expect(deserializeOutfit('{"SHOES":"grey-hoodie"}')).toBeNull();
    expect(deserializeOutfit('{"TOP":"grey-hoodie","SHOES":"grey-hoodie"}')).toEqual({
      TOP: "grey-hoodie",
    });
  });

  it("namespaces its storage key", () => {
    expect(SAVED_LOOK_KEY.startsWith("edwards-world:")).toBe(true);
  });
});
