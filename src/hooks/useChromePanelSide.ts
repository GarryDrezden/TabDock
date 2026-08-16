import { useCallback, useEffect, useState } from "react";
import { getChromePanelSide } from "../services/chromeSidePanel";
import type { PanelSide } from "../types/tabdock";

export function useChromePanelSide() {
  const [chromeSide, setChromeSide] = useState<PanelSide | null>(null);

  const refreshChromeSide = useCallback(async () => {
    setChromeSide(await getChromePanelSide());
  }, []);

  useEffect(() => {
    void refreshChromeSide();

    const onFocus = () => {
      void refreshChromeSide();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [refreshChromeSide]);

  return { chromeSide, refreshChromeSide };
}
