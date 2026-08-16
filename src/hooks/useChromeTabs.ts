import { useEffect, useState } from "react";
import { queryAllTabs } from "../services/chromeTabs";

export function useChromeTabs() {
  const [tabs, setTabs] = useState<chrome.tabs.Tab[]>([]);
  const [tabsReady, setTabsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let debounceId: number | undefined;

    const refresh = async () => {
      try {
        const next = await queryAllTabs();
        if (!cancelled) {
          setTabs(next);
        }
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
    const onFocusChanged = () => {
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

  return { tabs, tabsReady };
}
