import { useEffect, useRef, useState } from "react";
import type { RuntimeTabInfo, Section, StoredLink } from "../types/tabdock";
import { displayTitle } from "../utils/link";
import type { DropPlace } from "../utils/order";
import { displayHostname, hostnameLetter } from "../utils/url";
import { LinkMenu } from "./LinkMenu";

type LinkRowProps = {
  link: StoredLink;
  runtime: RuntimeTabInfo;
  sections: Section[];
  dragging: boolean;
  dropPlace: DropPlace | null;
  onOpen: (link: StoredLink) => Promise<void>;
  onRename: (linkId: string, name: string) => Promise<void>;
  onMove: (linkId: string, sectionId: string) => Promise<void>;
  onOpenCopy: (link: StoredLink) => Promise<void>;
  onCloseTab: (link: StoredLink) => Promise<void>;
  onRemove: (linkId: string) => Promise<void>;
  onDragStart: (linkId: string) => void;
  onDragOver: (linkId: string, place: DropPlace) => void;
  onDrop: (targetId: string) => void;
  onDragEnd: () => void;
};

export function LinkRow({
  link,
  runtime,
  sections,
  dragging,
  dropPlace,
  onOpen,
  onRename,
  onMove,
  onOpenCopy,
  onCloseTab,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: LinkRowProps) {
  const [brokenIcon, setBrokenIcon] = useState(false);
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const isOpen = runtime.isOpen;
  const showFavicon = Boolean(link.favIconUrl) && !brokenIcon;
  const title = displayTitle(link);
  const hostname = displayHostname(link.url);
  const skipCommit = useRef(false);

  useEffect(() => {
    if (editing) {
      skipCommit.current = false;
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const closeMenu = () => setMenuOpen(false);

  const commitRename = () => {
    if (skipCommit.current) {
      skipCommit.current = false;
      return;
    }
    const next = inputRef.current?.value ?? "";
    setEditing(false);
    if (next.trim() === title) {
      return;
    }
    void onRename(link.id, next);
  };

  const dropClass =
    dropPlace === "before" ? "drop-before" : dropPlace === "after" ? "drop-after" : "";

  return (
    <div
      ref={rowRef}
      className={`link-row ${isOpen ? "is-open" : "is-closed"} ${editing ? "is-editing" : ""} ${dragging ? "is-dragging" : ""} ${dropClass}`}
      onDragOver={(event) => {
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = "move";
        const rect = event.currentTarget.getBoundingClientRect();
        const place: DropPlace = event.clientY < rect.top + rect.height / 2 ? "before" : "after";
        onDragOver(link.id, place);
      }}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onDrop(link.id);
      }}
    >
      <button
        type="button"
        className="icon-button link-handle"
        title="Перетащить"
        aria-label={`Перетащить ${title}`}
        draggable={!editing}
        disabled={editing}
        onClick={(event) => event.stopPropagation()}
        onDragStart={(event) => {
          event.stopPropagation();
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", link.id);
          if (rowRef.current) {
            event.dataTransfer.setDragImage(rowRef.current, 20, 22);
          }
          setMenuOpen(false);
          onDragStart(link.id);
        }}
        onDragEnd={onDragEnd}
      >
        <DragHandleIcon />
      </button>
      <span
        className={`status-dot ${isOpen ? "status-open" : "status-closed"}`}
        aria-hidden="true"
      />
      <span className="link-favicon" aria-hidden="true">
        {showFavicon ? (
          <img
            src={link.favIconUrl}
            alt=""
            width={16}
            height={16}
            onError={() => setBrokenIcon(true)}
          />
        ) : (
          <span className="favicon-fallback">{hostnameLetter(link.url)}</span>
        )}
      </span>
      {editing ? (
        <form
          className="link-rename-form"
          onSubmit={(event) => {
            event.preventDefault();
            inputRef.current?.blur();
          }}
        >
          <input
            ref={inputRef}
            className="link-rename-input"
            defaultValue={title}
            aria-label="Название ссылки"
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
        <>
          <button
            type="button"
            className="link-main"
            onClick={() => {
              void onOpen(link);
            }}
            title={isOpen ? "Перейти к открытой вкладке" : "Открыть страницу"}
            aria-label={
              isOpen
                ? `${title}, открыта. Перейти к вкладке`
                : `${title}, закрыта. Открыть страницу`
            }
          >
            <span className="link-text">
              <span className="link-title">{title}</span>
              <span className="link-url" title={link.url}>
                {hostname}
              </span>
            </span>
          </button>
          <button
            ref={menuButtonRef}
            type="button"
            className="icon-button link-menu-button"
            title="Действия со ссылкой"
            aria-label={`Действия со ссылкой ${title}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={(event) => {
              event.stopPropagation();
              setMenuOpen((open) => !open);
            }}
          >
            <MoreIcon />
          </button>
          <LinkMenu
            open={menuOpen}
            isOpenTab={isOpen}
            sections={sections}
            currentSectionId={link.sectionId}
            anchorRef={menuButtonRef}
            onClose={closeMenu}
            onRename={() => {
              closeMenu();
              setEditing(true);
            }}
            onMove={(sectionId) => {
              closeMenu();
              void onMove(link.id, sectionId);
            }}
            onOpenCopy={() => {
              closeMenu();
              void onOpenCopy(link);
            }}
            onCloseTab={() => {
              closeMenu();
              void onCloseTab(link);
            }}
            onRemove={() => {
              closeMenu();
              void onRemove(link.id);
            }}
          />
        </>
      )}
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
