"use client";

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
  return (
    <nav aria-label="Portfolio views" className="world-index-control">
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
