import type { RuntimeTabInfo, StoredLink } from "../types/tabdock";
import { isSavableUrl, urlsMatch } from "../utils/url";

export async function queryAllTabs(): Promise<chrome.tabs.Tab[]> {
  return chrome.tabs.query({});
}

export async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  return tab;
}

export function findTabByUrl(
  tabs: chrome.tabs.Tab[],
  url: string,
): chrome.tabs.Tab | undefined {
  return tabs.find((tab) => typeof tab.url === "string" && urlsMatch(tab.url, url));
}

export function runtimeForLink(
  link: StoredLink,
  tabs: chrome.tabs.Tab[],
): RuntimeTabInfo {
  const tab = findTabByUrl(tabs, link.url);
  if (!tab || tab.id === undefined) {
    return { isOpen: false };
  }

  return {
    isOpen: true,
    tabId: tab.id,
    windowId: tab.windowId,
    tabIndex: tab.index,
  };
}

export async function focusExistingTab(tab: chrome.tabs.Tab): Promise<void> {
  if (tab.id === undefined) {
    throw new Error("Tab has no id");
  }

  await chrome.windows.update(tab.windowId, { focused: true });
  await chrome.tabs.update(tab.id, { active: true });
}

export async function openUrlInNewTab(url: string): Promise<chrome.tabs.Tab> {
  return chrome.tabs.create({ url, active: true });
}

export async function openMissingSectionLinks(
  links: StoredLink[],
  tabs: chrome.tabs.Tab[],
): Promise<void> {
  const lastFocused = await chrome.windows.getLastFocused();
  const windowId = lastFocused.id;
  const ordered = [...links].sort((a, b) => a.order - b.order);

  const existingIndexes = ordered
    .map((link) => findTabByUrl(tabs, link.url))
    .filter((tab): tab is chrome.tabs.Tab =>
      Boolean(tab && windowId !== undefined && tab.windowId === windowId),
    )
    .map((tab) => tab.index);

  let nextIndex =
    existingIndexes.length > 0 ? Math.max(...existingIndexes) + 1 : undefined;

  for (const link of ordered) {
    if (findTabByUrl(tabs, link.url)) {
      continue;
    }

    const created = await chrome.tabs.create({
      url: link.url,
      active: false,
      windowId,
      index: nextIndex,
    });

    if (typeof nextIndex === "number") {
      nextIndex += 1;
    } else if (typeof created.index === "number") {
      nextIndex = created.index + 1;
    }
  }
}

export function readSavableTab(tab: chrome.tabs.Tab | undefined): {
  url: string;
  title: string;
  favIconUrl?: string;
} | null {
  if (!tab || !isSavableUrl(tab.url)) {
    return null;
  }

  return {
    url: tab.url,
    title: tab.title?.trim() || tab.url,
    favIconUrl: tab.favIconUrl,
  };
}
