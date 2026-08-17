import { useEffect, useState } from "react";
import { queryAllTabs } from "../services/chromeTabs";

export function useChromeTabs() {
  const [tabs, setTabs] = useState<chrome.tabs.Tab[]>([]);
  const [focusedWindowId, setFocusedWindowId] = useState<number | undefined>();
  const [tabsReady, setTabsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let debounceId: number | undefined;

    const rememberFocusedWindow = async () => {
      try {
        const last = await chrome.windows.getLastFocused();
        if (!cancelled && last.id !== undefined && last.id !== chrome.windows.WINDOW_ID_NONE) {
          setFocusedWindowId(last.id);
        }
      } catch {
        // Keep the last known focused window if Chrome has no focused window.
      }
    };

    const refresh = async () => {
      try {
        const next = await queryAllTabs();
        if (!cancelled) {
          setTabs(next);
        }
        await rememberFocusedWindow();
      } catch {
        if (!cancelled) {
          setTabs([]);
        }
      } finally {
        if (!cancelled) {
          setTabsReady(true);
        }
      }
    };

    const refreshSoon = () => {
      if (debounceId !== undefined) {
        window.clearTimeout(debounceId);
      }
      debounceId = window.setTimeout(() => {
        void refresh();
      }, 40);
    };

    void refresh();

    const onCreated = () => {
      void refresh();
    };
    const onRemoved = () => {
      void refresh();
    };
    const onActivated = () => {
      refreshSoon();
    };
    const onUpdated = (
      _tabId: number,
      changeInfo: chrome.tabs.TabChangeInfo,
    ) => {
      if (changeInfo.url || changeInfo.status === "complete" || changeInfo.favIconUrl) {
        refreshSoon();
      }
    };
    const onFocusChanged = (windowId: number) => {
      if (windowId !== chrome.windows.WINDOW_ID_NONE) {
        setFocusedWindowId(windowId);
      }
      refreshSoon();
    };

    chrome.tabs.onCreated.addListener(onCreated);
    chrome.tabs.onRemoved.addListener(onRemoved);
    chrome.tabs.onUpdated.addListener(onUpdated);
    chrome.tabs.onActivated.addListener(onActivated);
    chrome.windows.onFocusChanged.addListener(onFocusChanged);

    return () => {
      cancelled = true;
      if (debounceId !== undefined) {
        window.clearTimeout(debounceId);
      }
      chrome.tabs.onCreated.removeListener(onCreated);
      chrome.tabs.onRemoved.removeListener(onRemoved);
      chrome.tabs.onUpdated.removeListener(onUpdated);
      chrome.tabs.onActivated.removeListener(onActivated);
      chrome.windows.onFocusChanged.removeListener(onFocusChanged);
    };
  }, []);

  return { tabs, focusedWindowId, tabsReady };
}
