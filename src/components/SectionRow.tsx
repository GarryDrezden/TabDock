import { useEffect, useRef, useState } from "react";
import type { RuntimeTabInfo, Section, StoredLink } from "../types/tabdock";
import { SECTION_DRAG_TYPE, isSectionDrag } from "../utils/dnd";
import type { DropPlace } from "../utils/order";
import { isTemporarySection } from "../utils/section";
import { LinkRow } from "./LinkRow";
import { SectionMenu } from "./SectionMenu";

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
  sectionDragging: boolean;
  reorderPlace: DropPlace | null;
  onToggle: (sectionId: string) => void;
  onAddCurrent: (sectionId: string, closeAfter?: boolean) => void;
  onOpenAll: (sectionId: string) => void;
  onOpenLink: (link: StoredLink) => Promise<void>;
  onRenameLink: (linkId: string, name: string) => Promise<void>;
  onMoveLink: (linkId: string, sectionId: string) => Promise<void>;
  onOpenCopy: (link: StoredLink) => Promise<void>;
  onCloseTab: (link: StoredLink) => Promise<void>;
  onRemoveLink: (linkId: string) => Promise<void>;
  onRenameSection: (sectionId: string, name: string) => Promise<void>;
  onSetSectionIcon: (sectionId: string, icon: string) => Promise<void>;
  onCloseSectionTabs: (sectionId: string) => Promise<void>;
  onDeleteSection: (sectionId: string) => Promise<void>;
  onLinkDragStart: (linkId: string) => void;
  onLinkDragOver: (linkId: string, place: DropPlace) => void;
  onLinkOverSection: (sectionId: string) => void;
  onLinkDrop: (targetId: string) => void;
  onLinkDropOnSection: (sectionId: string) => void;
  onLinkDragEnd: () => void;
  onSectionDragStart: (sectionId: string) => void;
  onSectionReorderOver: (sectionId: string, place: DropPlace) => void;
  onSectionReorderDrop: (sectionId: string) => void;
  onSectionDragEnd: () => void;
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
  sectionDragging,
  reorderPlace,
  onToggle,
  onAddCurrent,
  onOpenAll,
  onOpenLink,
  onRenameLink,
  onMoveLink,
  onOpenCopy,
  onCloseTab,
  onRemoveLink,
  onRenameSection,
  onSetSectionIcon,
  onCloseSectionTabs,
  onDeleteSection,
  onLinkDragStart,
  onLinkDragOver,
  onLinkOverSection,
  onLinkDrop,
  onLinkDropOnSection,
  onLinkDragEnd,
  onSectionDragStart,
  onSectionReorderOver,
  onSectionReorderDrop,
  onSectionDragEnd,
}: SectionRowProps) {
  const isTemporary = isTemporarySection(section);
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const skipCommit = useRef(false);
  const openCount = links.filter((link) => runtimeByLinkId[link.id]?.isOpen).length;
  const total = links.length;
  const orderedLinks = [...links].sort((a, b) => a.order - b.order);
  const isForeignLinkTarget =
    Boolean(dragSourceId) &&
    !sectionDragging &&
    dragSourceSectionId !== section.id &&
    ((dropHint?.type === "section" && dropHint.sectionId === section.id) ||
      (dropHint?.type === "link" && orderedLinks.some((link) => link.id === dropHint.linkId)));
  const reorderClass =
    reorderPlace === "before" ? "drop-before" : reorderPlace === "after" ? "drop-after" : "";

  useEffect(() => {
    if (editing) {
      skipCommit.current = false;
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commitRename = () => {
    if (skipCommit.current) {
      skipCommit.current = false;
      return;
    }
    const next = (inputRef.current?.value ?? "").trim();
    setEditing(false);
    if (!next || next === section.name) {
      return;
    }
    void onRenameSection(section.id, next);
  };

  return (
    <section
      className={`section-block ${isTemporary ? "is-temporary" : ""} ${isForeignLinkTarget ? "is-drop-target" : ""} ${sectionDragging ? "is-dragging" : ""}`}
      onDragOver={(event) => {
        if (isSectionDrag(event)) {
          if (isTemporary) {
            return;
          }
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          const rect = (rowRef.current ?? event.currentTarget).getBoundingClientRect();
          const place: DropPlace = event.clientY < rect.top + rect.height / 2 ? "before" : "after";
          onSectionReorderOver(section.id, place);
          return;
        }
        if (!dragSourceId) {
          return;
        }
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        onLinkOverSection(section.id);
      }}
      onDrop={(event) => {
        if (isSectionDrag(event)) {
          if (isTemporary) {
            return;
          }
          event.preventDefault();
          onSectionReorderDrop(section.id);
          return;
        }
        if (!dragSourceId) {
          return;
        }
        event.preventDefault();
        onLinkDropOnSection(section.id);
      }}
    >
      <div
        ref={rowRef}
        className={`section-row ${reorderClass} ${editing ? "is-editing" : ""}`}
      >
        {!isTemporary && (
          <button
            type="button"
            className="icon-button link-handle section-handle"
            title="Перетащить раздел"
            aria-label={`Перетащить раздел ${section.name}`}
            draggable={!editing}
            disabled={editing}
            onClick={(event) => event.stopPropagation()}
            onDragStart={(event) => {
              event.stopPropagation();
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData(SECTION_DRAG_TYPE, section.id);
              if (rowRef.current) {
                event.dataTransfer.setDragImage(rowRef.current, 16, 20);
              }
              setMenuOpen(false);
              onSectionDragStart(section.id);
            }}
            onDragEnd={onSectionDragEnd}
          >
            <DragHandleIcon />
          </button>
        )}
        {editing ? (
          <form
            className="section-rename-form"
            onSubmit={(event) => {
              event.preventDefault();
              inputRef.current?.blur();
            }}
          >
            <input
              ref={inputRef}
              className="section-rename-input"
              defaultValue={section.name}
              aria-label="Название раздела"
              onBlur={commitRename}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  skipCommit.current = true;
                  setEditing(false);
                }
              }}
            />
          </form>
        ) : (
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
        )}
        <div className="section-actions">
          <button
            type="button"
            className="icon-button"
            onClick={(event) => {
              event.stopPropagation();
              onAddCurrent(section.id, event.shiftKey);
            }}
            title="Добавить текущую вкладку · Shift+клик — сохранить и закрыть"
            aria-label={`Добавить текущую вкладку в ${section.name}. Shift+клик — сохранить и закрыть`}
          >
            <PlusIcon />
          </button>
          {!isTemporary && (
            <button
              type="button"
              className="icon-button"
              onClick={(event) => {
                event.stopPropagation();
                onOpenAll(section.id);
              }}
              title="Открыть всё"
              aria-label={`Открыть все страницы раздела ${section.name}`}
              disabled={opening || total === 0}
            >
              {opening ? <span className="mini-spinner" aria-hidden="true" /> : <PlayIcon />}
            </button>
          )}
          {!isTemporary && (
            <>
              <button
                ref={menuButtonRef}
                type="button"
                className="icon-button link-menu-button"
                title="Действия с разделом"
                aria-label={`Действия с разделом ${section.name}`}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={(event) => {
                  event.stopPropagation();
                  setMenuOpen((open) => !open);
                }}
              >
                <MoreIcon />
              </button>
              <SectionMenu
                open={menuOpen}
                sectionName={section.name}
                linkCount={total}
                openCount={openCount}
                currentIcon={section.icon}
                anchorRef={menuButtonRef}
                onClose={() => setMenuOpen(false)}
                onRename={() => {
                  setMenuOpen(false);
                  setEditing(true);
                }}
                onSetIcon={(icon) => {
                  setMenuOpen(false);
                  void onSetSectionIcon(section.id, icon);
                }}
                onCloseTabs={() => {
                  setMenuOpen(false);
                  void onCloseSectionTabs(section.id);
                }}
                onDelete={() => {
                  setMenuOpen(false);
                  void onDeleteSection(section.id);
                }}
              />
            </>
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
                  dragSourceId &&
                  !sectionDragging &&
                  dropHint?.type === "link" &&
                  dropHint.linkId === link.id &&
                  dragSourceId !== link.id
                    ? dropHint.place
                    : null
                }
                onOpen={onOpenLink}
                onRename={onRenameLink}
                onMove={onMoveLink}
                onOpenCopy={onOpenCopy}
                onCloseTab={onCloseTab}
                onRemove={onRemoveLink}
                onDragStart={onLinkDragStart}
                onDragOver={onLinkDragOver}
                onDrop={onLinkDrop}
                onDragEnd={onLinkDragEnd}
              />
            ))
          )}
        </div>
      )}
    </section>
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

function MoreIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
      <circle cx="7" cy="3" r="1.2" fill="currentColor" />
      <circle cx="7" cy="7" r="1.2" fill="currentColor" />
      <circle cx="7" cy="11" r="1.2" fill="currentColor" />
    </svg>
  );
}
