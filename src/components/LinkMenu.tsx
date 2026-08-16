import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import type { Section } from "../types/tabdock";
import { sortSectionsForDisplay } from "../utils/section";

type MenuView = "root" | "move" | "confirm";

type LinkMenuProps = {
  open: boolean;
  isOpenTab: boolean;
  sections: Section[];
  currentSectionId: string;
  anchorRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onRename: () => void;
  onMove: (sectionId: string) => void;
  onOpenCopy: () => void;
  onCloseTab: () => void;
  onRemove: () => void;
};

export function LinkMenu({
  open,
  isOpenTab,
  sections,
  currentSectionId,
  anchorRef,
  onClose,
  onRename,
  onMove,
  onOpenCopy,
  onCloseTab,
  onRemove,
}: LinkMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<MenuView>("root");
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [ready, setReady] = useState(false);
  const otherSections = sortSectionsForDisplay(sections).filter(
    (section) => section.id !== currentSectionId,
  );

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
    const width = menu.width || 188;
    const height = menu.height || 160;
    let left = button.right - width;
    left = Math.max(pad, Math.min(left, window.innerWidth - width - pad));
    let top = button.bottom + 4;
    if (top + height > window.innerHeight - pad) {
      top = Math.max(pad, button.top - height - 4);
    }
    setCoords({ top, left });
    setReady(true);
  }, [open, view, anchorRef, otherSections.length, isOpenTab]);

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
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
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
  }, [anchorRef, onClose, open]);

  useEffect(() => {
    if (!open) {
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
      className="link-menu"
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
          {otherSections.length > 0 && (
            <button type="button" role="menuitem" onClick={() => setView("move")}>
              Переместить в раздел
            </button>
          )}
          <button type="button" role="menuitem" onClick={onOpenCopy}>
            Открыть отдельную копию
          </button>
          {isOpenTab && (
            <button type="button" role="menuitem" onClick={onCloseTab}>
              Закрыть вкладку
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            className="link-menu-danger"
            onClick={() => setView("confirm")}
          >
            Удалить из TabDock
          </button>
        </>
      )}
      {view === "move" && (
        <>
          <div className="link-menu-caption">Переместить в раздел</div>
          {otherSections.map((section) => (
            <button
              key={section.id}
              type="button"
              role="menuitem"
              onClick={() => onMove(section.id)}
            >
              {section.icon} {section.name}
            </button>
          ))}
        </>
      )}
      {view === "confirm" && (
        <div className="link-menu-confirm">
          <p>Удалить ссылку из TabDock?</p>
          <div className="link-menu-confirm-actions">
            <button type="button" onClick={() => setView("root")}>
              Отмена
            </button>
            <button type="button" className="link-menu-danger" onClick={onRemove}>
              Удалить
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
