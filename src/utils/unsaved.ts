import type { StoredLink, UnsavedBrowserTab } from "../types/tabdock";
import { isSavableUrl } from "./url";

export function listUnsavedTabs(
  tabs: chrome.tabs.Tab[],
  links: StoredLink[],
  focusedWindowId?: number,
): UnsavedBrowserTab[] {
  const savedUrls = new Set(links.map((link) => link.url));

  return tabs
    .filter((tab): tab is chrome.tabs.Tab & { id: number; url: string } => {
      return tab.id !== undefined && isSavableUrl(tab.url) && !savedUrls.has(tab.url);
    })
    .map((tab) => ({
      tabId: tab.id,
      windowId: tab.windowId,
      index: tab.index,
      url: tab.url,
      title: tab.title?.trim() || tab.url,
      favIconUrl: tab.favIconUrl,
    }))
    .sort((left, right) => compareUnsavedTabs(left, right, focusedWindowId));
}

function compareUnsavedTabs(
  left: UnsavedBrowserTab,
  right: UnsavedBrowserTab,
  focusedWindowId?: number,
): number {
  const leftFocus = focusedWindowId !== undefined && left.windowId === focusedWindowId ? 0 : 1;
  const rightFocus = focusedWindowId !== undefined && right.windowId === focusedWindowId ? 0 : 1;
  if (leftFocus !== rightFocus) {
    return leftFocus - rightFocus;
  }
  if (left.windowId !== right.windowId) {
    return left.windowId - right.windowId;
  }
  return left.index - right.index;
}
