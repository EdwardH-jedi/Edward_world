"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMinigameInput } from "@/components/sportsgang/minigames/use-minigame-input";
import { PixelCanvas } from "@/components/world/pixel-canvas";
import { chapters, contact, leagueRank } from "@/data/personal";
import { getProjectById } from "@/data/projects";
import { movePlayerX } from "@/lib/game/movement";
import { PIXEL_UNIT } from "@/lib/game/terrain";
import { animateElement, motionPresets } from "@/lib/motion/animate-element";
import { useGameLoop } from "@/lib/motion/use-game-loop";
import { drawEdward, EDWARD_ART_SIZE, getWalkFrame } from "@/lib/pixel/characters";

interface HouseExperienceProps {
  onExit: () => void;
}

const ROOM_WIDTH = 1_240;
const REACH = 96;
const WALK_SPEED = 230;

interface Thing {
  readonly id: string;
  readonly x: number;
  readonly label: string;
  readonly heading: string;
  readonly kind: "map" | "desk" | "computer" | "papers" | "rail" | "rig";
}

/**
 * Six things in a room.
 *
 * The other buildings say what Edward builds. This one says who he is, and it
 * says it by being looked at rather than by being read: nothing here is an
 * About page, everything is an object you walk up to.
 */
const THINGS: readonly Thing[] = [
  { id: "map", x: 150, label: "MAP", heading: "KOREA → SYDNEY", kind: "map" },
  { id: "desk", x: 330, label: "DESK", heading: "STUDY", kind: "desk" },
  { id: "computer", x: 500, label: "COMPUTER", heading: "WHAT I BUILD", kind: "computer" },
  { id: "papers", x: 670, label: "PAPERS", heading: "RESUME", kind: "papers" },
  { id: "rail", x: 850, label: "RAIL", heading: "CLOTHES", kind: "rail" },
  { id: "rig", x: 1_040, label: "GAMING PC", heading: "OFF THE CLOCK", kind: "rig" },
];

export function HouseExperience({ onExit }: HouseExperienceProps) {
  const [edwardX, setEdwardX] = useState(60);
  const [facing, setFacing] = useState<"left" | "right">("right");
  const [walking, setWalking] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [seen, setSeen] = useState<readonly string[]>([]);

  const rootRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const openRef = useRef<HTMLButtonElement>(null);

  const { consume } = useMinigameInput(openId === null);

  const nearest = useMemo(() => {
    const centre = edwardX + 24;
    const candidate = THINGS.map((thing) => ({
      thing,
      distance: Math.abs(thing.x - centre),
    }))
      .filter(({ distance }) => distance <= REACH)
      .sort((a, b) => a.distance - b.distance)[0];
    return candidate?.thing ?? null;
  }, [edwardX]);

  const open = openId ? THINGS.find((thing) => thing.id === openId) ?? null : null;

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    rootRef.current?.focus();
    return () => previousFocus?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        if (openId) setOpenId(null);
        else onExit();
        return;
      }
      if (event.key.toLowerCase() === "e" && !openId && nearest) {
        event.preventDefault();
        setOpenId(nearest.id);
        setSeen((current) =>
          current.includes(nearest.id) ? current : [...current, nearest.id],
        );
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nearest, onExit, openId]);

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
        worldWidth: ROOM_WIDTH,
        playerWidth: 48,
      }),
    );
  });

  useEffect(() => {
    if (!open || !cardRef.current) return;

    const animation = animateElement(cardRef.current, motionPresets.screenSwap, {
      duration: 220,
    });
    openRef.current?.focus();
    return () => {
      animation.revert();
    };
  }, [open]);

  const close = useCallback(() => setOpenId(null), []);
  const wardrobe = getProjectById("wardrobe");
  const walkFrame = getWalkFrame(edwardX, PIXEL_UNIT, walking);

  return (
    <section
      aria-label="Edward's House"
      className="loc-experience hs-house"
      ref={rootRef}
      tabIndex={-1}
    >
      <div aria-hidden="true" className="hs-room">
        <div className="hs-wall" />
        <div className="hs-skirting" />
        <div className="hs-floor" />
        <div className="hs-window" />
        <div className="hs-lamp" />
      </div>

      <button className="loc-exit" onClick={onExit} type="button">
        ESC · BACK TO WORLD
      </button>

      <p aria-live="polite" className="loc-announcer">
        {open
          ? `${open.heading}`
          : nearest
            ? `${nearest.label}. Press E to look.`
            : "Walk around the room."}
      </p>

      {/* Everything the visitor walks among lives on one stage, positioned as
          a fraction of the room, so the layout holds at any width. */}
      <div className="hs-stage">
      {THINGS.map((thing) => (
        <button
          className="hs-thing"
          data-kind={thing.kind}
          data-near={nearest?.id === thing.id || undefined}
          data-seen={seen.includes(thing.id) || undefined}
          key={thing.id}
          onClick={() => {
            setOpenId(thing.id);
            setSeen((current) =>
              current.includes(thing.id) ? current : [...current, thing.id],
            );
          }}
          style={{ left: `${(thing.x / ROOM_WIDTH) * 100}%` }}
          type="button"
        >
          <span className="hs-thing__art" />
          <span className="hs-thing__label">{thing.label}</span>
        </button>
      ))}

      <div
        aria-hidden="true"
        className="hs-edward"
        data-facing={facing}
        style={{ left: `${(edwardX / ROOM_WIDTH) * 100}%` }}
      >
        <PixelCanvas
          artHeight={EDWARD_ART_SIZE.height}
          artWidth={EDWARD_ART_SIZE.width}
          draw={drawEdward}
          flipX={facing === "left"}
          frame={walkFrame}
          unit={PIXEL_UNIT}
        />
      </div>
      </div>

      {!open ? (
        <div className="hs-hint">
          <p>
            {nearest ? `${nearest.label} · E TO LOOK` : "A / D TO WALK · E TO LOOK"}
          </p>
          <p className="hs-hint__progress">
            {seen.length} OF {THINGS.length} LOOKED AT
          </p>
        </div>
      ) : null}

      {open ? (
        <div className="hs-card" ref={cardRef}>
          <div className="hs-card__head">
            <p className="hs-card__eyebrow">{open.label}</p>
            <h2 className="hs-card__heading">{open.heading}</h2>
          </div>

          {open.kind === "map" ? (
            <ol className="hs-chapters">
              {chapters.map((chapter) => (
                <li key={chapter.id}>
                  <p className="hs-chapters__place">
                    {chapter.place}
                    <span>{chapter.years}</span>
                  </p>
                  {chapter.detail.map((line) => (
                    <p className="hs-chapters__line" key={line}>
                      {line}
                    </p>
                  ))}
                </li>
              ))}
            </ol>
          ) : null}

          {open.kind === "desk" ? (
            <div className="hs-body">
              <p>
                University of Sydney, 2022 – 2026. Bachelor of Advanced
                Computing, Computer Science.
              </p>
              <p>
                Before that: a research internship at Seoul National University
                in Materials Science &amp; Engineering, and a school capstone
                that ended up being an Arduino contactless coffee machine.
              </p>
            </div>
          ) : null}

          {open.kind === "computer" ? (
            <div className="hs-body">
              <p>
                Four projects in this world, and the code behind all of them is
                public. Most recently: computer vision and field deployment at
                Sensorway — Ecopro in Hungary, around 750 sensors, Docker, data
                pipelines, a live rollout.
              </p>
              <div className="hs-links">
                <a
                  className="loc-button loc-button--primary"
                  href={contact.github}
                  rel="noreferrer"
                  target="_blank"
                >
                  GITHUB
                </a>
                <a
                  className="loc-button"
                  href={contact.linkedin}
                  rel="noreferrer"
                  target="_blank"
                >
                  LINKEDIN
                </a>
              </div>
            </div>
          ) : null}

          {open.kind === "papers" ? (
            <div className="hs-body">
              <p>
                {contact.name} — {contact.location}.
              </p>
              <p>The written version, for people who would rather read it.</p>
              <div className="hs-links">
                <Link className="loc-button loc-button--primary" href="/resume">
                  RESUME
                </Link>
                <a className="loc-button" href={`mailto:${contact.email}`}>
                  {contact.email}
                </a>
              </div>
            </div>
          ) : null}

          {open.kind === "rail" ? (
            <div className="hs-body">
              <p>
                Clothes are a real interest, not a side note — enough of one to
                have built an archive for them.
              </p>
              {wardrobe ? (
                <div className="hs-links">
                  <Link className="loc-button" href={wardrobe.caseStudyUrl}>
                    WARDROBE
                  </Link>
                </div>
              ) : null}
            </div>
          ) : null}

          {open.kind === "rig" ? (
            <div className="hs-body">
              <p>League of Legends, mostly.</p>
              <p className="hs-placeholder">
                {leagueRank
                  ? `Current rank: ${leagueRank}.`
                  : "Rank not published here yet — this shelf is waiting for a real number rather than a made-up one."}
              </p>
            </div>
          ) : null}

          <div className="hs-card__actions">
            <button
              className="loc-button loc-button--primary"
              onClick={close}
              ref={openRef}
              type="button"
            >
              PUT IT BACK
            </button>
            <button className="loc-button loc-button--quiet" onClick={onExit} type="button">
              BACK TO WORLD
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
