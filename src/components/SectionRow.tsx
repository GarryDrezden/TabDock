import type { RuntimeTabInfo, Section, StoredLink } from "../types/tabdock";
import type { DropPlace } from "../utils/order";
import { isTemporarySection } from "../utils/section";
import { LinkRow } from "./LinkRow";

export type DropHint =
  | { type: "section"; sectionId: string }
  | { type: "link"; linkId: string; place: DropPlace };

type SectionRowProps = {
  section: Section;
  links: StoredLink[];
  sections: Section[];
  runtimeByLinkId: Record<string, RuntimeTabInfo>;
  opening: boolean;
  dragSourceId: string | null;
  dragSourceSectionId: string | null;
  dropHint: DropHint | null;
  onToggle: (sectionId: string) => void;
  onAddCurrent: (sectionId: string, closeAfter?: boolean) => void;
  onOpenAll: (sectionId: string) => void;
  onOpenLink: (link: StoredLink) => Promise<void>;
  onRenameLink: (linkId: string, name: string) => Promise<void>;
  onMoveLink: (linkId: string, sectionId: string) => Promise<void>;
  onOpenCopy: (link: StoredLink) => Promise<void>;
  onCloseTab: (link: StoredLink) => Promise<void>;
  onRemoveLink: (linkId: string) => Promise<void>;
  onDragStart: (linkId: string) => void;
  onLinkDragOver: (linkId: string, place: DropPlace) => void;
  onSectionDragOver: (sectionId: string) => void;
  onLinkDrop: (targetId: string) => void;
  onSectionDrop: (sectionId: string) => void;
  onDragEnd: () => void;
};

export function SectionRow({
  section,
  links,
  sections,
  runtimeByLinkId,
  opening,
  dragSourceId,
  dragSourceSectionId,
  dropHint,
  onToggle,
  onAddCurrent,
  onOpenAll,
  onOpenLink,
  onRenameLink,
  onMoveLink,
  onOpenCopy,
  onCloseTab,
  onRemoveLink,
  onDragStart,
  onLinkDragOver,
  onSectionDragOver,
  onLinkDrop,
  onSectionDrop,
  onDragEnd,
}: SectionRowProps) {
  const isTemporary = isTemporarySection(section);
  const openCount = links.filter((link) => runtimeByLinkId[link.id]?.isOpen).length;
  const total = links.length;
  const orderedLinks = [...links].sort((a, b) => a.order - b.order);
  const isForeignTarget =
    Boolean(dragSourceId) &&
    dragSourceSectionId !== section.id &&
    ((dropHint?.type === "section" && dropHint.sectionId === section.id) ||
      (dropHint?.type === "link" && orderedLinks.some((link) => link.id === dropHint.linkId)));

  return (
    <section
      className={`section-block ${isTemporary ? "is-temporary" : ""} ${isForeignTarget ? "is-drop-target" : ""}`}
      onDragOver={(event) => {
        if (!dragSourceId) {
          return;
        }
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        onSectionDragOver(section.id);
      }}
      onDrop={(event) => {
        if (!dragSourceId) {
          return;
        }
        event.preventDefault();
        onSectionDrop(section.id);
      }}
    >
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
            onClick={(event) => onAddCurrent(section.id, event.shiftKey)}
            title="Добавить текущую вкладку · Shift+клик — сохранить и закрыть"
            aria-label={`Добавить текущую вкладку в ${section.name}. Shift+клик — сохранить и закрыть`}
          >
            <PlusIcon />
          </button>
          {!isTemporary && (
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
          )}
        </div>
      </div>
      {!section.collapsed && (
        <div className="link-list">
          {orderedLinks.length === 0 ? (
            <div className="empty-section">
              {isTemporary ? (
                <>
                  <p>Здесь появятся отложенные страницы</p>
                  <p className="empty-section-hint">
                    Нажмите кнопку в шапке, чтобы сохранить текущую вкладку и закрыть её
                  </p>
                </>
              ) : (
                <>
                  <p>Пока нет сохранённых страниц</p>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => onAddCurrent(section.id)}
                  >
                    + Добавить текущую вкладку
                  </button>
                </>
              )}
            </div>
          ) : (
            orderedLinks.map((link) => (
              <LinkRow
                key={link.id}
                link={link}
                runtime={runtimeByLinkId[link.id] ?? { isOpen: false }}
                sections={sections}
                dragging={dragSourceId === link.id}
                dropPlace={
                  dragSourceId && dropHint?.type === "link" && dropHint.linkId === link.id && dragSourceId !== link.id
                    ? dropHint.place
                    : null
                }
                onOpen={onOpenLink}
                onRename={onRenameLink}
                onMove={onMoveLink}
                onOpenCopy={onOpenCopy}
                onCloseTab={onCloseTab}
                onRemove={onRemoveLink}
                onDragStart={onDragStart}
                onDragOver={onLinkDragOver}
                onDrop={onLinkDrop}
                onDragEnd={onDragEnd}
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
