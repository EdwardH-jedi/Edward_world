import {
  GOLF_COURSE,
} from "@/lib/game/minigames/golf-course";
import { rankEntries } from "@/lib/sportsgang-board/rank";
import {
  MAX_SUBMISSION_BYTES,
  statusForRejection,
  validateSubmission,
} from "@/lib/sportsgang-board/schema";
import {
  boardKeyFor,
  getBoardMode,
  getBoardStore,
} from "@/lib/sportsgang-board/store";

/**
 * `GET`/`POST /api/sportsgang/golf-board` — the public one-hole golf board.
 *
 * **This board is casual and client-reported.** The browser plays the hole and
 * reports what happened; the server checks that what it was told is possible
 * under the rules it ranks by, and stores it. It cannot recompute a run — the
 * submitted shot log records what each shot did, not the power, contact and
 * aim that produced it — so no response here calls a score verified, and the
 * board says so on screen.
 *
 * What the server does own, and never takes from the client: the rank, the
 * received time, and the decision about whether a run is stored at all.
 *
 * Unlike `/api/joins`, which takes no request object at all, this route reads
 * a body and stores a per-device anonymous id. That id is generated on the
 * device, arrives only when a visitor has pressed submit, and is never
 * returned to any other browser — `rankEntries` strips it from every row.
 *
 * `force-dynamic` for the same reason the counter pins it: a board must never
 * be baked into a static response.
 */
export const dynamic = "force-dynamic";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

const BOARD_KEY = boardKeyFor(GOLF_COURSE.courseId, GOLF_COURSE.rulesVersion);

/** How many rows the board returns. */
const PAGE_SIZE = 25;

export async function GET(request: Request): Promise<Response> {
  const mode = getBoardMode();
  // The caller may name itself so its own row can be marked. It is not
  // authentication and grants nothing: the id only ever matches a row the same
  // device submitted, and no id is returned to anyone.
  const you = new URL(request.url).searchParams.get("anonId") ?? undefined;

  try {
    const entries = await getBoardStore().read(BOARD_KEY);
    return json({
      mode,
      courseId: GOLF_COURSE.courseId,
      rulesVersion: GOLF_COURSE.rulesVersion,
      par: GOLF_COURSE.par,
      holeM: GOLF_COURSE.holeM,
      verification: "client-reported",
      entries: rankEntries(entries, you).slice(0, PAGE_SIZE),
    });
  } catch {
    // Production with nothing provisioned lands here. Say the board is
    // unavailable; never answer with an empty board, which would read as
    // "nobody has played yet".
    return json({ mode, error: "BOARD_UNAVAILABLE" }, 503);
  }
}

export async function POST(request: Request): Promise<Response> {
  // Refuse an oversized body before reading it, where the length is declared.
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_SUBMISSION_BYTES) {
    return json({ error: "BODY_TOO_LARGE" }, 413);
  }

  const raw = await request.text();
  if (raw.length > MAX_SUBMISSION_BYTES) {
    return json({ error: "BODY_TOO_LARGE" }, 413);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return json({ error: "MALFORMED_JSON" }, 400);
  }

  const checked = validateSubmission(parsed, GOLF_COURSE);
  if (!checked.ok) {
    return json(
      { error: checked.code, detail: checked.detail },
      statusForRejection(checked.code),
    );
  }

  const accepted = checked.value;
  const store = getBoardStore();

  try {
    const outcome = await store.submit(BOARD_KEY, {
      anonId: accepted.anonId,
      runId: accepted.runId,
      displayName: accepted.displayName,
      totalStrokes: accepted.totalStrokes,
      shotCount: accepted.shotCount,
      penaltyStrokes: accepted.penaltyStrokes,
      elapsedSimulationMs: accepted.elapsedSimulationMs,
      longestDriveM: accepted.longestDriveM,
      // The server's clock, not the client's. It orders tied rows for display
      // and is the only timestamp anyone sees.
      receivedAt: Date.now(),
    });

    if (outcome.kind === "RATE_LIMITED") {
      return json({ error: "RATE_LIMITED" }, 429);
    }

    // Read back and rank, so the position reported is the one the board will
    // actually show rather than one computed from what was just sent.
    const entries = await getBoardStore().read(BOARD_KEY);
    const ranked = rankEntries(entries, accepted.anonId);
    const yours = ranked.find((entry) => entry.runId === accepted.runId) ?? null;

    return json({
      outcome: outcome.kind,
      mode: getBoardMode(),
      verification: "client-reported",
      // Absent when this run did not become the player's best — there is no
      // rank for a run that is not on the board.
      rank: yours?.rank ?? null,
      displayName: accepted.displayName,
      entries: ranked.slice(0, PAGE_SIZE),
    });
  } catch {
    return json({ error: "BOARD_UNAVAILABLE" }, 503);
  }
}
