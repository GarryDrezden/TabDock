import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";

type AppMenuProps = {
  open: boolean;
  anchorRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onExport: () => void;
  onImport: () => void;
};

export function AppMenu({ open, anchorRef, onClose, onExport, onImport }: AppMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!open) {
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
    const height = menu.height || 88;
    let left = button.right - width;
    left = Math.max(pad, Math.min(left, window.innerWidth - width - pad));
    let top = button.bottom + 4;
    if (top + height > window.innerHeight - pad) {
      top = Math.max(pad, button.top - height - 4);
    }
    setCoords({ top, left });
    setReady(true);
  }, [anchorRef, open]);

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
    menuRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, [open]);

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
      <button type="button" role="menuitem" onClick={onExport}>
        Экспорт данных
      </button>
      <button type="button" role="menuitem" onClick={onImport}>
        Импорт данных
      </button>
    </div>
  );
}
