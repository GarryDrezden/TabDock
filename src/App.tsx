import { useMemo, useRef, useState } from "react";
import { AppHeader } from "./components/AppHeader";
import { ImportPreview } from "./components/ImportPreview";
import { NewSectionForm } from "./components/NewSectionForm";
import { SectionList } from "./components/SectionList";
import { Toast } from "./components/Toast";
import { useChromeTabs } from "./hooks/useChromeTabs";
import { useTabDockState } from "./hooks/useTabDockState";
import {
  closeTab,
  closeTabsMatchingUrls,
  findTabByUrl,
  focusExistingTab,
  getActiveTab,
  getTab,
  openMissingSectionLinks,
  openUrlInNewTab,
  readSavableTab,
  runtimeForLink,
} from "./services/chromeTabs";
import { getChromePanelSide, PANEL_SIDE_HINT } from "./services/chromeSidePanel";
import {
  backupFilename,
  createBackup,
  downloadJsonFile,
  readBackupFile,
  serializeBackup,
} from "./services/backup";
import { loadState } from "./services/storage";
import { backupErrorMessage } from "./types/backup";
import { useChromePanelSide } from "./hooks/useChromePanelSide";
import type { PanelSide, StoredLink, TabDockState, ToastMessage, UnsavedBrowserTab } from "./types/tabdock";
import type { DropPlace, LinkPlacement } from "./utils/order";
import { findTemporarySection, isTemporarySection } from "./utils/section";
import { listUnsavedTabs } from "./utils/unsaved";
import { urlsMatch } from "./utils/url";

export default function App() {
  const {
    state,
    loading,
    loadError,
    createSection,
    toggleCollapsed,
    addLink,
    renameLink,
    renameSection,
    setSectionIcon,
    deleteSection,
    reorderSections,
    placeLink,
    removeLink,
    markOpened,
    setPanelSide,
    replaceState,
  } = useTabDockState();
  const { tabs, focusedWindowId, tabsReady } = useChromeTabs();
  const { chromeSide, refreshChromeSide } = useChromePanelSide();
  const [showNewSection, setShowNewSection] = useState(false);
  const [importPreview, setImportPreview] = useState<{
    fileName: string;
    state: TabDockState;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const unsavedTabs = useMemo(() => {
    if (!state) {
      return [];
    }
    return listUnsavedTabs(tabs, state.links, focusedWindowId);
  }, [focusedWindowId, state, tabs]);

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

  const handleExport = async () => {
    try {
      const fresh = await loadState();
      const backup = createBackup(fresh, chrome.runtime.getManifest().version);
      const json = serializeBackup(backup);
      downloadJsonFile(backupFilename(), json);
      showToast("Резервная копия создана");
    } catch {
      showToast("Не удалось создать резервную копию", "error");
    }
  };

  const handleImportFile = async (file: File | undefined) => {
    if (!file) {
      return;
    }

    try {
      const result = await readBackupFile(file);
      if (!result.ok) {
        showToast(backupErrorMessage(result.error), "error");
        return;
      }
      setImportPreview({ fileName: file.name, state: result.state });
    } catch {
      showToast(backupErrorMessage("read"), "error");
    }
  };

  const handleRestoreBackup = async () => {
    if (!importPreview) {
      return;
    }

    try {
      await replaceState(importPreview.state);
      setImportPreview(null);
      showToast("Резервная копия восстановлена");
    } catch {
      showToast("Не удалось сохранить данные TabDock", "error");
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

  const handleAddCurrent = async (sectionId: string, closeAfter = false) => {
    try {
      const tab = await getActiveTab();
      const tabId = tab?.id;
      const payload = readSavableTab(tab);
      if (!payload) {
        showToast("Эту страницу нельзя сохранить в TabDock", "error");
        return;
      }

      const result = await addLink(sectionId, payload);
      if (!closeAfter) {
        if (result === "duplicate") {
          showToast("Уже сохранено в этом разделе");
          return;
        }
        showToast("Ссылка добавлена");
        return;
      }

      await closeCapturedTab(
        tabId,
        result === "duplicate" ? "Уже сохранено здесь — вкладка закрыта" : "Сохранено и закрыто",
        result === "duplicate" ? "Уже сохранено здесь" : "Сохранено",
      );
    } catch {
      showToast("Не удалось сохранить вкладку", "error");
    }
  };

  const postponeFromTab = async (tab: chrome.tabs.Tab) => {
    if (!state) {
      return;
    }

    const tabId = tab.id;
    const payload = readSavableTab(tab);
    if (!payload) {
      showToast("Эту страницу нельзя сохранить в TabDock", "error");
      return;
    }

    const temporary = findTemporarySection(state.sections);
    if (!temporary) {
      showToast("Не удалось сохранить вкладку", "error");
      return;
    }

    const matches = state.links.filter((link) => urlsMatch(link.url, payload.url));
    const inTemporary = matches.some((link) => link.sectionId === temporary.id);
    const inUser = matches.filter((link) => {
      const section = state.sections.find((item) => item.id === link.sectionId);
      return section ? !isTemporarySection(section) : link.sectionId !== temporary.id;
    });

    let closedMessage = "Отложено";
    let openMessage = "Отложено";

    if (inTemporary) {
      closedMessage = "Уже во «Временном» — вкладка закрыта";
      openMessage = "Уже во «Временном»";
    } else if (inUser.length === 1) {
      const sectionName =
        state.sections.find((section) => section.id === inUser[0]?.sectionId)?.name ?? "разделе";
      closedMessage = `Уже сохранено в «${sectionName}» — вкладка закрыта`;
      openMessage = `Уже сохранено в «${sectionName}»`;
    } else if (inUser.length > 1) {
      closedMessage = "Уже сохранено в TabDock — вкладка закрыта";
      openMessage = "Уже сохранено в TabDock";
    } else {
      const result = await addLink(temporary.id, payload);
      if (result === "duplicate" || result === "already-saved") {
        closedMessage = "Уже во «Временном» — вкладка закрыта";
        openMessage = "Уже во «Временном»";
      }
    }

    await closeCapturedTab(tabId, closedMessage, openMessage);
  };

  const handleDeferCurrent = async () => {
    try {
      const tab = await getActiveTab();
      if (!tab) {
        showToast("Эту страницу нельзя сохранить в TabDock", "error");
        return;
      }
      await postponeFromTab(tab);
    } catch {
      showToast("Не удалось сохранить вкладку", "error");
    }
  };

  const handlePostponeUnsaved = async (tabId: number) => {
    try {
      const tab = await getTab(tabId);
      if (!tab) {
        showToast("Вкладка уже закрыта", "error");
        return;
      }
      await postponeFromTab(tab);
    } catch {
      showToast("Не удалось сохранить вкладку", "error");
    }
  };

  const saveUnsavedTab = async (
    tabId: number,
    sectionId: string,
    placement?: LinkPlacement,
  ) => {
    if (!state) {
      return;
    }

    const tab = await getTab(tabId);
    if (!tab) {
      showToast("Вкладка уже закрыта", "error");
      return;
    }

    const payload = readSavableTab(tab);
    if (!payload) {
      showToast("Эту страницу нельзя сохранить в TabDock", "error");
      return;
    }

    const section = state.sections.find((item) => item.id === sectionId);
    if (!section || isTemporarySection(section)) {
      return;
    }

    const result = await addLink(sectionId, payload, {
      unique: "global",
      placement,
    });
    if (result === "already-saved" || result === "duplicate") {
      showToast("Страница уже сохранена в TabDock");
      return;
    }
    showToast(`Добавлено в «${section.name}»`);
  };

  const handleAddUnsavedToSection = async (tabId: number, sectionId: string) => {
    try {
      await saveUnsavedTab(tabId, sectionId);
    } catch {
      showToast("Не удалось сохранить вкладку", "error");
    }
  };

  const handleDropUnsavedTab = async (
    tabId: number,
    sectionId: string,
    placement: LinkPlacement,
  ) => {
    if (!state) {
      return;
    }

    const section = state.sections.find((item) => item.id === sectionId);
    if (!section) {
      return;
    }

    try {
      if (isTemporarySection(section)) {
        await handlePostponeUnsaved(tabId);
        return;
      }
      await saveUnsavedTab(tabId, sectionId, placement);
    } catch {
      showToast("Не удалось сохранить вкладку", "error");
    }
  };

  const handleOpenUnsavedTab = async (tab: UnsavedBrowserTab) => {
    try {
      const fresh = await getTab(tab.tabId);
      if (!fresh) {
        showToast("Вкладка уже закрыта", "error");
        return;
      }
      await focusExistingTab(fresh);
    } catch {
      showToast("Не удалось перейти к вкладке", "error");
    }
  };

  const handleCloseUnsavedTab = async (tabId: number) => {
    try {
      await closeTab(tabId);
    } catch {
      showToast("Не удалось закрыть вкладку", "error");
    }
  };

  const closeCapturedTab = async (
    tabId: number | undefined,
    closedMessage: string,
    stillOpenMessage: string,
  ) => {
    if (tabId === undefined) {
      showToast(`${stillOpenMessage}. Не удалось закрыть вкладку`, "error");
      return;
    }

    try {
      await closeTab(tabId);
      showToast(closedMessage);
    } catch {
      showToast(`${stillOpenMessage}. Не удалось закрыть вкладку`, "error");
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

  const handleCloseSectionTabs = async (sectionId: string) => {
    if (!state) {
      return;
    }

    const urls = state.links
      .filter((link) => link.sectionId === sectionId)
      .map((link) => link.url);
    if (urls.length === 0) {
      return;
    }

    try {
      const result = await closeTabsMatchingUrls(urls);
      if (result.requested === 0) {
        return;
      }
      if (result.remaining > 0) {
        showToast("Не удалось закрыть все вкладки", "error");
        return;
      }
      const closed = result.requested - result.remaining;
      showToast(closed === 1 ? "Вкладка закрыта" : `Закрыто вкладок: ${closed}`);
    } catch {
      showToast("Не удалось закрыть вкладки раздела", "error");
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    try {
      await deleteSection(sectionId);
      showToast("Раздел удалён");
    } catch {
      showToast("Не удалось удалить раздел", "error");
    }
  };

  const handleReorderSections = async (
    draggedId: string,
    targetId: string,
    place: DropPlace,
  ) => {
    try {
      await reorderSections(draggedId, targetId, place);
    } catch {
      showToast("Не удалось изменить порядок разделов", "error");
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
        onDeferCurrent={() => {
          void handleDeferCurrent();
        }}
        onExport={() => {
          void handleExport();
        }}
        onImport={() => {
          fileInputRef.current?.click();
        }}
        onPanelSideChange={(side) => {
          void handlePanelSideChange(side);
        }}
      />
      <input
        ref={fileInputRef}
        className="visually-hidden"
        type="file"
        accept="application/json,.json"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          void handleImportFile(file);
        }}
      />
      {importPreview && state && (
        <ImportPreview
          fileName={importPreview.fileName}
          backupSections={importPreview.state.sections.length}
          backupLinks={importPreview.state.links.length}
          currentSections={state.sections.length}
          currentLinks={state.links.length}
          onCancel={() => setImportPreview(null)}
          onRestore={() => {
            void handleRestoreBackup();
          }}
        />
      )}
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
        {ready && state && (
          <SectionList
            sections={state.sections}
            links={state.links}
            runtimeByLinkId={runtimeByLinkId}
            unsavedTabs={unsavedTabs}
            openingSectionId={openingSectionId}
            onToggle={(sectionId) => {
              void toggleCollapsed(sectionId);
            }}
            onAddCurrent={(sectionId, closeAfter) => {
              void handleAddCurrent(sectionId, closeAfter);
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
            onRenameSection={async (sectionId, name) => {
              try {
                await renameSection(sectionId, name);
              } catch {
                showToast("Не удалось переименовать раздел", "error");
              }
            }}
            onSetSectionIcon={async (sectionId, icon) => {
              try {
                await setSectionIcon(sectionId, icon);
              } catch {
                showToast("Не удалось изменить иконку", "error");
              }
            }}
            onCloseSectionTabs={handleCloseSectionTabs}
            onDeleteSection={handleDeleteSection}
            onReorderSections={handleReorderSections}
            onOpenUnsavedTab={handleOpenUnsavedTab}
            onAddUnsavedToSection={handleAddUnsavedToSection}
            onPostponeUnsaved={handlePostponeUnsaved}
            onCloseUnsavedTab={handleCloseUnsavedTab}
            onDropUnsavedTab={handleDropUnsavedTab}
          />
        )}
      </main>
      <Toast toast={toast} />
    </div>
  );
}
