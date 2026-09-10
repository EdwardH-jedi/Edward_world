/**
 * The one definition of what a visitor's display name is.
 *
 * Pure, and deliberately shared by the browser and the route handler: if the
 * client tidied a name one way and the server another, what a visitor agreed
 * to publish and what actually appeared on the board would differ. So both
 * import this, and the server normalises again rather than trusting what
 * arrived — a client can send anything.
 *
 * What this is not: an identity. The name is a **label** on a run, and two
 * visitors may pick the same one. Who a run belongs to is the anonymous id in
 * `identity.ts`, which never leaves the device except as an opaque string and
 * is never shown. Changing a name therefore renames that visitor's own entry
 * and cannot merge it into anybody else's.
 */

/** Shown for a run submitted without a name. Never a stored nickname. */
export const GUEST_NAME = "GUEST";

/**
 * Longest name accepted, in Unicode code points.
 *
 * Code points rather than UTF-16 units, so a Korean syllable and a Latin
 * letter each cost one and `"안녕하세요"` is five characters rather than five
 * of something else. Astral characters — an emoji, say — also cost one each
 * even though JavaScript's `.length` would call them two.
 */
export const NICKNAME_MAX_CODE_POINTS = 20;
export const NICKNAME_MIN_CODE_POINTS = 1;

/**
 * Bytes of UTF-8 a submitted name may occupy before it is rejected outright.
 *
 * The code-point limit is the rule a visitor sees. This is the separate,
 * blunter guard on what the route will even parse, because 20 code points can
 * still be a lot of bytes and the server should not be the place that finds
 * out.
 */
export const NICKNAME_MAX_BYTES = 120;

/** Counts what a person would call characters: code points, not UTF-16 units. */
export function countCodePoints(value: string) {
  return [...value].length;
}

/**
 * Tidies a name the way both sides agree to tidy it.
 *
 * In order:
 *
 * 1. **NFC.** Korean typed through an IME can arrive decomposed — `한` as an
 *    initial, a medial and a final rather than one syllable. Composing first
 *    means the length limit counts syllables, and that two spellings of the
 *    same name are the same name.
 * 2. **Anything that separates words becomes a space** — the Unicode
 *    separators, and the whitespace controls. This has to happen before the
 *    strip below, which would otherwise delete a tab and turn `"a\tb"` into
 *    `"ab"`.
 * 3. **Control and formatting characters are dropped**, not replaced: the
 *    remaining controls, and the invisible formatting characters that would
 *    let a name carry a bidi override or a zero-width joiner into a list other
 *    people read. None of them separate words, so they leave no space behind.
 * 4. **Runs of spaces collapse** and the ends are trimmed, so `"  ed   ward  "`
 *    and `"ed ward"` are one name rather than two entries.
 *
 * It does **not** escape anything for HTML. Nothing here is ever rendered as
 * markup — the name reaches the DOM as a React text node — and escaping here
 * would put `&amp;` in a name that a person typed `&` into.
 */
export function normalizeNickname(raw: string): string {
  return (
    raw
      .normalize("NFC")
      // Separators first, and only then the strip. A tab or a newline between
      // two words is a word separator, and `\p{C}` would otherwise delete it
      // — turning "a\tb" into "ab" rather than "a b". So everything that acts
      // as a space becomes one before anything is removed: the Unicode
      // separators, and the whitespace controls that `\p{Cc}` also covers.
      .replace(/[\p{Z}\t\n\r\f\v\u0085]+/gu, " ")
      // What is left of `\p{C}` is Cc, Cf, Co, Cs and Cn — the remaining
      // controls, the invisible formatting characters that could carry a bidi
      // override or a zero-width joiner into a list other people read, private
      // use, lone surrogates and unassigned code points. None of them separate
      // words, so they go without leaving a space behind.
      .replace(/\p{C}/gu, "")
      .replace(/ {2,}/g, " ")
      .trim()
  );
}

export type NicknameRejection = "EMPTY" | "TOO_LONG" | "TOO_LARGE";

export type NicknameCheck =
  | { readonly ok: true; readonly name: string }
  | { readonly ok: false; readonly reason: NicknameRejection };

/**
 * Normalises and checks a name a visitor asked to publish.
 *
 * An empty result is a rejection rather than a silent fall back to `GUEST`:
 * somebody who opened the box and typed only spaces has not asked to be
 * called `GUEST`, and the form should say so. Playing anonymously is a
 * different path — see `displayNameFor`.
 */
export function checkNickname(raw: string): NicknameCheck {
  if (new TextEncoder().encode(raw).length > NICKNAME_MAX_BYTES * 4) {
    // A blunt pre-filter so a megabyte of text is refused before it is
    // normalised. The real limit is the code-point one below.
    return { ok: false, reason: "TOO_LARGE" };
  }

  const name = normalizeNickname(raw);
  if (countCodePoints(name) < NICKNAME_MIN_CODE_POINTS) {
    return { ok: false, reason: "EMPTY" };
  }
  if (countCodePoints(name) > NICKNAME_MAX_CODE_POINTS) {
    return { ok: false, reason: "TOO_LONG" };
  }
  if (new TextEncoder().encode(name).length > NICKNAME_MAX_BYTES) {
    return { ok: false, reason: "TOO_LARGE" };
  }
  return { ok: true, name };
}

/**
 * What a run is published as: the visitor's name, or `GUEST` without one.
 *
 * This is the only place `GUEST` is applied, so a board row and a result panel
 * cannot disagree about what an unnamed player is called.
 */
export function displayNameFor(raw: string | null | undefined): string {
  if (raw === null || raw === undefined) return GUEST_NAME;
  const checked = checkNickname(raw);
  return checked.ok ? checked.name : GUEST_NAME;
}

/** Why a name was refused, in words a visitor can act on. */
export function describeNicknameRejection(reason: NicknameRejection): string {
  if (reason === "EMPTY") return "Type a name, or play as GUEST.";
  if (reason === "TOO_LONG") {
    return `That is longer than ${NICKNAME_MAX_CODE_POINTS} characters.`;
  }
  return "That name is too long to store.";
}
