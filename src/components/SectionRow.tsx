import { useState } from "react";
import type { RuntimeTabInfo, Section, StoredLink } from "../types/tabdock";
import type { DropPlace } from "../utils/order";
import { LinkRow } from "./LinkRow";

type SectionRowProps = {
  section: Section;
  links: StoredLink[];
  runtimeByLinkId: Record<string, RuntimeTabInfo>;
  opening: boolean;
  onToggle: (sectionId: string) => void;
  onAddCurrent: (sectionId: string) => void;
  onOpenAll: (sectionId: string) => void;
  onOpenLink: (link: StoredLink) => Promise<void>;
  onRenameLink: (linkId: string, name: string) => Promise<void>;
  onReorderLinks: (
    sectionId: string,
    draggedId: string,
    targetId: string,
    place: DropPlace,
  ) => Promise<void>;
};

export function SectionRow({
  section,
  links,
  runtimeByLinkId,
  opening,
  onToggle,
  onAddCurrent,
  onOpenAll,
  onOpenLink,
  onRenameLink,
  onReorderLinks,
}: SectionRowProps) {
  const [dragSourceId, setDragSourceId] = useState<string | null>(null);
  const [dropOverId, setDropOverId] = useState<string | null>(null);
  const [dropPlace, setDropPlace] = useState<DropPlace>("before");
  const openCount = links.filter((link) => runtimeByLinkId[link.id]?.isOpen).length;
  const total = links.length;
  const orderedLinks = [...links].sort((a, b) => a.order - b.order);

  return (
    <section className="section-block">
      <div className="section-row">
        <button
          type="button"
          className="section-main"
          onClick={() => onToggle(section.id)}
          aria-expanded={!section.collapsed}
          aria-label={
            section.collapsed
              ? `Развернуть раздел ${section.name}`
              : `Свернуть раздел ${section.name}`
          }
          title={section.collapsed ? "Развернуть" : "Свернуть"}
        >
          <span className={`chevron ${section.collapsed ? "is-collapsed" : ""}`} aria-hidden="true">
            <ChevronIcon />
          </span>
          <span className="section-icon" aria-hidden="true">
            {section.icon}
          </span>
          <span className="section-name">{section.name}</span>
          <span className="section-count">
            {openCount} / {total}
          </span>
        </button>
        <div className="section-actions">
          <button
            type="button"
            className="icon-button"
            onClick={() => onAddCurrent(section.id)}
            title="Добавить текущую вкладку"
            aria-label={`Добавить текущую вкладку в ${section.name}`}
          >
            <PlusIcon />
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={() => onOpenAll(section.id)}
            title="Открыть всё"
            aria-label={`Открыть все страницы раздела ${section.name}`}
            disabled={opening || total === 0}
          >
            {opening ? <span className="mini-spinner" aria-hidden="true" /> : <PlayIcon />}
          </button>
        </div>
      </div>
      {!section.collapsed && (
        <div className="link-list">
          {orderedLinks.length === 0 ? (
            <div className="empty-section">
              <p>Пока нет сохранённых страниц</p>
              <button
                type="button"
                className="text-button"
                onClick={() => onAddCurrent(section.id)}
              >
                + Добавить текущую вкладку
              </button>
            </div>
          ) : (
            orderedLinks.map((link) => (
              <LinkRow
                key={link.id}
                link={link}
                runtime={runtimeByLinkId[link.id] ?? { isOpen: false }}
                dragging={dragSourceId === link.id}
                dropPlace={dragSourceId && dropOverId === link.id && dragSourceId !== link.id ? dropPlace : null}
                onOpen={onOpenLink}
                onRename={onRenameLink}
                onDragStart={(linkId) => {
                  setDragSourceId(linkId);
                }}
                onDragOver={(linkId, place) => {
                  setDropOverId(linkId);
                  setDropPlace(place);
                }}
                onDrop={(targetId) => {
                  if (dragSourceId) {
                    void onReorderLinks(section.id, dragSourceId, targetId, dropPlace);
                  }
                  setDragSourceId(null);
                  setDropOverId(null);
                }}
                onDragEnd={() => {
                  setDragSourceId(null);
                  setDropOverId(null);
                }}
              />
            ))
          )}
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

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M8 3v10M3 8h10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
      <path d="M4 2.6v8.8L11.4 7 4 2.6Z" fill="currentColor" />
    </svg>
  );
}
