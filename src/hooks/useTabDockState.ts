import { useCallback, useEffect, useState } from "react";
import { loadState, normalizeState, saveState } from "../services/storage";
import type { PanelSide, PlaceLinkResult, Section, StoredLink, TabDockState } from "../types/tabdock";
import { createId } from "../utils/ids";
import { linksInSection, moveItemById, ordersEqual, type LinkPlacement } from "../utils/order";
import { ensureTemporarySection, isTemporarySection } from "../utils/section";
import { urlsMatch } from "../utils/url";

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
      const next = changes.tabDockState.newValue as unknown;
      if (next) {
        setState(ensureTemporarySection(normalizeState(next)).state);
      }
    };

    chrome.storage.onChanged.addListener(onChanged);
    return () => {
      cancelled = true;
      chrome.storage.onChanged.removeListener(onChanged);
    };
  }, []);

  const persist = useCallback(async (next: TabDockState) => {
    try {
      await saveState(next);
      setState(next);
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

      const maxOrder = state.sections
        .filter((section) => !isTemporarySection(section))
        .reduce((max, section) => Math.max(max, section.order), -1);

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
        (link) => link.sectionId === sectionId && urlsMatch(link.url, input.url),
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

  const placeLink = useCallback(
    async (linkId: string, targetSectionId: string, placement: LinkPlacement): Promise<PlaceLinkResult> => {
      if (!state) {
        throw new Error("TabDock ещё не загружен");
      }

      const link = state.links.find((item) => item.id === linkId);
      const targetSection = state.sections.find((section) => section.id === targetSectionId);
      if (!link || !targetSection) {
        return { status: "missing" };
      }

      const fromSectionId = link.sectionId;
      const crossing = fromSectionId !== targetSectionId;

      if (crossing) {
        const duplicate = state.links.some(
          (other) =>
            other.id !== linkId &&
            other.sectionId === targetSectionId &&
            urlsMatch(other.url, link.url),
        );
        if (duplicate) {
          return { status: "duplicate", sectionName: targetSection.name };
        }
      }

      const withIndex = (sectionId: string, ordered: StoredLink[]) =>
        ordered.map((item, index) => ({
          ...item,
          sectionId,
          order: index,
        }));

      let nextLinks: StoredLink[];

      if (!crossing) {
        const sectionLinks = linksInSection(state.links, fromSectionId);
        const reordered =
          placement.kind === "end"
            ? [...sectionLinks.filter((item) => item.id !== linkId), link]
            : moveItemById(sectionLinks, linkId, placement.targetLinkId, placement.place);
        const indexed = withIndex(fromSectionId, reordered);
        if (ordersEqual(sectionLinks, indexed)) {
          return { status: "noop" };
        }
        const nextOrder = new Map(indexed.map((item) => [item.id, item.order]));
        nextLinks = state.links.map((item) => {
          const order = nextOrder.get(item.id);
          return order === undefined ? item : { ...item, order };
        });
      } else {
        const sourceLinks = withIndex(fromSectionId, linksInSection(state.links, fromSectionId, linkId));
        const targetLinks = linksInSection(state.links, targetSectionId);
        const moving = { ...link, sectionId: targetSectionId };
        let inserted: StoredLink[];
        if (placement.kind === "end") {
          inserted = [...targetLinks, moving];
        } else {
          const targetIndex = targetLinks.findIndex((item) => item.id === placement.targetLinkId);
          if (targetIndex < 0) {
            inserted = [...targetLinks, moving];
          } else {
            const insertAt = placement.place === "after" ? targetIndex + 1 : targetIndex;
            inserted = [...targetLinks.slice(0, insertAt), moving, ...targetLinks.slice(insertAt)];
          }
        }
        const targetIndexed = withIndex(targetSectionId, inserted);
        const byId = new Map(
          [...sourceLinks, ...targetIndexed].map((item) => [item.id, item] as const),
        );
        nextLinks = state.links.map((item) => byId.get(item.id) ?? item);
      }

      await persist({
        ...state,
        links: nextLinks,
      });

      return {
        status: "ok",
        fromSectionId,
        toSectionId: targetSectionId,
        toSectionName: targetSection.name,
      };
    },
    [persist, state],
  );

  const removeLink = useCallback(
    async (linkId: string) => {
      if (!state) {
        throw new Error("TabDock ещё не загружен");
      }

      const link = state.links.find((item) => item.id === linkId);
      if (!link) {
        return;
      }

      const remaining = state.links.filter((item) => item.id !== linkId);
      const reindexed = linksInSection(remaining, link.sectionId).map((item, index) => ({
        ...item,
        order: index,
      }));
      const nextOrder = new Map(reindexed.map((item) => [item.id, item.order]));

      await persist({
        ...state,
        links: remaining.map((item) => {
          const order = nextOrder.get(item.id);
          return order === undefined ? item : { ...item, order };
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
    placeLink,
    removeLink,
    markOpened,
    setPanelSide,
  };
}
