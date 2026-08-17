import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import type { Section } from "../types/tabdock";
import { userSections } from "../utils/section";

type MenuView = "root" | "add";

type UnsavedTabMenuProps = {
  open: boolean;
  sections: Section[];
  anchorRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onAddToSection: (sectionId: string) => void;
  onPostpone: () => void;
  onCloseTab: () => void;
};

export function UnsavedTabMenu({
  open,
  sections,
  anchorRef,
  onClose,
  onAddToSection,
  onPostpone,
  onCloseTab,
}: UnsavedTabMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<MenuView>("root");
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [ready, setReady] = useState(false);
  const destinations = userSections(sections);

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
  }, [open, view, anchorRef, destinations.length]);

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
          {destinations.length > 0 && (
            <button type="button" role="menuitem" onClick={() => setView("add")}>
              Добавить в раздел
            </button>
          )}
          <button type="button" role="menuitem" onClick={onPostpone}>
            Отложить
          </button>
          <button type="button" role="menuitem" onClick={onCloseTab}>
            Закрыть вкладку
          </button>
        </>
      )}
      {view === "add" && (
        <>
          <div className="link-menu-caption">Добавить в раздел</div>
          {destinations.map((section) => (
            <button
              key={section.id}
              type="button"
              role="menuitem"
              onClick={() => onAddToSection(section.id)}
            >
              {section.icon} {section.name}
            </button>
          ))}
        </>
      )}
    </div>
  );
}
