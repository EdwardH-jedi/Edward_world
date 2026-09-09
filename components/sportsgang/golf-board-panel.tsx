"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDialogFocus } from "@/components/ui/accessible-dialog";
import type { GolfRunResultV1 } from "@/lib/game/minigames/golf-result";
import {
  describeBoardError,
  fetchBoard,
  submitRun,
  type BoardView,
  type SubmitResult,
} from "@/lib/sportsgang-board/client";
import {
  getOrCreateAnonId,
  getStoredNickname,
  peekAnonId,
  rememberSubmitted,
  storeConsent,
  storeNickname,
  wasSubmitted,
} from "@/lib/sportsgang-board/identity";
import {
  checkNickname,
  describeNicknameRejection,
  GUEST_NAME,
  NICKNAME_MAX_CODE_POINTS,
} from "@/lib/sportsgang-board/nickname";

/**
 * The public golf board, and the one place a run is ever published.
 *
 * Three rules shape this component:
 *
 * 1. **Nothing is uploaded without being asked for.** Playing publishes
 *    nothing. The submit button appears only after a *completed* hole, and it
 *    opens a box that shows the exact name that will appear and who will see
 *    it. The upload happens on the second press, not the first.
 * 2. **A failure is never dressed as a success.** Every state the network can
 *    be in has its own words — submitting, submitted, already on the board,
 *    not your best, refused, unreachable — and none of them is a rank that was
 *    not returned by the server.
 * 3. **It says what kind of board it is.** Client-reported, always; and
 *    local-only when this process is the only place the rows exist.
 */

interface GolfBoardPanelProps {
  /** The finished run, or null when the sport just played was not golf. */
  run: GolfRunResultV1 | null;
  /** How many times this visitor has played golf this visit. */
  attempts: number;
}

type Phase =
  | { readonly kind: "IDLE" }
  | { readonly kind: "NAMING" }
  | { readonly kind: "SUBMITTING" }
  | { readonly kind: "DONE"; readonly result: SubmitResult }
  | { readonly kind: "FAILED"; readonly message: string };

export function GolfBoardPanel({ run, attempts }: GolfBoardPanelProps) {
  const [board, setBoard] = useState<BoardView | null>(null);
  const [boardError, setBoardError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>({ kind: "IDLE" });
  const [draftName, setDraftName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  /**
   * Applies whatever the board request came back with.
   *
   * A failure clears the rows and says why. It never leaves a stale board on
   * screen looking current, and it never substitutes an empty one, which would
   * read as "nobody has played yet".
   */
  const apply = useCallback((outcome: Awaited<ReturnType<typeof fetchBoard>>) => {
    if (outcome.ok) {
      setBoard(outcome.value);
      setBoardError(null);
    } else {
      setBoard(null);
      setBoardError(describeBoardError(outcome.error));
    }
    setLoading(false);
  }, []);

  // The network is an external system, so the state lands in its callback
  // rather than in the effect body — and the cancel flag stops a slow response
  // arriving after the visitor has already left RANK.
  useEffect(() => {
    let cancelled = false;
    void fetchBoard(peekAnonId()).then((outcome) => {
      if (!cancelled) apply(outcome);
    });
    return () => {
      cancelled = true;
    };
  }, [apply]);

  const retry = useCallback(() => {
    setLoading(true);
    setBoardError(null);
    void fetchBoard(peekAnonId()).then(apply);
  }, [apply]);

  // Only a completed hole can be published, and only once. `wasSubmitted` is
  // the local half of the guard so a re-render or a reload does not even ask;
  // the server refuses a repeated runId atomically, which is the real one.
  const publishable =
    run !== null && run.status === "completed" && !wasSubmitted(run.runId);

  const checked = checkNickname(draftName);
  const nameToPublish = checked.ok ? checked.name : GUEST_NAME;
  /**
   * A name that was typed and cannot be used.
   *
   * An empty box is not a mistake — it means GUEST, which is offered on its
   * own button. A box with 25 characters in it *is* a mistake, and QA
   * (session E) found it was only reported after pressing a button that had
   * meanwhile relabelled itself `SUBMIT AS GUEST`: the label promised
   * something the press then refused to do. Saying so while it is being typed
   * is both earlier and honest.
   */
  const draftUnusable = draftName.trim() !== "" && !checked.ok;
  const liveNameError =
    nameError ??
    (!checked.ok && draftName.trim() !== ""
      ? describeNicknameRejection(checked.reason)
      : null);

  const confirmSubmit = useCallback(
    async (withName: boolean) => {
      if (run === null) return;
      if (withName) {
        const validated = checkNickname(draftName);
        if (!validated.ok) {
          setNameError(describeNicknameRejection(validated.reason));
          return;
        }
        storeNickname(validated.name);
      }

      setNameError(null);
      setPhase({ kind: "SUBMITTING" });
      // Consent and the anonymous id are both created here — at the press that
      // publishes — and never while merely playing.
      storeConsent();
      const anonId = getOrCreateAnonId();

      const outcome = await submitRun({
        run,
        anonId,
        ...(withName ? { displayName: draftName } : {}),
      });

      if (!outcome.ok) {
        setPhase({ kind: "FAILED", message: describeBoardError(outcome.error) });
        return;
      }
      rememberSubmitted(run.runId);
      setPhase({ kind: "DONE", result: outcome.value });
      setBoard((current) =>
        current === null ? current : { ...current, entries: outcome.value.entries },
      );
    },
    [draftName, run],
  );

  return (
    <div className="sg-board">
      <div className="sg-board__head">
        <p className="sg-board__title">GOLF · PUBLIC BOARD</p>
        <p className="sg-board__scope">
          {board === null
            ? "ONE HOLE · BEST PER PLAYER"
            : `HOLE 1 · ${board.holeM} M · PAR ${board.par} · BEST PER PLAYER`}
        </p>
      </div>

      {/* Said plainly and always: the server checks a run is possible, it
          cannot recompute one, so no score here is verified. */}
      <p className="sg-board__honesty">
        CASUAL · CLIENT-REPORTED SCORES
        {board?.mode === "LOCAL_ONLY" ? " · LOCAL-ONLY, THIS SERVER PROCESS" : ""}
      </p>

      {loading ? (
        <p className="sg-board__state" role="status">
          LOADING THE BOARD…
        </p>
      ) : boardError !== null ? (
        <div className="sg-board__state sg-board__state--error" role="alert">
          <p>{boardError}</p>
          <button className="loc-button" onClick={retry} type="button">
            TRY AGAIN
          </button>
        </div>
      ) : board !== null && board.entries.length === 0 ? (
        <p className="sg-board__state">NO ONE HAS HOLED OUT YET.</p>
      ) : board !== null ? (
        <ol className="sg-board__table">
          {board.entries.map((entry) => (
            <li
              className="sg-board__row"
              data-you={entry.isYou || undefined}
              key={entry.runId}
            >
              <span className="sg-board__rank">{entry.rank}</span>
              {/* A React text node. The name is never markup. */}
              <span className="sg-board__name">{entry.displayName}</span>
              <span className="sg-board__strokes">
                {entry.totalStrokes}
                <small> TOTAL STROKES</small>
              </span>
              <span className="sg-board__aside">
                {entry.penaltyStrokes > 0 ? `+${entry.penaltyStrokes} PEN · ` : ""}
                {Math.round(entry.longestDriveM)} M LONGEST
              </span>
            </li>
          ))}
        </ol>
      ) : null}

      {run !== null ? (
        <div className="sg-board__yours">
          <p className="sg-board__attempt">
            ATTEMPT {attempts}
            <span>
              {run.status === "completed"
                ? `TOTAL STROKES ${run.totalStrokes}`
                : "RUN ABANDONED · NOT RANKED"}
            </span>
          </p>

          {phase.kind === "DONE" ? (
            <p className="sg-board__state sg-board__state--ok" role="status">
              {phase.result.outcome === "RECORDED"
                ? `ON THE BOARD AS ${phase.result.displayName} · RANK ${phase.result.rank}`
                : phase.result.outcome === "DUPLICATE"
                  ? "THIS RUN IS ALREADY ON THE BOARD."
                  : "SUBMITTED. YOUR EARLIER RUN IS STILL YOUR BEST."}
            </p>
          ) : phase.kind === "FAILED" ? (
            <div className="sg-board__state sg-board__state--error" role="alert">
              <p>{phase.message}</p>
              <button
                className="loc-button"
                onClick={() => setPhase({ kind: "NAMING" })}
                type="button"
              >
                TRY AGAIN
              </button>
            </div>
          ) : phase.kind === "SUBMITTING" ? (
            <p className="sg-board__state" role="status">
              SUBMITTING…
            </p>
          ) : publishable ? (
            <button
              className="loc-button loc-button--primary"
              onClick={() => {
                // Read when the box opens rather than on mount: one less
                // effect, and it picks up a name saved since this rendered.
                setDraftName(getStoredNickname() ?? "");
                setPhase({ kind: "NAMING" });
              }}
              ref={submitButtonRef}
              type="button"
            >
              SUBMIT TO THE PUBLIC BOARD
            </button>
          ) : run.status !== "completed" ? (
            <p className="sg-board__state">
              Only a hole you finish can go on the board.
            </p>
          ) : (
            <p className="sg-board__state">THIS RUN HAS ALREADY BEEN SUBMITTED.</p>
          )}
        </div>
      ) : null}

      {phase.kind === "NAMING" ? (
        <NicknameDialog
          error={liveNameError}
          nameToPublish={nameToPublish}
          nameUnusable={draftUnusable}
          onCancel={() => {
            setNameError(null);
            setPhase({ kind: "IDLE" });
          }}
          onChange={(value) => {
            setDraftName(value);
            setNameError(null);
          }}
          onSubmitAsGuest={() => void confirmSubmit(false)}
          onSubmitWithName={() => void confirmSubmit(true)}
          returnFocusRef={submitButtonRef}
          value={draftName}
        />
      ) : null}
    </div>
  );
}

interface NicknameDialogProps {
  value: string;
  nameToPublish: string;
  /** Something is typed in the box that cannot be published. */
  nameUnusable: boolean;
  error: string | null;
  onChange: (value: string) => void;
  onCancel: () => void;
  onSubmitWithName: () => void;
  onSubmitAsGuest: () => void;
  returnFocusRef: React.RefObject<HTMLButtonElement | null>;
}

/**
 * The consent step. Nothing has left the device when this opens.
 *
 * It shows the exact string that will appear and who will see it, because
 * "publish" is not a thing to infer from a button label. It reuses the world's
 * dialog focus lifecycle, so Escape closes, Tab is trapped, and focus returns
 * to the button that opened it.
 */
function NicknameDialog({
  value,
  nameToPublish,
  nameUnusable,
  error,
  onChange,
  onCancel,
  onSubmitWithName,
  onSubmitAsGuest,
  returnFocusRef,
}: NicknameDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useDialogFocus({
    containerRef: dialogRef,
    initialFocusRef: inputRef,
    onClose: onCancel,
    returnFocusRef,
  });

  return (
    <div className="overlay-backdrop" role="presentation">
      <div
        aria-labelledby="sg-name-title"
        aria-modal="true"
        className="dialog sg-name"
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="dialog__header">
          <h2 id="sg-name-title">Put this run on the public board?</h2>
        </div>

        <label className="sg-name__label" htmlFor="sg-name-input">
          A NAME TO BE SHOWN BY (OPTIONAL)
        </label>
        <input
          autoComplete="off"
          className="sg-name__input"
          id="sg-name-input"
          // A generous cap: the real limit counts characters, not UTF-16
          // units, and is enforced identically here and on the server.
          maxLength={NICKNAME_MAX_CODE_POINTS * 4}
          onChange={(event) => onChange(event.target.value)}
          placeholder={GUEST_NAME}
          ref={inputRef}
          spellCheck={false}
          type="text"
          value={value}
        />

        <p className="sg-name__preview">
          WILL APPEAR PUBLICLY AS <strong>{nameToPublish}</strong>
        </p>
        <p className="sg-name__scope">
          Your score and that name become visible to everyone who opens this
          board. No real name, email or account is asked for or stored. Scores
          are reported by the browser that played them, so treat the board as
          casual.
        </p>

        {error !== null ? (
          <p className="sg-name__error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="sg-name__actions">
          <button
            className="loc-button loc-button--primary"
            disabled={nameUnusable}
            onClick={onSubmitWithName}
            type="button"
          >
            SUBMIT AS {nameToPublish}
          </button>
          {/* Only worth offering separately once something is typed. With an
              empty box the button above already reads SUBMIT AS GUEST, and two
              identical buttons side by side are a puzzle. With an unusable
              name it is the way out, so it stays. */}
          {value.trim() === "" ? null : (
            <button className="loc-button" onClick={onSubmitAsGuest} type="button">
              SUBMIT AS {GUEST_NAME}
            </button>
          )}
          <button className="loc-button" onClick={onCancel} type="button">
            NOT NOW
          </button>
        </div>
      </div>
    </div>
  );
}
