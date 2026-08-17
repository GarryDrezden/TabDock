import { useState } from "react";
import type { Section, UnsavedBrowserTab } from "../types/tabdock";
import { UnsavedTabRow } from "./UnsavedTabRow";

type UnsavedTabsSectionProps = {
  tabs: UnsavedBrowserTab[];
  sections: Section[];
  draggingTabId: number | null;
  onOpen: (tab: UnsavedBrowserTab) => Promise<void>;
  onAddToSection: (tabId: number, sectionId: string) => Promise<void>;
  onPostpone: (tabId: number) => Promise<void>;
  onCloseTab: (tabId: number) => Promise<void>;
  onDragStart: (tab: UnsavedBrowserTab) => void;
  onDragEnd: () => void;
};

export function UnsavedTabsSection({
  tabs,
  sections,
  draggingTabId,
  onOpen,
  onAddToSection,
  onPostpone,
  onCloseTab,
  onDragStart,
  onDragEnd,
}: UnsavedTabsSectionProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (tabs.length === 0) {
    return null;
  }

  return (
    <section className="section-block is-unsaved">
      <div className="section-row">
        <button
          type="button"
          className="section-main"
          onClick={() => setCollapsed((value) => !value)}
          aria-expanded={!collapsed}
          aria-label={
            collapsed
              ? "Развернуть раздел Открытые без раздела"
              : "Свернуть раздел Открытые без раздела"
          }
          title={collapsed ? "Развернуть" : "Свернуть"}
        >
          <span className={`chevron ${collapsed ? "is-collapsed" : ""}`} aria-hidden="true">
            <ChevronIcon />
          </span>
          <span className="section-icon" aria-hidden="true">
            🌐
          </span>
          <span className="section-name">Открытые без раздела</span>
          <span className="section-count">{tabs.length}</span>
        </button>
      </div>
      {!collapsed && (
        <div className="link-list">
          {tabs.map((tab) => (
            <UnsavedTabRow
              key={tab.tabId}
              tab={tab}
              sections={sections}
              dragging={draggingTabId === tab.tabId}
              onOpen={onOpen}
              onAddToSection={onAddToSection}
              onPostpone={onPostpone}
              onCloseTab={onCloseTab}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ChevronIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      <path
        d="M2.4 4.2 6 7.8l3.6-3.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
