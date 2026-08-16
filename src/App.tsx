import { useMemo, useRef, useState } from "react";
import { AppHeader } from "./components/AppHeader";
import { NewSectionForm } from "./components/NewSectionForm";
import { SectionList } from "./components/SectionList";
import { Toast } from "./components/Toast";
import { useChromeTabs } from "./hooks/useChromeTabs";
import { useTabDockState } from "./hooks/useTabDockState";
import {
  closeTab,
  findTabByUrl,
  focusExistingTab,
  getActiveTab,
  openMissingSectionLinks,
  openUrlInNewTab,
  readSavableTab,
  runtimeForLink,
} from "./services/chromeTabs";
import { getChromePanelSide, PANEL_SIDE_HINT } from "./services/chromeSidePanel";
import { useChromePanelSide } from "./hooks/useChromePanelSide";
import type { PanelSide, StoredLink, ToastMessage } from "./types/tabdock";
import type { LinkPlacement } from "./utils/order";

export default function App() {
  const {
    state,
    loading,
    loadError,
    createSection,
    toggleCollapsed,
    addLink,
    renameLink,
    placeLink,
    removeLink,
    markOpened,
    setPanelSide,
  } = useTabDockState();
  const { tabs, tabsReady } = useChromeTabs();
  const { chromeSide, refreshChromeSide } = useChromePanelSide();
  const [showNewSection, setShowNewSection] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [openingSectionId, setOpeningSectionId] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const toastSeq = useRef(0);

  const runtimeByLinkId = useMemo(() => {
    if (!state) {
      return {};
    }

    return Object.fromEntries(
      state.links.map((link) => [link.id, runtimeForLink(link, tabs)]),
    );
  }, [state, tabs]);

  const showToast = (text: string, tone: ToastMessage["tone"] = "info") => {
    if (toastTimer.current !== undefined) {
      window.clearTimeout(toastTimer.current);
    }
    toastSeq.current += 1;
    const next: ToastMessage = { id: toastSeq.current, text, tone };
    setToast(next);
    toastTimer.current = window.setTimeout(
      () => {
        setToast(null);
      },
      tone === "error" ? 4200 : text === PANEL_SIDE_HINT ? 6500 : 2200,
    );
  };

  const ready = !loading && tabsReady && state !== null;

  const handlePanelSideChange = async (side: PanelSide) => {
    const current = chromeSide ?? state?.panelSide ?? "right";
    try {
      await setPanelSide(side);
      await refreshChromeSide();
      const actual = await getChromePanelSide();
      if (actual === side || current === side) {
        return;
      }
      showToast(PANEL_SIDE_HINT);
    } catch {
      showToast("Не удалось сохранить сторону панели", "error");
    }
  };

  const handleCreateSection = async (name: string) => {
    try {
      await createSection(name);
      setShowNewSection(false);
    } catch {
      showToast("Не удалось создать раздел", "error");
    }
  };

  const handleAddCurrent = async (sectionId: string) => {
    try {
      const tab = await getActiveTab();
      const payload = readSavableTab(tab);
      if (!payload) {
        showToast("Невозможно сохранить текущую вкладку", "error");
        return;
      }

      const result = await addLink(sectionId, payload);
      if (result === "duplicate") {
        showToast("Уже сохранено в этом разделе");
        return;
      }
      showToast("Ссылка добавлена");
    } catch {
      showToast("Не удалось сохранить вкладку", "error");
    }
  };

  const handleOpenLink = async (link: StoredLink) => {
    try {
      const currentTabs = await chrome.tabs.query({});
      const existing = findTabByUrl(currentTabs, link.url);
      if (existing) {
        await focusExistingTab(existing);
      } else {
        await openUrlInNewTab(link.url);
      }
      await markOpened([link.id]);
    } catch {
      showToast("Не удалось открыть страницу", "error");
    }
  };

  const handlePlaceLink = async (linkId: string, sectionId: string, placement: LinkPlacement) => {
    try {
      const result = await placeLink(linkId, sectionId, placement);
      if (result.status === "duplicate") {
        showToast(`Эта ссылка уже есть в разделе «${result.sectionName}»`);
        return;
      }
      if (result.status === "ok" && result.fromSectionId !== result.toSectionId) {
        showToast(`Перемещено в «${result.toSectionName}»`);
      }
    } catch {
      showToast("Не удалось переместить ссылку", "error");
    }
  };

  const handleOpenCopy = async (link: StoredLink) => {
    try {
      await openUrlInNewTab(link.url);
      await markOpened([link.id]);
    } catch {
      showToast("Не удалось открыть копию", "error");
    }
  };

  const handleCloseTab = async (link: StoredLink) => {
    try {
      const currentTabs = await chrome.tabs.query({});
      const existing = findTabByUrl(currentTabs, link.url);
      if (existing?.id === undefined) {
        return;
      }
      await closeTab(existing.id);
    } catch {
      showToast("Не удалось закрыть вкладку", "error");
    }
  };

  const handleRemoveLink = async (linkId: string) => {
    try {
      await removeLink(linkId);
      showToast("Удалено из TabDock");
    } catch {
      showToast("Не удалось удалить ссылку", "error");
    }
  };

  const handleOpenAll = async (sectionId: string) => {
    if (!state) {
      return;
    }

    const sectionLinks = state.links.filter((link) => link.sectionId === sectionId);
    if (sectionLinks.length === 0) {
      return;
    }

    setOpeningSectionId(sectionId);
    try {
      const currentTabs = await chrome.tabs.query({});
      await openMissingSectionLinks(sectionLinks, currentTabs);
      await markOpened(sectionLinks.map((link) => link.id));
    } catch {
      showToast("Не удалось открыть раздел", "error");
    } finally {
      setOpeningSectionId(null);
    }
  };

  return (
    <div className="app">
      <AppHeader
        panelSide={chromeSide ?? state?.panelSide ?? "right"}
        onAddSection={() => setShowNewSection(true)}
        onPanelSideChange={(side) => {
          void handlePanelSideChange(side);
        }}
      />
      {showNewSection && (
        <NewSectionForm
          onCreate={(name) => {
            void handleCreateSection(name);
          }}
          onCancel={() => setShowNewSection(false)}
        />
      )}
      <main className="app-body">
        {!ready && !loadError && <div className="loading-state">Загрузка…</div>}
        {loadError && <div className="loading-state">{loadError}</div>}
        {ready && state && state.sections.length === 0 && (
          <div className="empty-app">
            <p className="empty-title">TabDock пока пуст.</p>
            <p className="empty-copy">
              Создайте первый раздел и добавьте в него страницы, которые хотите держать под
              рукой.
            </p>
            <button
              type="button"
              className="text-button"
              onClick={() => setShowNewSection(true)}
            >
              + Создать раздел
            </button>
          </div>
        )}
        {ready && state && state.sections.length > 0 && (
          <SectionList
            sections={state.sections}
            links={state.links}
            runtimeByLinkId={runtimeByLinkId}
            openingSectionId={openingSectionId}
            onToggle={(sectionId) => {
              void toggleCollapsed(sectionId);
            }}
            onAddCurrent={(sectionId) => {
              void handleAddCurrent(sectionId);
            }}
            onOpenAll={(sectionId) => {
              void handleOpenAll(sectionId);
            }}
            onOpenLink={handleOpenLink}
            onRenameLink={async (linkId, name) => {
              try {
                await renameLink(linkId, name);
              } catch {
                showToast("Не удалось переименовать ссылку", "error");
              }
            }}
            onPlaceLink={handlePlaceLink}
            onOpenCopy={handleOpenCopy}
            onCloseTab={handleCloseTab}
            onRemoveLink={handleRemoveLink}
          />
        )}
      </main>
      <Toast toast={toast} />
    </div>
  );
}
