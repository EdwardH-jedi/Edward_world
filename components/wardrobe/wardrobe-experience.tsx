"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { ProjectSummary } from "@/components/locations/project-summary";
import { PixelCanvas } from "@/components/world/pixel-canvas";
import { garments, getGarment } from "@/data/wardrobe";
import {
  archiveReducer,
  canAdvance,
  canSaveLook,
  countWorn,
  createArchiveState,
  isArchived,
  MINIMUM_LOOK_SLOTS,
} from "@/lib/game/wardrobe-archive";
import { PIXEL_UNIT } from "@/lib/game/terrain";
import { animateElement, motionPresets } from "@/lib/motion/animate-element";
import { edwardRoutines, PLAYER_ART_SIZE } from "@/lib/pixel/sportsgang";
import { clearSavedLook, writeSavedLook } from "@/lib/storage/saved-look";
import { useSavedLook } from "@/lib/storage/use-saved-look";
import { OUTFIT_SLOTS, type WardrobeStep } from "@/types/wardrobe";

interface WardrobeExperienceProps {
  onExit: () => void;
}

/** The product's own loop. Scene copy, not project data. */
const PRODUCT_FLOW = ["CAPTURE", "ARCHIVE", "ORGANISE", "COMPOSE", "SAVE LOOK"] as const;

const STEP_COPY: Readonly<Record<WardrobeStep, { title: string; body: string }>> = {
  CAPTURE: {
    title: "CAPTURE",
    body: "Photograph what you own. Pick garments off the rail to bring them into the archive.",
  },
  ARCHIVE: {
    title: "ARCHIVE",
    body: "Each garment is stored with what you can read off it — no guessing, no scoring.",
  },
  ORGANISE: {
    title: "ORGANISE",
    body: "The archive sorts itself by what a garment is, so composing an outfit is a choice between real things.",
  },
  COMPOSE: {
    title: "COMPOSE",
    body: "Dress the mannequin. One garment per layer, taken from what you have actually archived.",
  },
  SAVE: {
    title: "SAVE LOOK",
    body: "Keep the look. It is written to this browser and stays on this device.",
  },
  COMPLETE: { title: "SAVED", body: "" },
};

const STEP_ANNOUNCEMENTS: Readonly<Record<WardrobeStep, string>> = {
  CAPTURE: "Capture garments into the archive",
  ARCHIVE: "Archived garment details",
  ORGANISE: "The archive, sorted by layer",
  COMPOSE: "Compose an outfit on the mannequin",
  SAVE: "Save the look to this browser",
  COMPLETE: "Wardrobe project summary",
};

export function WardrobeExperience({ onExit }: WardrobeExperienceProps) {
  const [state, dispatch] = useReducer(archiveReducer, null, () =>
    createArchiveState(),
  );
  const [storageWorked, setStorageWorked] = useState(true);
  // Read from storage rather than mirrored into state, so forgetting a look
  // updates the room immediately and no effect has to write state on mount.
  const previousLook = useSavedLook();

  const rootRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const continueRef = useRef<HTMLButtonElement>(null);
  const summaryRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    rootRef.current?.focus();
    return () => previousFocus?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onExit();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onExit]);

  useEffect(() => {
    if (state.step === "COMPLETE") summaryRef.current?.focus();
    else continueRef.current?.focus();
  }, [state.step]);

  useEffect(() => {
    if (panelRef.current) {
      animateElement(panelRef.current, motionPresets.screenSwap, { duration: 260 });
    }
  }, [state.step]);

  const inspected = state.inspecting ? getGarment(state.inspecting) : undefined;
  const worn = countWorn(state.outfit);

  const saveLook = useCallback(() => {
    if (!canSaveLook(state)) return;
    setStorageWorked(writeSavedLook(state.outfit));
    dispatch({ type: "SAVE" });
  }, [state]);

  const restart = useCallback(() => {
    dispatch({ type: "RESET", savedOutfit: null });
  }, []);

  const forgetLook = useCallback(() => {
    clearSavedLook();
    dispatch({ type: "CLEAR_SAVED" });
  }, []);

  const bySlot = useMemo(
    () =>
      OUTFIT_SLOTS.map((slot) => ({
        slot,
        items: state.archived
          .map((id) => getGarment(id))
          .filter((garment) => garment?.slot === slot),
      })),
    [state.archived],
  );

  const showRail = state.step === "CAPTURE";
  const showArchive = ["ARCHIVE", "ORGANISE", "COMPOSE", "SAVE"].includes(state.step);
  const showMannequin = ["COMPOSE", "SAVE", "COMPLETE"].includes(state.step);
  const copy = STEP_COPY[state.step];

  return (
    <section
      aria-label="Wardrobe"
      className="loc-experience wd-room"
      data-step={state.step}
      ref={rootRef}
      tabIndex={-1}
    >
      <div className="wd-interior" aria-hidden="true">
        <div className="wd-wall">
          <div className="wd-window" />
          <div className="wd-mirror" />
          <div className="wd-boxes">
            <span />
            <span />
            <span />
          </div>
        </div>
        <div className="wd-floor" />
        <div className="wd-edward">
          <PixelCanvas
            artHeight={PLAYER_ART_SIZE.height}
            artWidth={PLAYER_ART_SIZE.width}
            draw={edwardRoutines.idle}
            frame={0}
            unit={PIXEL_UNIT}
          />
        </div>
      </div>

      <button className="loc-exit" onClick={onExit} type="button">
        ESC · BACK TO WORLD
      </button>

      <p aria-live="polite" className="loc-announcer">
        {STEP_ANNOUNCEMENTS[state.step]}
      </p>

      <div className="wd-stage">
        {showRail ? (
          <div className="wd-rail">
            <div className="wd-rail__bar" />
            <ul className="wd-rail__items">
              {garments.map((garment) => (
                <li key={garment.id}>
                  <button
                    className="wd-garment"
                    data-archived={isArchived(state, garment.id) || undefined}
                    onClick={() =>
                      dispatch({ type: "CAPTURE", garmentId: garment.id })
                    }
                    type="button"
                  >
                    <span
                      className="wd-garment__swatch"
                      data-slot={garment.slot}
                      style={{ background: garment.colour }}
                    />
                    <span className="wd-garment__name">{garment.name}</span>
                    <span className="wd-garment__state">
                      {isArchived(state, garment.id) ? "ARCHIVED" : "CAPTURE"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {showArchive ? (
          <div className="wd-archive">
            {bySlot.map(({ slot, items }) => (
              <div className="wd-archive__group" key={slot}>
                <p className="wd-archive__slot">{slot}</p>
                {items.length === 0 ? (
                  <p className="wd-archive__empty">NOTHING ARCHIVED</p>
                ) : (
                  <ul>
                    {items.map((garment) =>
                      garment ? (
                        <li key={garment.id}>
                          <button
                            className="wd-garment wd-garment--compact"
                            data-worn={
                              state.outfit[garment.slot] === garment.id || undefined
                            }
                            onClick={() =>
                              dispatch(
                                state.step === "COMPOSE" || state.step === "SAVE"
                                  ? { type: "WEAR", garmentId: garment.id }
                                  : { type: "INSPECT", garmentId: garment.id },
                              )
                            }
                            type="button"
                          >
                            <span
                              className="wd-garment__swatch"
                              style={{ background: garment.colour }}
                            />
                            <span className="wd-garment__name">{garment.name}</span>
                          </button>
                        </li>
                      ) : null,
                    )}
                  </ul>
                )}
              </div>
            ))}
          </div>
        ) : null}

        {showMannequin ? (
          <div className="wd-mannequin">
            <p className="wd-mannequin__title">THE LOOK</p>
            <div className="wd-mannequin__figure">
              {OUTFIT_SLOTS.map((slot) => {
                const garment = state.outfit[slot]
                  ? getGarment(state.outfit[slot] as string)
                  : undefined;
                return (
                  <div className="wd-slot" data-slot={slot} key={slot}>
                    <span
                      className="wd-slot__fill"
                      style={garment ? { background: garment.colour } : undefined}
                    />
                    <span className="wd-slot__label">
                      {garment ? garment.name : slot}
                    </span>
                    {garment && state.step !== "COMPLETE" ? (
                      <button
                        className="wd-slot__remove"
                        onClick={() => dispatch({ type: "REMOVE", slot })}
                        type="button"
                      >
                        <span aria-hidden="true">×</span>
                        <span className="wd-visually-hidden">
                          Remove {garment.name}
                        </span>
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      {state.step !== "COMPLETE" ? (
        <div className="wd-panel" ref={panelRef}>
          <div className="wd-panel__head">
            <p className="wd-panel__step">{copy.title}</p>
            <ol className="wd-panel__flow">
              {PRODUCT_FLOW.map((step) => (
                <li data-done={PRODUCT_FLOW.indexOf(step) < currentIndex(state.step) || undefined} key={step}>
                  {step}
                </li>
              ))}
            </ol>
          </div>
          <p className="wd-panel__body">{copy.body}</p>

          {inspected && state.step !== "CAPTURE" ? (
            <dl className="wd-meta">
              <div><dt>TYPE</dt><dd>{inspected.slot}</dd></div>
              <div><dt>COLOUR</dt><dd>{inspected.colourName}</dd></div>
              <div><dt>FABRIC</dt><dd>{inspected.fabric}</dd></div>
              <div><dt>SEASON</dt><dd>{inspected.season}</dd></div>
            </dl>
          ) : null}

          {state.step === "CAPTURE" ? (
            <p className="wd-panel__count">
              {state.archived.length} ARCHIVED · {garments.length} ON THE RAIL
            </p>
          ) : null}

          {previousLook && state.step === "CAPTURE" ? (
            <div className="wd-recall">
              <p>
                YOUR SAVED LOOK IS STILL HERE · STORED IN THIS BROWSER · NOTHING
                LEFT THIS DEVICE
              </p>
              <button className="loc-button loc-button--quiet" onClick={forgetLook} type="button">
                FORGET IT
              </button>
            </div>
          ) : null}

          <div className="wd-panel__actions">
            {state.step === "SAVE" ? (
              <button
                className="loc-button loc-button--primary"
                disabled={!canSaveLook(state)}
                onClick={saveLook}
                ref={continueRef}
                type="button"
              >
                SAVE LOOK
              </button>
            ) : (
              <button
                className="loc-button loc-button--primary"
                disabled={!canAdvance(state)}
                onClick={() => dispatch({ type: "ADVANCE" })}
                ref={continueRef}
                type="button"
              >
                CONTINUE
              </button>
            )}
            <span className="wd-panel__hint">
              {state.step === "COMPOSE" || state.step === "SAVE"
                ? `${worn} OF ${OUTFIT_SLOTS.length} LAYERS · ${MINIMUM_LOOK_SLOTS} NEEDED`
                : "PICK A GARMENT TO CONTINUE"}
            </span>
          </div>
        </div>
      ) : null}

      {state.step === "COMPLETE" ? (
        <>
          <p className="loc-caption">
            {storageWorked
              ? "LOOK SAVED TO THIS BROWSER"
              : "STORAGE UNAVAILABLE — THE LOOK WAS NOT KEPT"}
          </p>
          <ProjectSummary
            firstActionRef={summaryRef}
            flow={PRODUCT_FLOW}
            onExit={onExit}
            onReplay={restart}
            projectId="wardrobe"
            role="LOCAL-FIRST ARCHIVE"
            replayLabel="START OVER"
            wordmark="WARDROBE"
          />
        </>
      ) : null}
    </section>
  );
}

function currentIndex(step: WardrobeStep) {
  const order: readonly WardrobeStep[] = [
    "CAPTURE",
    "ARCHIVE",
    "ORGANISE",
    "COMPOSE",
    "SAVE",
    "COMPLETE",
  ];
  return order.indexOf(step);
}
