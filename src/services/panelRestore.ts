export const PANEL_PORT_NAME = "tabdock-panel";
export const PANEL_RESTORE_KEY = "tabDockRestorePanel";

const PENDING_RESTORE_KEY = "tabDockPendingPanelRestore";
const CLOSE_DELAY_MS = 2000;

let closeTimer: ReturnType<typeof setTimeout> | undefined;
let openPortCount = 0;

type SidePanelEvents = typeof chrome.sidePanel & {
  onOpened?: chrome.events.Event<(info: { windowId: number }) => void>;
  onClosed?: chrome.events.Event<(info: { windowId: number }) => void>;
};

export function rememberPanelOpened(): void {
  if (closeTimer !== undefined) {
    clearTimeout(closeTimer);
    closeTimer = undefined;
  }
  void chrome.storage.local.set({ [PANEL_RESTORE_KEY]: true });
}

export function scheduleRememberPanelClosed(): void {
  if (closeTimer !== undefined) {
    clearTimeout(closeTimer);
  }
  closeTimer = setTimeout(() => {
    closeTimer = undefined;
    if (openPortCount > 0) {
      return;
    }
    void chrome.storage.local.set({ [PANEL_RESTORE_KEY]: false });
  }, CLOSE_DELAY_MS);
}

export function watchPanelLifecycle(): void {
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== PANEL_PORT_NAME) {
      return;
    }
    openPortCount += 1;
    rememberPanelOpened();
    port.onDisconnect.addListener(() => {
      openPortCount = Math.max(0, openPortCount - 1);
      if (openPortCount === 0) {
        scheduleRememberPanelClosed();
      }
    });
  });

  const api = chrome.sidePanel as SidePanelEvents;
  api.onOpened?.addListener(() => {
    rememberPanelOpened();
  });
  api.onClosed?.addListener(() => {
    if (openPortCount === 0) {
      scheduleRememberPanelClosed();
    }
  });
}

export async function restorePanelIfNeeded(windowId?: number): Promise<boolean> {
  const stored = await chrome.storage.local.get(PANEL_RESTORE_KEY);
  if (stored[PANEL_RESTORE_KEY] !== true) {
    return false;
  }

  let id = windowId;
  if (id === undefined) {
    const windows = await chrome.windows.getAll({ windowTypes: ["normal"] });
    const target = windows.find((item) => item.focused) ?? windows[0];
    id = target?.id;
  }
  if (id === undefined) {
    return false;
  }

  try {
    await chrome.sidePanel.open({ windowId: id });
    return true;
  } catch {
    return false;
  }
}

export function watchBrowserStartup(): void {
  chrome.runtime.onStartup.addListener(() => {
    void (async () => {
      const stored = await chrome.storage.local.get(PANEL_RESTORE_KEY);
      if (stored[PANEL_RESTORE_KEY] !== true) {
        return;
      }

      const windows = await chrome.windows.getAll({ windowTypes: ["normal"] });
      if (windows.length === 0) {
        await chrome.storage.session.set({ [PENDING_RESTORE_KEY]: true });
        return;
      }

      await restorePanelIfNeeded();
    })();
  });

  chrome.windows.onCreated.addListener((window) => {
    if (window.type !== "normal" || window.id === undefined) {
      return;
    }

    void (async () => {
      const pending = await chrome.storage.session.get(PENDING_RESTORE_KEY);
      if (pending[PENDING_RESTORE_KEY] !== true) {
        return;
      }
      await chrome.storage.session.remove(PENDING_RESTORE_KEY);
      await restorePanelIfNeeded(window.id);
    })();
  });
}
