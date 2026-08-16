import type { PanelSide } from "../types/tabdock";

type PanelSideToggleProps = {
  activeSide: PanelSide;
  onSelect: (side: PanelSide) => void;
};

export function PanelSideToggle({ activeSide, onSelect }: PanelSideToggleProps) {
  return (
    <div className="side-toggle" role="group" aria-label="Сторона панели">
      <button
        type="button"
        className={activeSide === "left" ? "is-active" : undefined}
        title="Панель слева"
        aria-label="Панель слева"
        aria-pressed={activeSide === "left"}
        onClick={() => onSelect("left")}
      >
        <DockSideIcon side="left" />
      </button>
      <button
        type="button"
        className={activeSide === "right" ? "is-active" : undefined}
        title="Панель справа"
        aria-label="Панель справа"
        aria-pressed={activeSide === "right"}
        onClick={() => onSelect("right")}
      >
        <DockSideIcon side="right" />
      </button>
    </div>
  );
}

function DockSideIcon({ side }: { side: PanelSide }) {
  const barX = side === "left" ? 2.2 : 10.2;
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <rect
        x="1.5"
        y="2.5"
        width="13"
        height="11"
        rx="1.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect x={barX} y="3.8" width="3.6" height="8.4" rx="0.6" fill="currentColor" />
    </svg>
  );
}
