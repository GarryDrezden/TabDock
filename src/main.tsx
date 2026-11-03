import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { PANEL_PORT_NAME, PANEL_RESTORE_KEY } from "./services/panelRestore";
import "./styles.css";

void chrome.storage.local.set({ [PANEL_RESTORE_KEY]: true });
connectPanelPort();

function connectPanelPort() {
  const port = chrome.runtime.connect({ name: PANEL_PORT_NAME });
  port.onDisconnect.addListener(() => {
    if (!chrome.runtime?.id || document.visibilityState === "hidden") {
      return;
    }
    window.setTimeout(() => {
      if (!chrome.runtime?.id || document.visibilityState === "hidden") {
        return;
      }
      connectPanelPort();
    }, 50);
  });
}

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element is missing");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
