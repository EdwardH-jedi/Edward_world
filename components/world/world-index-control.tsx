"use client";

import { usePixelUnit } from "@/lib/game/use-pixel-unit";

interface WorldIndexControlProps {
  activeView: "world" | "index";
  onShowWorld: () => void;
  onShowIndex: () => void;
}

export function WorldIndexControl({
  activeView,
  onShowWorld,
  onShowIndex,
}: WorldIndexControlProps) {
  const unit = usePixelUnit();

  return (
    <nav
      aria-label="Portfolio views"
      className="world-index-control"
      style={{ "--unit": `${unit}px` } as React.CSSProperties}
    >
      <button
        aria-pressed={activeView === "world"}
        onClick={onShowWorld}
        type="button"
      >
        WORLD
      </button>
      <span aria-hidden="true">/</span>
      <button
        aria-pressed={activeView === "index"}
        onClick={onShowIndex}
        type="button"
      >
        INDEX
      </button>
    </nav>
  );
}
