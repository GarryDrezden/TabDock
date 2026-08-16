import { useEffect, useRef, useState } from "react";
import type { RuntimeTabInfo, StoredLink } from "../types/tabdock";
import { displayTitle } from "../utils/link";
import { compactUrl, hostnameLetter } from "../utils/url";

type LinkRowProps = {
  link: StoredLink;
  runtime: RuntimeTabInfo;
  onOpen: (link: StoredLink) => Promise<void>;
  onRename: (linkId: string, name: string) => Promise<void>;
};

export function LinkRow({ link, runtime, onOpen, onRename }: LinkRowProps) {
  const [brokenIcon, setBrokenIcon] = useState(false);
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isOpen = runtime.isOpen;
  const showFavicon = Boolean(link.favIconUrl) && !brokenIcon;
  const title = displayTitle(link);

  const skipCommit = useRef(false);

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
    const next = inputRef.current?.value ?? "";
    setEditing(false);
    if (next.trim() === title) {
      return;
    }
    void onRename(link.id, next);
  };

  return (
    <div className={`link-row ${isOpen ? "is-open" : "is-closed"} ${editing ? "is-editing" : ""}`}>
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
              <span className="link-url">{compactUrl(link.url)}</span>
            </span>
          </button>
          <button
            type="button"
            className="icon-button link-rename"
            title="Переименовать"
            aria-label={`Переименовать ${title}`}
            onClick={() => setEditing(true)}
          >
            <RenameIcon />
          </button>
        </>
      )}
    </div>
  );
}

function RenameIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
      <path
        d="M8.2 2.4 11.6 5.8 5 12.4H1.6V9Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
