import { PanelSideToggle } from "./PanelSideToggle";
import { ValknutLogo } from "./ValknutLogo";
import type { PanelSide } from "../types/tabdock";

type AppHeaderProps = {
  panelSide: PanelSide;
  onAddSection: () => void;
  onPanelSideChange: (side: PanelSide) => void;
};

export function AppHeader({ panelSide, onAddSection, onPanelSideChange }: AppHeaderProps) {
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
