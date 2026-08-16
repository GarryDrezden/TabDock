import { PanelSideToggle } from "./PanelSideToggle";
import { ValknutLogo } from "./ValknutLogo";
import type { PanelSide } from "../types/tabdock";

type AppHeaderProps = {
  panelSide: PanelSide;
  onAddSection: () => void;
  onDeferCurrent: () => void;
  onPanelSideChange: (side: PanelSide) => void;
};

export function AppHeader({
  panelSide,
  onAddSection,
  onDeferCurrent,
  onPanelSideChange,
}: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand-mark">
          <ValknutLogo size={26} />
        </span>
        <span className="brand-name">TabDock</span>
      </div>
      <div className="header-actions">
        <PanelSideToggle activeSide={panelSide} onSelect={onPanelSideChange} />
        <button
          type="button"
          className="icon-button"
          onClick={onDeferCurrent}
          title="Отложить текущую вкладку"
          aria-label="Отложить текущую вкладку"
        >
          <DeferIcon />
        </button>
        <button
          type="button"
          className="icon-button accent"
          onClick={onAddSection}
          title="Создать раздел"
          aria-label="Создать раздел"
        >
          <PlusIcon />
        </button>
      </div>
    </header>
  );
}

function DeferIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <path
        d="M9 2.6v7.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M6.2 7.4 9 10.2l2.8-2.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.2 9.4h2.2l1.5 2h4.2l1.5-2h2.2V15H3.2V9.4Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <path
        d="M9 3.25v11.5M3.25 9h11.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
