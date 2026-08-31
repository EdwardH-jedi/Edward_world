import { describe, expect, it } from "vitest";
import { garments, getGarment } from "@/data/wardrobe";
import {
  archiveReducer,
  archivedInSlot,
  archivedSlots,
  canSaveLook,
  completedStages,
  countWorn,
  createArchiveState,
  currentStage,
  isArchived,
  isComplete,
  isWorn,
  MINIMUM_LOOK_SLOTS,
  type ArchiveAction,
  type ArchiveState,
} from "@/lib/game/wardrobe-archive";
import {
  createGarmentRoutine,
  createHangingRoutine,
  createMannequinRoutine,
  GARMENT_ART_SIZE,
  HANGER_ART_SIZE,
  MANNEQUIN_ART_SIZE,
  outfitColours,
  shadeHex,
} from "@/lib/pixel/wardrobe";
import {
  deserializeOutfit,
  serializeOutfit,
  SAVED_LOOK_KEY,
} from "@/lib/storage/saved-look";
import { OUTFIT_SLOTS, WARDROBE_STAGES } from "@/types/wardrobe";
import type { Raster } from "@/lib/pixel/raster";

function apply(state: ArchiveState, ...actions: readonly ArchiveAction[]) {
  return actions.reduce(archiveReducer, state);
}

/** Archives a garment the way the room does: look at it, then keep it. */
function keep(state: ArchiveState, garmentId: string) {
  return apply(state, { type: "ARCHIVE", garmentId });
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
  it("will not let a garment be worn before it has been archived", () => {
    const state = apply(createArchiveState(), {
      type: "WEAR",
      garmentId: "grey-hoodie",
    });
    expect(state.outfit).toEqual({});
    expect(countWorn(state.outfit)).toBe(0);
  });

  it("ignores garments the catalogue does not know", () => {
    const state = apply(
      createArchiveState(),
      { type: "SELECT", garmentId: "no-such-garment" },
      { type: "ARCHIVE", garmentId: "no-such-garment" },
    );
    expect(state.selected).toBeNull();
    expect(state.archived).toEqual([]);
  });

  it("puts a garment on the table without archiving it", () => {
    const state = apply(createArchiveState(), {
      type: "SELECT",
      garmentId: "cream-tee",
    });
    expect(state.selected).toBe("cream-tee");
    expect(isArchived(state, "cream-tee")).toBe(false);
  });

  it("archives a garment once, however many times it is asked", () => {
    const state = keep(keep(createArchiveState(), "cream-tee"), "cream-tee");
    expect(state.archived).toEqual(["cream-tee"]);
    expect(state.selected).toBe("cream-tee");
  });

  it("puts a garment in its own slot and replaces what was there", () => {
    const state = apply(
      keep(keep(createArchiveState(), "grey-hoodie"), "cream-tee"),
      { type: "WEAR", garmentId: "grey-hoodie" },
      { type: "WEAR", garmentId: "cream-tee" },
    );
    expect(state.outfit).toEqual({ TOP: "cream-tee" });
    expect(isWorn(state, "cream-tee")).toBe(true);
    expect(isWorn(state, "grey-hoodie")).toBe(false);
  });

  it("takes a garment back off, and ignores an empty slot", () => {
    const worn = apply(keep(createArchiveState(), "grey-hoodie"), {
      type: "WEAR",
      garmentId: "grey-hoodie",
    });
    const bare = apply(worn, { type: "REMOVE", slot: "TOP" });
    expect(bare.outfit).toEqual({});
    expect(apply(bare, { type: "REMOVE", slot: "TOP" })).toBe(bare);
  });

  it("refuses to save a look that is barely a look", () => {
    const one = apply(keep(createArchiveState(), "grey-hoodie"), {
      type: "WEAR",
      garmentId: "grey-hoodie",
    });
    expect(canSaveLook(one)).toBe(false);
    expect(apply(one, { type: "SAVE" }).savedOutfit).toBeNull();

    const two = apply(keep(one, "faded-denim"), {
      type: "WEAR",
      garmentId: "faded-denim",
    });
    expect(countWorn(two.outfit)).toBe(MINIMUM_LOOK_SLOTS);
    expect(canSaveLook(two)).toBe(true);

    const saved = apply(two, { type: "SAVE" });
    expect(saved.savedOutfit).toEqual({ TOP: "grey-hoodie", BOTTOM: "faded-denim" });
    expect(isComplete(saved)).toBe(true);
    // A snapshot, not a live view of the mannequin.
    expect(saved.savedOutfit).not.toBe(saved.outfit);
  });

  it("sorts the archive into layers, in capture order", () => {
    const state = keep(keep(keep(createArchiveState(), "cream-tee"), "leather-boots"), "grey-hoodie");
    expect(archivedInSlot(state, "TOP").map((g) => g.id)).toEqual([
      "cream-tee",
      "grey-hoodie",
    ]);
    expect(archivedInSlot(state, "SHOES").map((g) => g.id)).toEqual(["leather-boots"]);
    expect(archivedInSlot(state, "OUTER")).toEqual([]);
    expect([...archivedSlots(state)].sort()).toEqual(["SHOES", "TOP"]);
  });

  it("starts over completely, keeping nothing from the visit", () => {
    const used = apply(
      keep(keep(createArchiveState(), "grey-hoodie"), "faded-denim"),
      { type: "WEAR", garmentId: "grey-hoodie" },
      { type: "WEAR", garmentId: "faded-denim" },
      { type: "SAVE" },
      { type: "RESET" },
    );
    expect(used).toEqual(createArchiveState());
  });
});

describe("stage derivation", () => {
  it("opens on the first stage with nothing done", () => {
    const fresh = createArchiveState();
    expect(currentStage(fresh)).toBe("CAPTURE");
    expect(Object.values(completedStages(fresh)).some(Boolean)).toBe(false);
    expect(isComplete(fresh)).toBe(false);
  });

  it("moves through the product's loop by being used, not by advancing", () => {
    const selected = apply(createArchiveState(), {
      type: "SELECT",
      garmentId: "field-jacket",
    });
    expect(currentStage(selected)).toBe("ARCHIVE");

    const archived = keep(selected, "field-jacket");
    expect(currentStage(archived)).toBe("ORGANISE");

    // A second garment of the same kind is not a second layer.
    const sameLayer = keep(archived, "wool-overshirt");
    expect(currentStage(sameLayer)).toBe("ORGANISE");

    const twoLayers = keep(sameLayer, "faded-denim");
    expect(currentStage(twoLayers)).toBe("COMPOSE");

    const dressed = apply(twoLayers, { type: "WEAR", garmentId: "faded-denim" });
    expect(currentStage(dressed)).toBe("SAVE");

    const look = apply(dressed, { type: "WEAR", garmentId: "field-jacket" }, { type: "SAVE" });
    expect(completedStages(look)).toEqual({
      CAPTURE: true,
      ARCHIVE: true,
      ORGANISE: true,
      COMPOSE: true,
      SAVE: true,
    });
    // Every stage done: the ribbon rests on the last one rather than falling off.
    expect(currentStage(look)).toBe(WARDROBE_STAGES[WARDROBE_STAGES.length - 1]);
  });

  it("never reads a look kept on an earlier visit as progress", () => {
    // A previous visit's look lives in storage, not in reducer state, so a
    // returning visitor still starts the loop at CAPTURE.
    const returning = createArchiveState();
    expect(returning.savedOutfit).toBeNull();
    expect(currentStage(returning)).toBe("CAPTURE");
    expect(isComplete(returning)).toBe(false);
  });
});

describe("wardrobe art", () => {
  /** Collects every block a routine draws, so the art box can be checked. */
  function record(routine: (draw: Raster, frame: number) => void) {
    const blocks: { x: number; y: number; width: number; height: number }[] = [];
    const draw: Raster = (x, y, width, height) => {
      blocks.push({ x, y, width, height });
    };
    routine(draw, 0);
    return blocks;
  }

  function assertInside(
    blocks: readonly { x: number; y: number; width: number; height: number }[],
    size: { width: number; height: number },
    label: string,
  ) {
    expect(blocks.length, label).toBeGreaterThan(0);
    for (const block of blocks) {
      expect(block.x, `${label} x`).toBeGreaterThanOrEqual(0);
      expect(block.y, `${label} y`).toBeGreaterThanOrEqual(0);
      expect(block.x + block.width, `${label} right`).toBeLessThanOrEqual(size.width);
      expect(block.y + block.height, `${label} bottom`).toBeLessThanOrEqual(size.height);
    }
  }

  it("keeps every garment icon inside its art box", () => {
    for (const garment of garments) {
      assertInside(
        record(createGarmentRoutine(garment.slot, garment.colour)),
        GARMENT_ART_SIZE,
        `${garment.id} icon`,
      );
      assertInside(
        record(createHangingRoutine(garment.slot, garment.colour)),
        HANGER_ART_SIZE,
        `${garment.id} on a hanger`,
      );
    }
  });

  it("keeps the mannequin inside its art box, dressed or bare", () => {
    assertInside(record(createMannequinRoutine({})), MANNEQUIN_ART_SIZE, "bare form");

    const full = outfitColours(
      {
        OUTER: "field-jacket",
        TOP: "grey-hoodie",
        BOTTOM: "faded-denim",
        SHOES: "leather-boots",
      },
      getGarment,
    );
    expect(Object.keys(full).sort()).toEqual(["BOTTOM", "OUTER", "SHOES", "TOP"]);
    assertInside(record(createMannequinRoutine(full)), MANNEQUIN_ART_SIZE, "dressed form");
  });

  it("draws each garment in the colour the catalogue records", () => {
    const colours = new Set<string>();
    const draw: Raster = (_x, _y, _width, _height, colour) => {
      colours.add(colour);
    };
    createMannequinRoutine(outfitColours({ TOP: "cream-tee" }, getGarment))(draw, 0);
    expect(colours.has(getGarment("cream-tee")!.colour)).toBe(true);
  });

  it("shades a colour without leaving the hex range", () => {
    expect(shadeHex("#FFFFFF", 0.5)).toBe("#808080");
    expect(shadeHex("#000000")).toBe("#000000");
    expect(shadeHex("not a colour")).toBe("not a colour");
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
    expect(deserializeOutfit('{"SHOES":"grey-hoodie"}')).toBeNull();
    expect(deserializeOutfit('{"TOP":"grey-hoodie","SHOES":"grey-hoodie"}')).toEqual({
      TOP: "grey-hoodie",
    });
  });

  it("namespaces its storage key", () => {
    expect(SAVED_LOOK_KEY).toMatch(/^edwards-world:/);
  });
});
