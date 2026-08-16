import type { TabDockState } from "../types/tabdock";

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
    sections: Array.isArray(raw.sections) ? (raw.sections as TabDockState["sections"]) : [],
    links: Array.isArray(raw.links) ? (raw.links as TabDockState["links"]) : [],
    panelSide: raw.panelSide === "left" || raw.panelSide === "right" ? raw.panelSide : undefined,
  };
}

export async function loadState(): Promise<TabDockState> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return normalizeState(result[STORAGE_KEY]);
}

export async function saveState(state: TabDockState): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
}
