import { useCallback, useEffect, useState } from "react";
import { loadState, saveState } from "../services/storage";
import type { PanelSide, Section, StoredLink, TabDockState } from "../types/tabdock";
import { createId } from "../utils/ids";
import { moveItemById, ordersEqual, type DropPlace } from "../utils/order";

const DEFAULT_SECTION_ICON = "📁";

export function useTabDockState() {
  const [state, setState] = useState<TabDockState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const loaded = await loadState();
        if (!cancelled) {
          setState(loaded);
          setLoadError(null);
        }
      } catch {
        if (!cancelled) {
          setLoadError("Не удалось загрузить данные TabDock");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    const onChanged: Parameters<typeof chrome.storage.onChanged.addListener>[0] = (
      changes,
      areaName,
    ) => {
      if (areaName !== "local" || !changes.tabDockState) {
        return;
      }
      const next = changes.tabDockState.newValue as TabDockState | undefined;
      if (next) {
        setState(next);
      }
    };

    chrome.storage.onChanged.addListener(onChanged);
    return () => {
      cancelled = true;
      chrome.storage.onChanged.removeListener(onChanged);
    };
  }, []);

  const persist = useCallback(async (next: TabDockState) => {
    setState(next);
    try {
      await saveState(next);
    } catch {
      throw new Error("Не удалось сохранить данные TabDock");
    }
  }, []);

  const createSection = useCallback(
    async (name: string) => {
      if (!state) {
        throw new Error("TabDock ещё не загружен");
      }

      const trimmed = name.trim();
      if (!trimmed) {
        return;
      }

      const maxOrder = state.sections.reduce(
        (max, section) => Math.max(max, section.order),
        -1,
      );

      const section: Section = {
        id: createId(),
        name: trimmed,
        icon: DEFAULT_SECTION_ICON,
        order: maxOrder + 1,
        collapsed: false,
      };

      await persist({
        ...state,
        sections: [...state.sections, section],
      });
    },
    [persist, state],
  );

  const toggleCollapsed = useCallback(
    async (sectionId: string) => {
      if (!state) {
        return;
      }

      await persist({
        ...state,
        sections: state.sections.map((section) =>
          section.id === sectionId
            ? { ...section, collapsed: !section.collapsed }
            : section,
        ),
      });
    },
    [persist, state],
  );

  const addLink = useCallback(
    async (sectionId: string, input: { url: string; title: string; favIconUrl?: string }) => {
      if (!state) {
        throw new Error("TabDock ещё не загружен");
      }

      const exists = state.links.some(
        (link) => link.sectionId === sectionId && link.url === input.url,
      );
      if (exists) {
        return "duplicate" as const;
      }

      const siblings = state.links.filter((link) => link.sectionId === sectionId);
      const maxOrder = siblings.reduce((max, link) => Math.max(max, link.order), -1);

      const link: StoredLink = {
        id: createId(),
        sectionId,
        url: input.url,
        title: input.title,
        favIconUrl: input.favIconUrl,
        order: maxOrder + 1,
        createdAt: Date.now(),
        lastOpenedAt: Date.now(),
      };

      await persist({
        ...state,
        links: [...state.links, link],
      });

      return "created" as const;
    },
    [persist, state],
  );

  const markOpened = useCallback(
    async (linkIds: string[]) => {
      if (!state || linkIds.length === 0) {
        return;
      }

      const opened = new Set(linkIds);
      const now = Date.now();

      await persist({
        ...state,
        links: state.links.map((link) =>
          opened.has(link.id) ? { ...link, lastOpenedAt: now } : link,
        ),
      });
    },
    [persist, state],
  );

  const renameLink = useCallback(
    async (linkId: string, name: string) => {
      if (!state) {
        throw new Error("TabDock ещё не загружен");
      }

      const trimmed = name.trim();

      await persist({
        ...state,
        links: state.links.map((link) =>
          link.id === linkId
            ? { ...link, customTitle: trimmed || undefined }
            : link,
        ),
      });
    },
    [persist, state],
  );

  const reorderLinks = useCallback(
    async (sectionId: string, draggedId: string, targetId: string, place: DropPlace) => {
      if (!state) {
        throw new Error("TabDock ещё не загружен");
      }

      const sectionLinks = state.links
        .filter((link) => link.sectionId === sectionId)
        .sort((a, b) => a.order - b.order);
      const reordered = moveItemById(sectionLinks, draggedId, targetId, place).map((link, index) => ({
        ...link,
        order: index,
      }));

      if (ordersEqual(sectionLinks, reordered)) {
        return;
      }

      const nextOrder = new Map(reordered.map((link) => [link.id, link.order]));

      await persist({
        ...state,
        links: state.links.map((link) => {
          const order = nextOrder.get(link.id);
          return order === undefined ? link : { ...link, order };
        }),
      });
    },
    [persist, state],
  );

  const setPanelSide = useCallback(
    async (panelSide: PanelSide) => {
      if (!state) {
        return;
      }

      await persist({
        ...state,
        panelSide,
      });
    },
    [persist, state],
  );

  return {
    state,
    loading,
    loadError,
    createSection,
    toggleCollapsed,
    addLink,
    renameLink,
    reorderLinks,
    markOpened,
    setPanelSide,
  };
}
