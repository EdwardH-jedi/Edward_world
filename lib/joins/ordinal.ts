/**
 * English ordinals for the join counter.
 *
 * Kept separate from anything that touches `fetch` or the DOM so the rule can
 * be tested directly — the teens are the only interesting part, and they are
 * exactly where a naive last-digit implementation goes wrong.
 */

/** `1 → "1st"`, `11 → "11th"`, `1024 → "1,024th"`. */
export function formatOrdinal(value: number): string {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`not a countable position: ${value}`);
  }

  const grouped = value.toLocaleString("en-US");
  const lastTwo = value % 100;

  // 11th, 12th and 13th break the last-digit rule, and so does every hundred
  // above them — 111th, 212th, 1013th.
  if (lastTwo >= 11 && lastTwo <= 13) return `${grouped}th`;

  switch (value % 10) {
    case 1:
      return `${grouped}st`;
    case 2:
      return `${grouped}nd`;
    case 3:
      return `${grouped}rd`;
    default:
      return `${grouped}th`;
  }
}

/** The line the world shows on arrival. */
export function formatJoinLine(total: number): string {
  return `You are the ${formatOrdinal(total)} player to join the world.`;
}
