import { afterEach, describe, expect, it, vi } from "vitest";
import { wardrobePersistence } from "@/lib/game/wardrobe-persistence";
import {
  clearSavedLook,
  readSavedLookRaw,
  SAVED_LOOK_KEY,
  serializeOutfit,
  writeSavedLook,
} from "@/lib/storage/saved-look";

const OUTFIT = { TOP: "grey-hoodie", BOTTOM: "faded-denim" } as const;

function browserStorage(initial: string | null = null) {
  const values = new Map<string, string>();
  if (initial !== null) values.set(SAVED_LOOK_KEY, initial);
  const storage = {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { values.set(key, value); }),
    removeItem: vi.fn((key: string) => { values.delete(key); }),
  };
  const dispatchEvent = vi.fn();
  vi.stubGlobal("window", { localStorage: storage, dispatchEvent });
  return { storage, dispatchEvent };
}

function allCopy(persistence: ReturnType<typeof wardrobePersistence>) {
  return Object.values(persistence.copy).join(" ");
}

afterEach(() => vi.unstubAllGlobals());

describe("Wardrobe persistence state and copy", () => {
  it("replaces every saved claim after a successful save then forget", () => {
    const { dispatchEvent } = browserStorage();
    expect(wardrobePersistence(readSavedLookRaw()).status).toBe("idle");

    expect(writeSavedLook(OUTFIT)).toBe(true);
    const saved = wardrobePersistence(readSavedLookRaw(), "saved");
    expect(saved.status).toBe("saved");
    expect(saved.look).toEqual(OUTFIT);
    expect(saved.copy.caption).toMatch(/LOOK SAVED/);
    expect(saved.copy.summary).toMatch(/saved in this browser/);

    expect(clearSavedLook()).toBe(true);
    const forgotten = wardrobePersistence(readSavedLookRaw(), "forgotten");
    expect(forgotten.status).toBe("forgotten");
    expect(forgotten.look).toBeNull();
    expect(forgotten.copy.caption).toBe("LOOK FORGOTTEN");
    expect(forgotten.copy.summary).toMatch(/Nothing is stored/);
    expect(forgotten.copy.announcement).toMatch(/Nothing is stored/);
    expect(allCopy(forgotten)).not.toMatch(/look saved|is saved|kept|stays in this browser/i);
    expect(dispatchEvent).toHaveBeenCalledTimes(2);
  });

  it("reconstructs a saved look on reload without an in-session save outcome", () => {
    browserStorage(serializeOutfit(OUTFIT));
    const reloaded = wardrobePersistence(readSavedLookRaw());
    expect(reloaded.status).toBe("saved");
    expect(reloaded.look).toEqual(OUTFIT);
    expect(reloaded.copy.caption).toMatch(/LOOK SAVED/);
  });

  it("uses the current snapshot when another tab removes or replaces a look", () => {
    expect(wardrobePersistence(null, "saved").status).toBe("forgotten");
    expect(wardrobePersistence(serializeOutfit(OUTFIT), "forgotten").status).toBe("saved");
  });

  it("distinguishes inaccessible storage from an empty frame", () => {
    const { storage } = browserStorage();
    expect(readSavedLookRaw()).toBeNull();
    storage.getItem.mockImplementation(() => { throw new Error("blocked"); });
    expect(readSavedLookRaw()).toBeUndefined();
    const unavailable = wardrobePersistence(readSavedLookRaw(), "saved");
    expect(unavailable.status).toBe("unavailable");
    expect(unavailable.look).toBeNull();
    expect(unavailable.copy.emptyFrame).toBe("UNAVAILABLE");
    expect(allCopy(unavailable)).not.toMatch(/look saved|is saved|kept|stays in this browser/i);
    expect(wardrobePersistence(readSavedLookRaw(), "forgotten").status).toBe("unavailable");
  });

  it("reports a failed save without claiming persistence or announcing a storage change", () => {
    const { storage, dispatchEvent } = browserStorage();
    storage.setItem.mockImplementation(() => { throw new Error("quota exceeded"); });
    expect(writeSavedLook(OUTFIT)).toBe(false);
    const failed = wardrobePersistence(readSavedLookRaw(), "save-error");
    expect(failed.status).toBe("save-error");
    expect(failed.look).toBeNull();
    expect(failed.copy.summary).toMatch(/could not be saved/);
    expect(allCopy(failed)).not.toMatch(/look saved|is saved|kept|stays in this browser/i);
    expect(dispatchEvent).not.toHaveBeenCalled();
  });

  it("keeps the previous frame and explains failure when an overwrite fails", () => {
    const { storage } = browserStorage(serializeOutfit(OUTFIT));
    storage.setItem.mockImplementation(() => { throw new Error("quota exceeded"); });
    expect(writeSavedLook({ TOP: "cream-tee", BOTTOM: "faded-denim" })).toBe(false);
    const failed = wardrobePersistence(readSavedLookRaw(), "save-error");
    expect(failed.look).toEqual(OUTFIT);
    expect(failed.status).toBe("save-error");
    expect(failed.copy.frameNote).toMatch(/SAVE FAILED/);
    expect(failed.copy.summary).toMatch(/could not be saved/);
  });

  it("does not claim a look was forgotten when storage removal fails", () => {
    const { storage, dispatchEvent } = browserStorage(serializeOutfit(OUTFIT));
    storage.removeItem.mockImplementation(() => { throw new Error("blocked"); });
    expect(clearSavedLook()).toBe(false);
    const failed = wardrobePersistence(readSavedLookRaw(), "forget-error");
    expect(failed.status).toBe("forget-error");
    expect(failed.look).toEqual(OUTFIT);
    expect(failed.copy.announcement).toMatch(/could not be forgotten/);
    expect(allCopy(failed)).not.toMatch(/nothing is stored|look forgotten/i);
    expect(dispatchEvent).not.toHaveBeenCalled();
  });

  it("does not turn invalid stored data into a successful persistence claim", () => {
    browserStorage('{"TOP":"unknown-garment"}');
    const invalid = wardrobePersistence(readSavedLookRaw());
    expect(invalid.status).toBe("idle");
    expect(invalid.look).toBeNull();
  });

  it("fails safely without browser storage", () => {
    vi.stubGlobal("window", undefined);
    expect(readSavedLookRaw()).toBeUndefined();
    expect(writeSavedLook(OUTFIT)).toBe(false);
    expect(clearSavedLook()).toBe(false);
    expect(wardrobePersistence(readSavedLookRaw()).status).toBe("unavailable");
  });
});
