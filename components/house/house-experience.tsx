"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMinigameInput } from "@/components/sportsgang/minigames/use-minigame-input";
import { useDialogFocus } from "@/components/ui/accessible-dialog";
import { PixelCanvas } from "@/components/world/pixel-canvas";
import { getProjectById } from "@/data/projects";
import { movePlayerX } from "@/lib/game/movement";
import { animateElement, motionPresets } from "@/lib/motion/animate-element";
import { useAmbientFrame } from "@/lib/motion/use-ambient-frame";
import { useGameLoop } from "@/lib/motion/use-game-loop";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";
import { drawEdward, EDWARD_ART_SIZE, getWalkFrame } from "@/lib/pixel/characters";
import {
  drawHouseRoom,
  HOUSE_ART_SIZE,
  HOUSE_STAND_Y,
  HOUSE_THING_BOUNDS,
  type HouseReveal,
  type HouseThingId,
  houseThingDistance,
} from "@/lib/pixel/house";

interface HouseExperienceProps {
  onExit: () => void;
}

/** Art pixels of walking per second. Slow enough to notice the room. */
const WALK_SPEED = 56;
/** How close Edward has to stand to the *edge* of a thing to be in reach. */
const REACH = 14;
/** The unfold, the power-on and the drawer all move in four chunky steps. */
const REVEAL_STEP = 0.25;
const REVEAL_MS = 70;

interface Thing {
  readonly id: HouseThingId;
  readonly label: string;
  readonly heading: string;
  /** How the card offers to leave the object as it found it. */
  readonly closeLabel: string;
  /** Paper things get a paper card; screens get a screen. */
  readonly surface: "paper" | "screen";
  /** What the object says. One or two lines — this is a room, not an About page. */
  readonly lines: readonly string[];
}

/**
 * Seven things in a bedroom.
 *
 * Nothing here is an About page. Every answer is attached to an object you walk
 * up to, and the objects are the ones that would be in the room anyway — the
 * shelf of collected things, the instrument on its stand, the shirt on the
 * wall, the gear in the corner, the machine, the rail, the window.
 */
const THINGS: readonly Thing[] = [
  {
    id: "collection",
    label: "COLLECTION",
    heading: "THINGS I KEEP",
    closeLabel: "PUT IT BACK",
    surface: "paper",
    lines: [
      "I\u2019ve always liked collecting things \u2014 LEGO, figures, random souvenirs, anything with a story.",
    ],
  },
  {
    id: "clarinet",
    label: "CLARINET",
    heading: "EIGHT YEARS",
    closeLabel: "SET IT DOWN",
    surface: "paper",
    lines: [
      "I played clarinet for eight years.",
      "That probably explains why I keep putting clarinet into the music I like.",
    ],
  },
  {
    id: "jersey",
    label: "JERSEY",
    heading: "THE SHIRT",
    closeLabel: "LEAVE IT UP",
    surface: "paper",
    lines: [
      "#67 \u2014 Sydney University Korean Football Team.",
      "Football is one of the things that keeps me away from the desk.",
    ],
  },
  {
    id: "sports",
    label: "SPORTS",
    heading: "FOUR SPORTS",
    closeLabel: "LEAN IT BACK",
    surface: "paper",
    lines: [
      "Since moving to Australia I\u2019ve been playing golf, tennis, badminton and football.",
      "I\u2019m much better at starting hobbies than staying still.",
    ],
  },
  {
    id: "pc",
    label: "PC",
    heading: "OFF THE CLOCK",
    closeLabel: "STEP AWAY",
    surface: "screen",
    lines: ["Mostly coding.", "Sometimes queueing mid on OCE."],
  },
  {
    id: "closet",
    label: "CLOSET",
    heading: "CLOTHES",
    closeLabel: "SLIDE IT BACK",
    surface: "paper",
    lines: ["I probably spend more money on clothes than I should."],
  },
  {
    id: "window",
    label: "WINDOW",
    heading: "LATE",
    closeLabel: "LOOK AWAY",
    surface: "paper",
    lines: ["A lot of ideas started late at night with this view."],
  },
];

/** What the summoner card on the PC screen says. Static, and staying static. */
const CLIENT_FIELDS: readonly (readonly [string, string])[] = [
  ["GAME", "LEAGUE"],
  ["ROLE", "MID"],
  ["NAME", "GPT#G041"],
  ["REGION", "OCE"],
];

/**
 * The screen stays on once it has been woken, and the cabinet lights stay on
 * once they have been found. Everything else goes back the way it was — which
 * is the difference between a room someone has walked through and a room where
 * every drawer is hanging open.
 */
const LATCHING: ReadonlySet<HouseThingId> = new Set<HouseThingId>([
  "pc",
  "collection",
]);

/** A percentage of the room strip, for placing DOM over the art. */
function across(value: number) {
  return `${(value / HOUSE_ART_SIZE.width) * 100}%`;
}

function down(value: number) {
  return `${(value / HOUSE_ART_SIZE.height) * 100}%`;
}

export function HouseExperience({ onExit }: HouseExperienceProps) {
  const [edwardX, setEdwardX] = useState(24);
  const [facing, setFacing] = useState<"left" | "right">("right");
  const [walking, setWalking] = useState(false);
  const [openId, setOpenId] = useState<HouseThingId | null>(null);
  const [seen, setSeen] = useState<readonly HouseThingId[]>([]);
  const [reveal, setReveal] = useState<HouseReveal>({});

  const rootRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const thingRefs = useRef(new Map<HouseThingId, HTMLButtonElement>());

  const { consume } = useMinigameInput(openId === null);
  const ambientFrame = useAmbientFrame(true);
  const reducedMotion = useReducedMotion();

  const nearest = useMemo(() => {
    const centre = edwardX + EDWARD_ART_SIZE.width / 2;
    const candidate = THINGS.map((thing) => ({
      thing,
      distance: houseThingDistance(thing.id, centre),
    }))
      .filter(({ distance }) => distance <= REACH)
      .sort((a, b) => a.distance - b.distance)[0];
    return candidate?.thing ?? null;
  }, [edwardX]);

  const open = openId
    ? THINGS.find((thing) => thing.id === openId) ?? null
    : null;

  const look = useCallback((id: HouseThingId) => {
    triggerRef.current = thingRefs.current.get(id) ?? null;
    setOpenId(id);
    setSeen((current) => (current.includes(id) ? current : [...current, id]));
  }, []);

  const close = useCallback(() => setOpenId(null), []);

  useDialogFocus({
    active: open !== null,
    containerRef: cardRef,
    initialFocusRef: closeRef,
    onClose: close,
    returnFocusRef: triggerRef,
  });

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    rootRef.current?.focus();
    return () => previousFocus?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!openId) onExit();
        return;
      }
      if (event.key.toLowerCase() === "e" && !openId && nearest) {
        event.preventDefault();
        look(nearest.id);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [look, nearest, onExit, openId]);

  useGameLoop(openId === null, (delta) => {
    const input = consume();
    const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    setWalking(direction !== 0);
    if (direction === 0) return;
    setFacing(direction > 0 ? "right" : "left");
    setEdwardX((current) =>
      movePlayerX({
        currentX: current,
        direction: direction as 1 | -1,
        deltaSeconds: delta,
        speed: WALK_SPEED,
        worldWidth: HOUSE_ART_SIZE.width,
        playerWidth: EDWARD_ART_SIZE.width,
      }),
    );
  });

  /** What each thing should settle at, given what is open and what was seen. */
  const targets = useMemo(() => {
    const next: Record<HouseThingId, number> = {} as Record<HouseThingId, number>;
    for (const thing of THINGS) {
      next[thing.id] =
        thing.id === openId || (LATCHING.has(thing.id) && seen.includes(thing.id))
          ? 1
          : 0;
    }
    return next;
  }, [openId, seen]);

  /**
   * What the room is actually showing. A visitor who has asked for reduced
   * motion is handed the settled state directly rather than being animated
   * towards it, so for them there is nothing left to step.
   */
  const shown = reducedMotion ? targets : reveal;
  const settled =
    reducedMotion ||
    THINGS.every((thing) => (reveal[thing.id] ?? 0) === targets[thing.id]);

  /**
   * Walks each thing towards its target a quarter at a time. Chunky on purpose
   * — the world's motion is a hand-authored loop, not an eased curve.
   */
  useEffect(() => {
    if (settled) return;
    const timer = window.setInterval(() => {
      setReveal((current) => {
        const next: Record<HouseThingId, number> = { ...current } as Record<
          HouseThingId,
          number
        >;
        let moved = false;
        for (const thing of THINGS) {
          const from = current[thing.id] ?? 0;
          const to = targets[thing.id];
          if (from === to) continue;
          next[thing.id] =
            from < to
              ? Math.min(to, from + REVEAL_STEP)
              : Math.max(to, from - REVEAL_STEP);
          moved = true;
        }
        return moved ? next : current;
      });
    }, REVEAL_MS);
    return () => window.clearInterval(timer);
  }, [settled, targets]);

  useEffect(() => {
    if (!open || !cardRef.current) return;

    const animation = animateElement(cardRef.current, motionPresets.screenSwap, {
      duration: 220,
    });
    return () => {
      animation.revert();
    };
  }, [open]);

  const wardrobe = getProjectById("wardrobe");
  const walkFrame = getWalkFrame(edwardX, 1, walking);
  const roomDraw = useMemo(
    () => (draw: Parameters<typeof drawHouseRoom>[0], frame: number) =>
      drawHouseRoom(draw, frame, shown),
    [shown],
  );

  return (
    <section
      aria-label="Edward's House"
      className="loc-experience hs-house"
      ref={rootRef}
      tabIndex={-1}
    >
      <button
        className="loc-exit"
        inert={open ? true : undefined}
        onClick={onExit}
        type="button"
      >
        ESC · BACK TO WORLD
      </button>

      <p aria-live="polite" className="loc-announcer">
        {open
          ? open.heading
          : nearest
            ? `${nearest.label}. Press E to look.`
            : "Walk around the room."}
      </p>

      {/* One strip of art holds the whole room. Every piece of DOM over it is
          placed from the same art coordinates the objects were drawn at, so a
          hotspot can never drift away from the thing it belongs to. */}
      <div
        className="hs-room"
        inert={open ? true : undefined}
        style={{
          aspectRatio: `${HOUSE_ART_SIZE.width} / ${HOUSE_ART_SIZE.height}`,
        }}
      >
        <PixelCanvas
          artHeight={HOUSE_ART_SIZE.height}
          artWidth={HOUSE_ART_SIZE.width}
          className="hs-room__art"
          draw={roomDraw}
          fill
          frame={ambientFrame}
          unit={4}
        />

        {THINGS.map((thing) => {
          const bounds = HOUSE_THING_BOUNDS[thing.id];
          return (
            <button
              className="hs-thing"
              data-near={nearest?.id === thing.id || undefined}
              data-seen={seen.includes(thing.id) || undefined}
              key={thing.id}
              onClick={() => look(thing.id)}
              ref={(node) => {
                if (node) thingRefs.current.set(thing.id, node);
                else thingRefs.current.delete(thing.id);
              }}
              style={{
                height: down(bounds.height),
                left: across(bounds.x),
                top: down(bounds.y),
                width: across(bounds.width),
              }}
              type="button"
            >
              <span className="hs-thing__label">{thing.label}</span>
              {nearest?.id === thing.id && !open ? (
                <span aria-hidden="true" className="hs-thing__key">
                  E
                </span>
              ) : null}
            </button>
          );
        })}

        <div
          aria-hidden="true"
          className="hs-edward"
          style={{
            bottom: down(HOUSE_ART_SIZE.height - HOUSE_STAND_Y),
            left: across(edwardX),
            width: across(EDWARD_ART_SIZE.width),
          }}
        >
          <PixelCanvas
            artHeight={EDWARD_ART_SIZE.height}
            artWidth={EDWARD_ART_SIZE.width}
            draw={drawEdward}
            fill
            flipX={facing === "left"}
            frame={walkFrame}
            unit={4}
          />
        </div>
      </div>

      {!open ? (
        <div className="hs-hint">
          <p>{nearest ? `${nearest.label} · E TO LOOK` : "A / D TO WALK · E TO LOOK"}</p>
          <p className="hs-hint__progress">
            {seen.length} OF {THINGS.length} LOOKED AT
          </p>
        </div>
      ) : null}

      {open ? (
        <div
          aria-labelledby="house-card-title"
          aria-modal="true"
          className="hs-card"
          data-surface={open.surface}
          ref={cardRef}
          role="dialog"
          tabIndex={-1}
        >
          <div className="hs-card__head">
            <p className="hs-card__eyebrow">{open.label}</p>
            <h2 className="hs-card__heading" id="house-card-title">
              {open.heading}
            </h2>
          </div>

          {open.id === "jersey" ? (
            <p className="hs-jersey">
              <span className="hs-jersey__number">67</span>
              <span className="hs-jersey__name">SOON HYUN HWANG</span>
            </p>
          ) : null}

          <div className="hs-body">
            {open.lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>

          {open.id === "pc" ? (
            <dl className="hs-client">
              {CLIENT_FIELDS.map(([field, value]) => (
                <div key={field}>
                  <dt>{field}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          {open.id === "closet" && wardrobe ? (
            <div className="hs-links">
              <Link className="loc-button" href={wardrobe.caseStudyUrl}>
                WARDROBE
              </Link>
            </div>
          ) : null}

          <div className="hs-card__actions">
            <button
              className="loc-button loc-button--primary"
              onClick={close}
              ref={closeRef}
              type="button"
            >
              {open.closeLabel}
            </button>
            <button
              className="loc-button loc-button--quiet"
              onClick={onExit}
              type="button"
            >
              BACK TO WORLD
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
