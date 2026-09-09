"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { ProjectSummary } from "@/components/locations/project-summary";
import { PixelCanvas } from "@/components/world/pixel-canvas";
import { garments, getGarment } from "@/data/wardrobe";
import {
  archiveReducer,
  archivedInSlot,
  canSaveLook,
  completedStages,
  countWorn,
  createArchiveState,
  currentStage,
  isArchived,
  isComplete,
  isWorn,
  MINIMUM_LOOK_SLOTS,
} from "@/lib/game/wardrobe-archive";
import type { WardrobePersistenceOutcome } from "@/lib/game/wardrobe-persistence";
import {
  confirmSave,
  flyBetween,
  landIn,
  settleOutfit,
  type WardrobeFlight,
} from "@/lib/motion/wardrobe-choreography";
import {
  createGarmentRoutine,
  createHangingRoutine,
  createMannequinRoutine,
  GARMENT_ART_SIZE,
  HANGER_ART_SIZE,
  MANNEQUIN_ART_SIZE,
  outfitColours,
} from "@/lib/pixel/wardrobe";
import { clearSavedLook, writeSavedLook } from "@/lib/storage/saved-look";
import { useSavedLook } from "@/lib/storage/use-saved-look";
import {
  OUTFIT_SLOTS,
  SLOT_LABEL,
  STAGE_LABEL,
  WARDROBE_STAGES,
  type Garment,
  type Outfit,
  type OutfitSlot,
  type WardrobeStage,
} from "@/types/wardrobe";

interface WardrobeExperienceProps {
  onExit: () => void;
}

/** The product's own loop, spelled as the summary panel spells it. */
const PRODUCT_FLOW = WARDROBE_STAGES.map((stage) => STAGE_LABEL[stage]);

/**
 * One short line per stage: what to do next, never what the product is.
 *
 * The room is meant to be legible without them — every bay is labelled and
 * every control says what it does — so these stay imperative and stay one
 * line, and none of them explains an idea the visitor could not just do.
 */
const STAGE_PROMPT: Readonly<Record<WardrobeStage, string>> = {
  CAPTURE: "Take a garment off the rail.",
  ARCHIVE: "Add it to the archive.",
  ORGANISE: "Archive another kind of garment.",
  COMPOSE: "Pick from the shelves to dress the mannequin.",
  SAVE: "Two layers make a look. Save it.",
};

const ART_UNIT = { hanging: 3, table: 6, shelf: 3, mannequin: 7, frame: 4 } as const;

export function WardrobeExperience({ onExit }: WardrobeExperienceProps) {
  const [state, dispatch] = useReducer(archiveReducer, undefined, createArchiveState);
  const [persistenceOutcome, setPersistenceOutcome] = useState<WardrobePersistenceOutcome>("idle");
  const [message, setMessage] = useState<string | null>("Wardrobe. Take a garment off the rail.");

  // Read from storage rather than mirrored into state, so a look kept on an
  // earlier visit hangs in the frame without counting as progress through the
  // loop — and forgetting it updates the room immediately.
  const persistence = useSavedLook(persistenceOutcome);
  const savedLook = persistence.look;

  const rootRef = useRef<HTMLElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const figureRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLAnchorElement>(null);
  const railRefs = useRef(new Map<string, HTMLElement>());
  const shelfRefs = useRef(new Map<OutfitSlot, HTMLElement>());
  const tileRefs = useRef(new Map<string, HTMLElement>());
  const activeFlightsRef = useRef(new Set<WardrobeFlight>());

  const complete = isComplete(state);
  const stage = currentStage(state);
  const done = completedStages(state);
  const selected = state.selected ? getGarment(state.selected) : undefined;
  const worn = countWorn(state.outfit);

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
    if (complete) summaryRef.current?.focus();
  }, [complete]);

  const startFlight = useCallback(
    (
      source: HTMLElement | null,
      target: HTMLElement | null,
      onSettled?: () => void,
    ) => {
      let flight: WardrobeFlight | null = null;
      flight = flyBetween(source, target, {
        onSettled: () => {
          if (flight) activeFlightsRef.current.delete(flight);
          onSettled?.();
        },
      });
      if (flight) activeFlightsRef.current.add(flight);
    },
    [],
  );

  useEffect(
    () => () => {
      for (const flight of activeFlightsRef.current) flight.cancel();
      activeFlightsRef.current.clear();
    },
    [],
  );

  const selectGarment = useCallback((garment: Garment) => {
    dispatch({ type: "SELECT", garmentId: garment.id });
    setMessage(`${garment.name} is on the work table.`);
    startFlight(railRefs.current.get(garment.id) ?? null, tableRef.current);
    landIn(tableRef.current);
  }, [startFlight]);

  const archiveGarment = useCallback((garment: Garment) => {
    dispatch({ type: "ARCHIVE", garmentId: garment.id });
    setMessage(`${garment.name} archived under ${SLOT_LABEL[garment.slot]}.`);
    startFlight(
      tableRef.current,
      shelfRefs.current.get(garment.slot) ?? null,
      () => landIn(tileRefs.current.get(garment.id) ?? null),
    );
  }, [startFlight]);

  const wearGarment = useCallback((garment: Garment) => {
    dispatch({ type: "WEAR", garmentId: garment.id });
    setMessage(`${garment.name} is on the mannequin.`);
    startFlight(
      tileRefs.current.get(garment.id) ?? null,
      figureRef.current,
      () => settleOutfit(figureRef.current),
    );
  }, [startFlight]);

  const removeLayer = useCallback((slot: OutfitSlot) => {
    dispatch({ type: "REMOVE", slot });
    setMessage(`${SLOT_LABEL[slot]} taken off the mannequin.`);
    settleOutfit(figureRef.current);
  }, []);

  const saveLook = useCallback(() => {
    if (!canSaveLook(state)) return;
    // Storage and state move first; the flight is only how it is shown.
    const kept = writeSavedLook(state.outfit);
    setPersistenceOutcome(kept ? "saved" : "save-error");
    dispatch({ type: "SAVE" });
    setMessage(null);
    if (kept) {
      startFlight(figureRef.current, frameRef.current, () =>
        confirmSave(frameRef.current),
      );
    }
  }, [startFlight, state]);

  const startOver = useCallback(() => {
    dispatch({ type: "RESET" });
    setPersistenceOutcome("idle");
    setMessage("Wardrobe. Take a garment off the rail.");
  }, []);

  const forgetLook = useCallback(() => {
    setPersistenceOutcome(clearSavedLook() ? "forgotten" : "forget-error");
    setMessage(null);
  }, []);

  const mannequin = useMemo(
    () => createMannequinRoutine(outfitColours(state.outfit, getGarment)),
    [state.outfit],
  );

  const framedLook = useMemo(
    () => createMannequinRoutine(outfitColours(savedLook ?? {}, getGarment)),
    [savedLook],
  );

  return (
    <section
      aria-label="Wardrobe"
      className="loc-experience wd-room"
      data-complete={complete || undefined}
      data-stage={stage}
      ref={rootRef}
      tabIndex={-1}
    >
      <div className="wd-interior" aria-hidden="true">
        <div className="wd-wall" />
        <div className="wd-skirting" />
        <div className="wd-floor" />
      </div>

      <button className="loc-exit" onClick={onExit} type="button">
        ESC · BACK TO WORLD
      </button>

      <p aria-live="polite" className="loc-announcer">
        {message ?? persistence.copy.announcement}
      </p>

      <div className="wd-content">
      <SavedLookFrame
        emptyLabel={persistence.copy.emptyFrame}
        forget={forgetLook}
        frameRef={frameRef}
        look={savedLook}
        note={persistence.copy.frameNote}
        routine={framedLook}
      />

      {complete ? null : (
        <div className="wd-studio">
          <ol className="wd-flow">
            {WARDROBE_STAGES.map((entry) => (
              <li
                data-done={done[entry] || undefined}
                data-now={entry === stage || undefined}
                key={entry}
              >
                {STAGE_LABEL[entry]}
              </li>
            ))}
          </ol>
          <p className="wd-prompt">{STAGE_PROMPT[stage]}</p>

          <div className="wd-bays">
            <section aria-label="Clothing rail" className="wd-bay wd-bay--rail">
              <p className="wd-bay__name">
                RAIL<span>{garments.length} GARMENTS</span>
              </p>
              <div className="wd-rail__bar" aria-hidden="true" />
              <ul className="wd-rail__items">
                {garments.map((garment) => (
                  <li key={garment.id}>
                    <button
                      className="wd-hanging"
                      data-archived={isArchived(state, garment.id) || undefined}
                      data-selected={state.selected === garment.id || undefined}
                      onClick={() => selectGarment(garment)}
                      ref={(node) => {
                        if (node) railRefs.current.set(garment.id, node);
                        else railRefs.current.delete(garment.id);
                      }}
                      type="button"
                    >
                      <HangingArt garment={garment} />
                      <span className="wd-hanging__name">{garment.name}</span>
                      {isArchived(state, garment.id) ? (
                        <span className="wd-hanging__tag">ARCHIVED</span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-label="Work table" className="wd-bay wd-bay--table">
              <p className="wd-bay__name">WORK TABLE</p>
              <div className="wd-table" ref={tableRef}>
                {selected ? (
                  <>
                    <div className="wd-table__art">
                      <GarmentArt garment={selected} unit={ART_UNIT.table} />
                    </div>
                    <div className="wd-table__read">
                      <p className="wd-table__name">{selected.name}</p>
                      <dl className="wd-meta">
                        <div>
                          <dt>LAYER</dt>
                          <dd>{SLOT_LABEL[selected.slot]}</dd>
                        </div>
                        <div>
                          <dt>COLOUR</dt>
                          <dd>{selected.colourName}</dd>
                        </div>
                        <div>
                          <dt>FABRIC</dt>
                          <dd>{selected.fabric}</dd>
                        </div>
                        <div>
                          <dt>SEASON</dt>
                          <dd>{selected.season}</dd>
                        </div>
                      </dl>
                      <p className="wd-table__note">
                        Read off the garment. Nothing guessed, nothing scored.
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="wd-empty">
                    Empty. Pick something off the rail to look at it.
                  </p>
                )}
              </div>
              {selected ? (
                <TableAction
                  archived={isArchived(state, selected.id)}
                  garment={selected}
                  onArchive={archiveGarment}
                  onWear={wearGarment}
                  worn={isWorn(state, selected.id)}
                />
              ) : null}
            </section>

            <section aria-label="Archive" className="wd-bay wd-bay--archive">
              <p className="wd-bay__name">
                ARCHIVE<span>{state.archived.length} KEPT</span>
              </p>
              <div className="wd-shelves">
                {OUTFIT_SLOTS.map((slot) => {
                  const held = archivedInSlot(state, slot);
                  return (
                    <div
                      className="wd-shelf"
                      key={slot}
                      ref={(node) => {
                        if (node) shelfRefs.current.set(slot, node);
                        else shelfRefs.current.delete(slot);
                      }}
                    >
                      <p className="wd-shelf__label">{SLOT_LABEL[slot]}</p>
                      {held.length === 0 ? (
                        <p className="wd-shelf__empty">EMPTY</p>
                      ) : (
                        <ul>
                          {held.map((garment) => (
                            <li key={garment.id}>
                              <button
                                className="wd-tile"
                                data-worn={isWorn(state, garment.id) || undefined}
                                onClick={() => wearGarment(garment)}
                                ref={(node) => {
                                  if (node) tileRefs.current.set(garment.id, node);
                                  else tileRefs.current.delete(garment.id);
                                }}
                                type="button"
                              >
                                <GarmentArt garment={garment} unit={ART_UNIT.shelf} />
                                <span>{garment.name}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            <section aria-label="Mannequin" className="wd-bay wd-bay--studio">
              <p className="wd-bay__name">
                MANNEQUIN<span>
                  {worn} / {OUTFIT_SLOTS.length} LAYERS
                </span>
              </p>
              <div className="wd-stand">
                <div className="wd-mirror" aria-hidden="true" />
                <div className="wd-figure" ref={figureRef}>
                  <PixelCanvas
                    artHeight={MANNEQUIN_ART_SIZE.height}
                    artWidth={MANNEQUIN_ART_SIZE.width}
                    draw={mannequin}
                    frame={0}
                    unit={ART_UNIT.mannequin}
                  />
                </div>
              </div>
              <ul className="wd-worn">
                {OUTFIT_SLOTS.map((slot) => {
                  const garment = state.outfit[slot]
                    ? getGarment(state.outfit[slot] as string)
                    : undefined;
                  return (
                    <li data-filled={garment ? true : undefined} key={slot}>
                      <span className="wd-worn__slot">{SLOT_LABEL[slot]}</span>
                      <span className="wd-worn__name">
                        {garment ? garment.name : "—"}
                      </span>
                      {garment ? (
                        <button
                          className="wd-worn__off"
                          onClick={() => removeLayer(slot)}
                          type="button"
                        >
                          <span aria-hidden="true">×</span>
                          <span className="wd-visually-hidden">
                            Take off {garment.name}
                          </span>
                        </button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
              <button
                className="loc-button loc-button--primary wd-save"
                disabled={!canSaveLook(state)}
                onClick={saveLook}
                type="button"
              >
                SAVE LOOK
              </button>
              <p className="wd-save__hint">
                {persistence.status === "unavailable"
                  ? "Browser storage is unavailable."
                  : canSaveLook(state)
                    ? "Save in this browser only."
                    : `${MINIMUM_LOOK_SLOTS} layers minimum.`}
              </p>
            </section>
          </div>
        </div>
      )}

      {complete ? (
        <>
          {/* The look stays standing in the room it was made in. */}
          <div className="wd-final" aria-hidden="true">
            <div className="wd-mirror" />
            <div className="wd-figure">
              <PixelCanvas
                artHeight={MANNEQUIN_ART_SIZE.height}
                artWidth={MANNEQUIN_ART_SIZE.width}
                draw={mannequin}
                frame={0}
                unit={ART_UNIT.mannequin}
              />
            </div>
          </div>
          <p className="loc-caption">
            {persistence.copy.caption}
          </p>
          <ProjectSummary
            firstActionRef={summaryRef}
            flow={PRODUCT_FLOW}
            onExit={onExit}
            onReplay={startOver}
            projectId="wardrobe"
            replayLabel="START OVER"
            role="LOCAL-FIRST ARCHIVE"
            wordmark="WARDROBE"
          >
            <p className="wd-summary__line">
              Captured {state.archived.length} garments, composed {worn} layers.
              {" "}{persistence.copy.summary}
            </p>
          </ProjectSummary>
        </>
      ) : null}
      </div>
    </section>
  );
}

/** The rail shows a garment the way a rail does: on a hanger. */
function HangingArt({ garment }: { garment: Garment }) {
  const routine = useMemo(
    () => createHangingRoutine(garment.slot, garment.colour),
    [garment.colour, garment.slot],
  );
  return (
    <PixelCanvas
      artHeight={HANGER_ART_SIZE.height}
      artWidth={HANGER_ART_SIZE.width}
      draw={routine}
      frame={0}
      unit={ART_UNIT.hanging}
    />
  );
}

function GarmentArt({ garment, unit }: { garment: Garment; unit: number }) {
  const routine = useMemo(
    () => createGarmentRoutine(garment.slot, garment.colour),
    [garment.colour, garment.slot],
  );
  return (
    <PixelCanvas
      artHeight={GARMENT_ART_SIZE.height}
      artWidth={GARMENT_ART_SIZE.width}
      draw={routine}
      frame={0}
      unit={unit}
    />
  );
}

interface TableActionProps {
  garment: Garment;
  archived: boolean;
  worn: boolean;
  onArchive: (garment: Garment) => void;
  onWear: (garment: Garment) => void;
}

/**
 * The table's single control.
 *
 * A garment that is not in the archive can only be archived, which is the one
 * rule of the product this room most needs to make felt.
 */
function TableAction({
  garment,
  archived,
  worn,
  onArchive,
  onWear,
}: TableActionProps) {
  if (!archived) {
    return (
      <button
        className="loc-button loc-button--primary wd-table__action"
        onClick={() => onArchive(garment)}
        type="button"
      >
        ADD TO ARCHIVE
      </button>
    );
  }
  if (worn) {
    return <p className="wd-table__state">ON THE MANNEQUIN</p>;
  }
  return (
    <button
      className="loc-button wd-table__action"
      onClick={() => onWear(garment)}
      type="button"
    >
      PUT ON MANNEQUIN
    </button>
  );
}

interface SavedLookFrameProps {
  emptyLabel: string;
  look: Outfit | null;
  note: string;
  routine: ReturnType<typeof createMannequinRoutine>;
  frameRef: React.RefObject<HTMLDivElement | null>;
  forget: () => void;
}

/**
 * The frame on the wall: where a saved look lives between visits.
 *
 * It is drawn empty before anything is saved on purpose — the destination has
 * to exist before the visitor saves, or saving has nowhere to mean anything.
 */
function SavedLookFrame({ emptyLabel, look, note, routine, frameRef, forget }: SavedLookFrameProps) {
  return (
    <div className="wd-saved">
      <p className="wd-saved__name">SAVED LOOK</p>
      <div className="wd-saved__frame" data-filled={look ? true : undefined} ref={frameRef}>
        {look ? (
          <PixelCanvas
            artHeight={MANNEQUIN_ART_SIZE.height}
            artWidth={MANNEQUIN_ART_SIZE.width}
            draw={routine}
            frame={0}
            unit={ART_UNIT.frame}
          />
        ) : (
          <p className="wd-saved__empty">{emptyLabel}</p>
        )}
      </div>
      <p className="wd-saved__note">
        {note}
      </p>
      {look ? (
        <button className="loc-button loc-button--quiet wd-saved__forget" onClick={forget} type="button">
          FORGET IT
        </button>
      ) : null}
    </div>
  );
}
