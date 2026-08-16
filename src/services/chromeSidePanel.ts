import type { PanelSide } from "../types/tabdock";

type SidePanelWithLayout = typeof chrome.sidePanel & {
  getLayout?: () => Promise<{ side?: string }>;
};

export async function getChromePanelSide(): Promise<PanelSide | null> {
  const api = chrome.sidePanel as SidePanelWithLayout;
  if (typeof api.getLayout !== "function") {
    return null;
  }

  try {
    const layout = await api.getLayout();
    if (layout.side === "left" || layout.side === "right") {
      return layout.side;
    }
    return null;
  } catch {
    return null;
  }
}

export const PANEL_SIDE_HINT =
  "Chrome не даёт расширению двигать панель. Смените сторону в шапке панели Chrome или: Настройки → Внешний вид → Боковая панель.";
