import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { firstGrapheme } from "../utils/section";

export const SECTION_ICONS = [
  "📁",
  "💼",
  "🛠️",
  "💻",
  "🌐",
  "📚",
  "🎬",
  "🎵",
  "💰",
  "💳",
  "🏠",
  "⭐",
  "🔧",
  "🧪",
  "📦",
  "📝",
] as const;

type MenuView = "root" | "icon" | "confirm" | "close-confirm";

type SectionMenuProps = {
  open: boolean;
  sectionName: string;
  linkCount: number;
  openCount: number;
  currentIcon: string;
  anchorRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onRename: () => void;
  onSetIcon: (icon: string) => void;
  onCloseTabs: () => void;
  onDelete: () => void;
};

export function SectionMenu({
  open,
  sectionName,
  linkCount,
  openCount,
  currentIcon,
  anchorRef,
  onClose,
  onRename,
  onSetIcon,
  onCloseTabs,
  onDelete,
}: SectionMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const customRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<MenuView>("root");
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!open) {
      setView("root");
      setReady(false);
    }
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current || !menuRef.current) {
      return;
    }

    const button = anchorRef.current.getBoundingClientRect();
    const menu = menuRef.current.getBoundingClientRect();
    const pad = 8;
    const width = menu.width || 220;
    const height = menu.height || 180;
    let left = button.right - width;
    left = Math.max(pad, Math.min(left, window.innerWidth - width - pad));
    let top = button.bottom + 4;
    if (top + height > window.innerHeight - pad) {
      top = Math.max(pad, button.top - height - 4);
    }
    setCoords({ top, left });
    setReady(true);
  }, [open, view, anchorRef, openCount, linkCount]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (menuRef.current?.contains(target) || anchorRef.current?.contains(target)) {
        return;
      }
      onClose();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (view === "icon" || event.key !== "ArrowDown" && event.key !== "ArrowUp") {
        return;
      }
      const buttons = menuRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
      if (!buttons || buttons.length === 0) {
        return;
      }
      event.preventDefault();
      const items = Array.from(buttons);
      const current = items.indexOf(document.activeElement as HTMLButtonElement);
      const delta = event.key === "ArrowDown" ? 1 : -1;
      const next = items[(current + delta + items.length) % items.length];
      next?.focus();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [anchorRef, onClose, open, view]);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (view === "icon") {
      customRef.current?.focus();
      return;
    }
    const first = menuRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)");
    first?.focus();
  }, [open, view]);

  if (!open) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      className="link-menu section-menu"
      role="menu"
      style={{ top: coords.top, left: coords.left, visibility: ready ? "visible" : "hidden" }}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {view === "root" && (
        <>
          <button type="button" role="menuitem" onClick={onRename}>
            Переименовать
          </button>
          <button type="button" role="menuitem" onClick={() => setView("icon")}>
            Изменить иконку
          </button>
          {openCount > 0 && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                if (openCount > 20) {
                  setView("close-confirm");
                  return;
                }
                onCloseTabs();
              }}
            >
              Закрыть вкладки раздела{openCount > 1 ? ` · ${openCount}` : ""}
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            className="link-menu-danger"
            onClick={() => setView("confirm")}
          >
            Удалить раздел
          </button>
        </>
      )}
      {view === "icon" && (
        <div className="icon-picker">
          <div className="link-menu-caption">Иконка раздела</div>
          <div className="icon-picker-grid">
            {SECTION_ICONS.map((icon) => (
              <button
                key={icon}
                type="button"
                className={icon === currentIcon ? "is-selected" : ""}
                aria-label={`Иконка ${icon}`}
                onClick={() => onSetIcon(icon)}
              >
                {icon}
              </button>
            ))}
          </div>
          <form
            className="icon-picker-custom"
            onSubmit={(event) => {
              event.preventDefault();
              const icon = firstGrapheme(customRef.current?.value ?? "");
              if (icon) {
                onSetIcon(icon);
              }
            }}
          >
            <label htmlFor="section-icon-custom">Своя</label>
            <input
              id="section-icon-custom"
              ref={customRef}
              className="icon-picker-input"
              placeholder="emoji"
              aria-label="Своя иконка"
              onKeyDown={(event) => event.stopPropagation()}
            />
          </form>
        </div>
      )}
      {view === "close-confirm" && (
        <div className="link-menu-confirm">
          <p>Закрыть {openCount} вкладок раздела?</p>
          <div className="link-menu-confirm-actions">
            <button type="button" onClick={() => setView("root")}>
              Отмена
            </button>
            <button type="button" onClick={onCloseTabs}>
              Закрыть
            </button>
          </div>
        </div>
      )}
      {view === "confirm" && (
        <div className="link-menu-confirm">
          <p>Удалить раздел «{sectionName}»?</p>
          {linkCount > 0 ? (
            <p className="link-menu-confirm-copy">
              Будут удалены {linkCount} сохранённых ссылок из TabDock. Открытые вкладки браузера
              останутся открытыми.
            </p>
          ) : (
            <p className="link-menu-confirm-copy">В разделе нет сохранённых ссылок.</p>
          )}
          <div className="link-menu-confirm-actions">
            <button type="button" onClick={() => setView("root")}>
              Отмена
            </button>
            <button type="button" className="link-menu-danger" onClick={onDelete}>
              Удалить
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
