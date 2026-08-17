import { useEffect, useRef, useState } from "react";
import type { Section, UnsavedBrowserTab } from "../types/tabdock";
import { TAB_DRAG_TYPE } from "../utils/dnd";
import { displayHostname, hostnameLetter } from "../utils/url";
import { UnsavedTabMenu } from "./UnsavedTabMenu";

type UnsavedTabRowProps = {
  tab: UnsavedBrowserTab;
  sections: Section[];
  dragging: boolean;
  onOpen: (tab: UnsavedBrowserTab) => Promise<void>;
  onAddToSection: (tabId: number, sectionId: string) => Promise<void>;
  onPostpone: (tabId: number) => Promise<void>;
  onCloseTab: (tabId: number) => Promise<void>;
  onDragStart: (tab: UnsavedBrowserTab) => void;
  onDragEnd: () => void;
};

export function UnsavedTabRow({
  tab,
  sections,
  dragging,
  onOpen,
  onAddToSection,
  onPostpone,
  onCloseTab,
  onDragStart,
  onDragEnd,
}: UnsavedTabRowProps) {
  const [brokenIcon, setBrokenIcon] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const showFavicon = Boolean(tab.favIconUrl) && !brokenIcon;
  const hostname = displayHostname(tab.url);

  useEffect(() => {
    setBrokenIcon(false);
  }, [tab.favIconUrl]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div
      ref={rowRef}
      className={`link-row is-open ${dragging ? "is-dragging" : ""}`}
    >
      <button
        type="button"
        className="icon-button link-handle"
        title="Перетащить"
        aria-label={`Перетащить ${tab.title}`}
        draggable
        onClick={(event) => event.stopPropagation()}
        onDragStart={(event) => {
          event.stopPropagation();
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData(TAB_DRAG_TYPE, String(tab.tabId));
          if (rowRef.current) {
            event.dataTransfer.setDragImage(rowRef.current, 20, 22);
          }
          setMenuOpen(false);
          onDragStart(tab);
        }}
        onDragEnd={onDragEnd}
      >
        <DragHandleIcon />
      </button>
      <span className="status-dot status-open" aria-hidden="true" />
      <span className="link-favicon" aria-hidden="true">
        {showFavicon ? (
          <img
            src={tab.favIconUrl}
            alt=""
            width={16}
            height={16}
            onError={() => setBrokenIcon(true)}
          />
        ) : (
          <span className="favicon-fallback">{hostnameLetter(tab.url)}</span>
        )}
      </span>
      <button
        type="button"
        className="link-main"
        onClick={() => {
          void onOpen(tab);
        }}
        title="Перейти к открытой вкладке"
        aria-label={`${tab.title}, открыта. Перейти к вкладке`}
      >
        <span className="link-text">
          <span className="link-title">{tab.title}</span>
          <span className="link-url" title={tab.url}>
            {hostname}
          </span>
        </span>
      </button>
      <button
        ref={menuButtonRef}
        type="button"
        className="icon-button link-menu-button"
        title="Действия с вкладкой"
        aria-label={`Действия с вкладкой ${tab.title}`}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={(event) => {
          event.stopPropagation();
          setMenuOpen((open) => !open);
        }}
      >
        <MoreIcon />
      </button>
      <UnsavedTabMenu
        open={menuOpen}
        sections={sections}
        anchorRef={menuButtonRef}
        onClose={closeMenu}
        onAddToSection={(sectionId) => {
          closeMenu();
          void onAddToSection(tab.tabId, sectionId);
        }}
        onPostpone={() => {
          closeMenu();
          void onPostpone(tab.tabId);
        }}
        onCloseTab={() => {
          closeMenu();
          void onCloseTab(tab.tabId);
        }}
      />
    </div>
  );
}

function DragHandleIcon() {
  return (
    <svg width="10" height="14" viewBox="0 0 10 14" aria-hidden="true" focusable="false">
      <circle cx="3" cy="3" r="1.1" fill="currentColor" />
      <circle cx="7" cy="3" r="1.1" fill="currentColor" />
      <circle cx="3" cy="7" r="1.1" fill="currentColor" />
      <circle cx="7" cy="7" r="1.1" fill="currentColor" />
      <circle cx="3" cy="11" r="1.1" fill="currentColor" />
      <circle cx="7" cy="11" r="1.1" fill="currentColor" />
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
