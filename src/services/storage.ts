import type { Section, TabDockState } from "../types/tabdock";
import { ensureTemporarySection } from "../utils/section";

export const STORAGE_KEY = "tabDockState";

export const EMPTY_STATE: TabDockState = {
  version: 1,
  sections: [],
  links: [],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function normalizeState(raw: unknown): TabDockState {
  if (!isRecord(raw)) {
    return EMPTY_STATE;
  }

  return {
    version: 1,
    sections: Array.isArray(raw.sections)
      ? raw.sections.flatMap((item) => {
          const section = normalizeSection(item);
          return section ? [section] : [];
        })
      : [],
    links: Array.isArray(raw.links)
      ? raw.links.flatMap((item) => {
          const link = normalizeLink(item);
          return link ? [link] : [];
        })
      : [],
    panelSide: raw.panelSide === "left" || raw.panelSide === "right" ? raw.panelSide : undefined,
  };
}

function normalizeSection(value: unknown): Section | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.name !== "string") {
    return null;
  }

  return {
    id: value.id,
    name: value.name,
    icon: typeof value.icon === "string" && value.icon ? value.icon : "📁",
    order: typeof value.order === "number" ? value.order : 0,
    collapsed: Boolean(value.collapsed),
    kind: value.kind === "temporary" ? "temporary" : undefined,
  };
}

function normalizeLink(value: unknown): TabDockState["links"][number] | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.sectionId !== "string") {
    return null;
  }
  if (typeof value.url !== "string" || typeof value.title !== "string") {
    return null;
  }

  const customTitle = typeof value.customTitle === "string" ? value.customTitle.trim() : "";

  return {
    id: value.id,
    sectionId: value.sectionId,
    url: value.url,
    title: value.title,
    customTitle: customTitle || undefined,
    favIconUrl: typeof value.favIconUrl === "string" ? value.favIconUrl : undefined,
    order: typeof value.order === "number" ? value.order : 0,
    createdAt: typeof value.createdAt === "number" ? value.createdAt : 0,
    lastOpenedAt: typeof value.lastOpenedAt === "number" ? value.lastOpenedAt : undefined,
  };
}

export async function loadState(): Promise<TabDockState> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const normalized = normalizeState(result[STORAGE_KEY]);
  const ensured = ensureTemporarySection(normalized);
  if (ensured.changed) {
    try {
      await saveState(ensured.state);
    } catch {
      // Keep the in-memory Temporary section even if the first persist fails.
    }
  }
  return ensured.state;
}

export async function saveState(state: TabDockState): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
}
