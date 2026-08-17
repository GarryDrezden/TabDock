import { useRef, useState } from "react";
import { PanelSideToggle } from "./PanelSideToggle";
import { ValknutLogo } from "./ValknutLogo";
import type { PanelSide } from "../types/tabdock";
import { AppMenu } from "./AppMenu";

type AppHeaderProps = {
  panelSide: PanelSide;
  onAddSection: () => void;
  onDeferCurrent: () => void;
  onExport: () => void;
  onImport: () => void;
  onPanelSideChange: (side: PanelSide) => void;
};

export function AppHeader({
  panelSide,
  onAddSection,
  onDeferCurrent,
  onExport,
  onImport,
  onPanelSideChange,
}: AppHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

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
        <button
          ref={menuButtonRef}
          type="button"
          className="icon-button"
          title="Ещё"
          aria-label="Ещё"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <MoreIcon />
        </button>
        <AppMenu
          open={menuOpen}
          anchorRef={menuButtonRef}
          onClose={() => setMenuOpen(false)}
          onExport={() => {
            setMenuOpen(false);
            onExport();
          }}
          onImport={() => {
            setMenuOpen(false);
            onImport();
          }}
        />
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

function MoreIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
      <circle cx="7" cy="3" r="1.2" fill="currentColor" />
      <circle cx="7" cy="7" r="1.2" fill="currentColor" />
      <circle cx="7" cy="11" r="1.2" fill="currentColor" />
    </svg>
  );
}
