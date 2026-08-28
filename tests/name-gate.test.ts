import { describe, expect, it } from "vitest";
import {
  APEX_AT,
  BRAZIER_AT,
  CHANNEL_STEP,
  consumesKey,
  createNameGateState,
  getMonumentResponse,
  NAME_LETTERS,
  NAME_TEXT,
  applyText,
  pressKey,
  readTypedText,
  SOCKET_COUNT,
  wordIndexOf,
} from "@/lib/game/name-gate";
import { letterAt, LINES, SEL } from "@/lib/pixel/monolith";

describe("the carved name", () => {
  it("is the name the monolith actually carries", () => {
    // Thirteen distinct carvings, all inside the seventy-letter face.
    expect(SEL).toHaveLength(SOCKET_COUNT);
    expect(new Set(SEL).size).toBe(SEL.length);
    for (const index of SEL) {
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(70);
    }
    // Read the selected carvings out and they spell the name.
    expect(SEL.map(letterAt).join("")).toBe(NAME_LETTERS);
    expect(NAME_LETTERS).toBe("SOONHYUNHWANG");
    expect(NAME_TEXT).toBe("SOON HYUN HWANG");
    expect(LINES).toEqual(["SOON", "HYUN", "HWANG"]);
  });

  it("maps every socket to its word", () => {
    expect(wordIndexOf(0)).toBe(0);
    expect(wordIndexOf(3)).toBe(0);
    expect(wordIndexOf(4)).toBe(1);
    expect(wordIndexOf(7)).toBe(1);
    expect(wordIndexOf(8)).toBe(2);
    expect(wordIndexOf(SOCKET_COUNT - 1)).toBe(2);
  });
});

describe("typing the name", () => {
  it("sets a letter into stone for each correct key", () => {
    let state = createNameGateState();
    expect(state.typed).toBe(0);
    state = pressKey(state, "S");
    expect(state.typed).toBe(1);
    expect(state.missAt).toBeNull();
    expect(state.solved).toBe(false);
  });

  it("is case-insensitive", () => {
    const upper = applyText(createNameGateState(), "SOONHYUNHWANG");
    const lower = applyText(createNameGateState(), "soonhyunhwang");
    const mixed = applyText(createNameGateState(), "SoOnHyUnHwAnG");
    for (const state of [upper, lower, mixed]) {
      expect(state.typed).toBe(SOCKET_COUNT);
      expect(state.solved).toBe(true);
    }
  });

  it("auto-skips spaces: typing the name with them still works", () => {
    const state = applyText(createNameGateState(), "SOON HYUN HWANG");
    expect(state.typed).toBe(SOCKET_COUNT);
    expect(state.solved).toBe(true);
    // And a space is never counted as a mistake.
    expect(state.misses).toBe(0);
  });

  it("flashes the socket and types nothing on a wrong key", () => {
    const before = applyText(createNameGateState(), "SOO");
    const after = pressKey(before, "X");
    expect(after.typed).toBe(before.typed);
    expect(after.missAt).toBe(3);
    expect(after.misses).toBe(1);
    // The next correct key clears the flash and advances.
    const recovered = pressKey(after, "N");
    expect(recovered.typed).toBe(4);
    expect(recovered.missAt).toBeNull();
  });

  it("counts repeated misses so a second flash still reads as new", () => {
    let state = applyText(createNameGateState(), "S");
    state = pressKey(state, "Z");
    const first = state.misses;
    state = pressKey(state, "Z");
    expect(state.misses).toBe(first + 1);
    expect(state.missAt).toBe(1);
  });

  it("ignores keys that are not letters, rather than calling them mistakes", () => {
    const start = applyText(createNameGateState(), "SOO");
    for (const key of ["Shift", "Tab", "ArrowLeft", "F5", "Control", "Enter", "1", "-"]) {
      const after = pressKey(start, key);
      expect(after.typed, key).toBe(start.typed);
      expect(after.misses, key).toBe(start.misses);
    }
  });

  it("lifts the last letter back out on backspace, across word gaps too", () => {
    // Four letters in is the end of SOON; backspacing must land on its N.
    let state = applyText(createNameGateState(), "SOONH");
    expect(state.typed).toBe(5);
    expect(wordIndexOf(state.typed - 1)).toBe(1);
    state = pressKey(state, "Backspace");
    expect(state.typed).toBe(4);
    expect(wordIndexOf(state.typed - 1)).toBe(0);
    state = pressKey(state, "Backspace");
    expect(state.typed).toBe(3);
  });

  it("does nothing on backspace at the very start", () => {
    const empty = createNameGateState();
    expect(pressKey(empty, "Backspace")).toEqual(empty);
  });

  it("stops accepting keys once the name is proven", () => {
    const solved = applyText(createNameGateState(), NAME_LETTERS);
    expect(solved.solved).toBe(true);
    expect(pressKey(solved, "A")).toBe(solved);
    expect(pressKey(solved, "Backspace")).toBe(solved);
  });

  it("never types past the last socket", () => {
    const state = applyText(createNameGateState(), `${NAME_LETTERS}GGGG`);
    expect(state.typed).toBe(SOCKET_COUNT);
  });
});

describe("reading a whole typed string", () => {
  it("accepts the canonical name pasted in one go", () => {
    const state = applyText(createNameGateState(), NAME_TEXT);
    expect(state.solved).toBe(true);
    expect(state.typed).toBe(SOCKET_COUNT);
    expect(state.misses).toBe(0);
  });

  it("ignores leading and trailing whitespace when validating", () => {
    for (const raw of ["   SOON HYUN HWANG", "SOON HYUN HWANG   ", "  soon hyun hwang  "]) {
      expect(applyText(createNameGateState(), raw).solved, raw).toBe(true);
    }
  });

  it("treats any number of spaces as free — they never fail the gate", () => {
    expect(applyText(createNameGateState(), "S O O N H Y U N H W A N G").solved).toBe(true);
    expect(applyText(createNameGateState(), "SOONHYUNHWANG").solved).toBe(true);
  });

  it("keeps only the matched prefix, so a wrong letter never lands", () => {
    const state = applyText(createNameGateState(), "SOONHXUN");
    expect(state.typed).toBe(5);
    expect(state.text).toBe("SOONH");
    expect(state.missAt).toBe(5);
    expect(state.misses).toBe(1);
    // Nothing after the refusal is kept, however much was typed past it.
    expect(applyText(createNameGateState(), "SOONHXUNHWANG").typed).toBe(5);
  });

  it("refuses to run past the last socket", () => {
    const over = applyText(createNameGateState(), `${NAME_TEXT} EXTRA`);
    expect(over.typed).toBe(SOCKET_COUNT);
    expect(over.solved).toBe(true);
  });

  it("re-reads a shortened string, which is what backspace produces", () => {
    const full = applyText(createNameGateState(), "SOON HY");
    expect(full.typed).toBe(6);
    const back = applyText(full, full.text.slice(0, -1));
    expect(back.typed).toBe(5);
    expect(back.text).toBe("SOON H");
  });

  it("reports where a refusal happened without mutating anything", () => {
    expect(readTypedText("SOON HYUN HWANG")).toEqual({
      accepted: 13,
      kept: "SOON HYUN HWANG",
      rejectedAt: null,
    });
    expect(readTypedText("SQ").rejectedAt).toBe(1);
    // Digits and punctuation are skipped outright, not counted as refusals.
    expect(readTypedText("S1O!O-N").accepted).toBe(4);
    expect(readTypedText("S1O!O-N").rejectedAt).toBeNull();
  });
});

describe("which keys the ritual takes at all", () => {
  it("takes the letters, the space and backspace", () => {
    for (const key of ["a", "Z", "s", " ", "Backspace"]) {
      expect(consumesKey(key), key).toBe(true);
    }
  });

  it("leaves the browser its own shortcuts and navigation keys", () => {
    for (const key of ["Tab", "Escape", "Enter", "ArrowLeft", "F5", "Shift", "/", "'"]) {
      expect(consumesKey(key), key).toBe(false);
    }
  });

  it("agrees with pressKey: anything it declines changes nothing", () => {
    const start = applyText(createNameGateState(), "SOO");
    for (const key of ["Tab", "Enter", "ArrowRight", "F1", "1", "/"]) {
      expect(consumesKey(key), key).toBe(false);
      expect(pressKey(start, key), key).toBe(start);
    }
  });
});

describe("the monument's answer", () => {
  it("derives its thresholds from the name, not from magic numbers", () => {
    expect(CHANNEL_STEP).toBe(3);
    expect(APEX_AT).toBe(7);
    // The braziers catch as typing reaches the final word.
    expect(BRAZIER_AT).toBe(SOCKET_COUNT - LINES[2].length);
    expect(BRAZIER_AT).toBe(8);
    expect(wordIndexOf(BRAZIER_AT)).toBe(2);
  });

  it("brightens a channel step every third letter", () => {
    expect(getMonumentResponse(0).channelSteps).toBe(0);
    expect(getMonumentResponse(2).channelSteps).toBe(0);
    expect(getMonumentResponse(3).channelSteps).toBe(1);
    expect(getMonumentResponse(9).channelSteps).toBe(3);
  });

  it("wakes the apex ring at halfway and the braziers on the last word", () => {
    expect(getMonumentResponse(APEX_AT - 1).apexAwake).toBe(false);
    expect(getMonumentResponse(APEX_AT).apexAwake).toBe(true);
    expect(getMonumentResponse(BRAZIER_AT - 1).braziersLit).toBe(false);
    expect(getMonumentResponse(BRAZIER_AT).braziersLit).toBe(true);
  });

  it("opens only on the full name", () => {
    expect(getMonumentResponse(SOCKET_COUNT - 1).open).toBe(false);
    expect(getMonumentResponse(SOCKET_COUNT).open).toBe(true);
  });
});
