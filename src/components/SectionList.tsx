import { useRef, useState } from "react";
import type { RuntimeTabInfo, Section, StoredLink, UnsavedBrowserTab } from "../types/tabdock";
import type { DropPlace, LinkPlacement } from "../utils/order";
import { sortSectionsForDisplay } from "../utils/section";
import { SectionRow, type DropHint } from "./SectionRow";
import { UnsavedTabsSection } from "./UnsavedTabsSection";

type SectionListProps = {
  sections: Section[];
  links: StoredLink[];
  runtimeByLinkId: Record<string, RuntimeTabInfo>;
  unsavedTabs: UnsavedBrowserTab[];
  openingSectionId: string | null;
  onToggle: (sectionId: string) => void;
  onAddCurrent: (sectionId: string, closeAfter?: boolean) => void;
  onOpenAll: (sectionId: string) => void;
  onOpenLink: (link: StoredLink) => Promise<void>;
  onRenameLink: (linkId: string, name: string) => Promise<void>;
  onPlaceLink: (linkId: string, sectionId: string, placement: LinkPlacement) => Promise<void>;
  onOpenCopy: (link: StoredLink) => Promise<void>;
  onCloseTab: (link: StoredLink) => Promise<void>;
  onRemoveLink: (linkId: string) => Promise<void>;
  onRenameSection: (sectionId: string, name: string) => Promise<void>;
  onSetSectionIcon: (sectionId: string, icon: string) => Promise<void>;
  onCloseSectionTabs: (sectionId: string) => Promise<void>;
  onDeleteSection: (sectionId: string) => Promise<void>;
  onReorderSections: (draggedId: string, targetId: string, place: DropPlace) => Promise<void>;
  onOpenUnsavedTab: (tab: UnsavedBrowserTab) => Promise<void>;
  onAddUnsavedToSection: (tabId: number, sectionId: string) => Promise<void>;
  onPostponeUnsaved: (tabId: number) => Promise<void>;
  onCloseUnsavedTab: (tabId: number) => Promise<void>;
  onDropUnsavedTab: (tabId: number, sectionId: string, placement: LinkPlacement) => Promise<void>;
};

export function SectionList({
  sections,
  links,
  runtimeByLinkId,
  unsavedTabs,
  openingSectionId,
  onToggle,
  onAddCurrent,
  onOpenAll,
  onOpenLink,
  onRenameLink,
  onPlaceLink,
  onOpenCopy,
  onCloseTab,
  onRemoveLink,
  onRenameSection,
  onSetSectionIcon,
  onCloseSectionTabs,
  onDeleteSection,
  onReorderSections,
  onOpenUnsavedTab,
  onAddUnsavedToSection,
  onPostponeUnsaved,
  onCloseUnsavedTab,
  onDropUnsavedTab,
}: SectionListProps) {
  const [dragSourceId, setDragSourceId] = useState<string | null>(null);
  const [dropHint, setDropHint] = useState<DropHint | null>(null);
  const [sectionDragId, setSectionDragId] = useState<string | null>(null);
  const [reorderHint, setReorderHint] = useState<{ sectionId: string; place: DropPlace } | null>(
    null,
  );
  const [tabDragId, setTabDragId] = useState<number | null>(null);
  const dragSourceIdRef = useRef<string | null>(null);
  const dropHintRef = useRef<DropHint | null>(null);
  const sectionDragIdRef = useRef<string | null>(null);
  const reorderHintRef = useRef<{ sectionId: string; place: DropPlace } | null>(null);
  const tabDragIdRef = useRef<number | null>(null);
  const orderedSections = sortSectionsForDisplay(sections);
  const dragSourceSectionId = links.find((link) => link.id === dragSourceId)?.sectionId ?? null;

  const setHint = (hint: DropHint | null) => {
    dropHintRef.current = hint;
    setDropHint(hint);
  };

  const setReorder = (hint: { sectionId: string; place: DropPlace } | null) => {
    reorderHintRef.current = hint;
    setReorderHint(hint);
  };

  const clearLinkDrag = () => {
    dragSourceIdRef.current = null;
    dropHintRef.current = null;
    setDragSourceId(null);
    setDropHint(null);
  };

  const clearSectionDrag = () => {
    sectionDragIdRef.current = null;
    reorderHintRef.current = null;
    setSectionDragId(null);
    setReorderHint(null);
  };

  const clearTabDrag = () => {
    tabDragIdRef.current = null;
    dropHintRef.current = null;
    setTabDragId(null);
    setDropHint(null);
  };

  const dropLinkAt = (sectionId: string, placement: LinkPlacement) => {
    const sourceId = dragSourceIdRef.current;
    if (!sourceId) {
      return;
    }
    clearLinkDrag();
    void onPlaceLink(sourceId, sectionId, placement);
  };

  const dropTabAt = (sectionId: string, placement: LinkPlacement) => {
    const sourceId = tabDragIdRef.current;
    if (sourceId === null) {
      return;
    }
    clearTabDrag();
    void onDropUnsavedTab(sourceId, sectionId, placement);
  };

  const dropAt = (sectionId: string, placement: LinkPlacement) => {
    if (tabDragIdRef.current !== null) {
      dropTabAt(sectionId, placement);
      return;
    }
    dropLinkAt(sectionId, placement);
  };

  return (
    <div className="section-list">
      {orderedSections.map((section) => (
        <SectionRow
          key={section.id}
          section={section}
          links={links.filter((link) => link.sectionId === section.id)}
          sections={sections}
          runtimeByLinkId={runtimeByLinkId}
          opening={openingSectionId === section.id}
          dragSourceId={dragSourceId}
          dragSourceSectionId={dragSourceSectionId}
          dropHint={dropHint}
          sectionDragging={sectionDragId === section.id}
          tabDragging={tabDragId !== null}
          reorderPlace={
            sectionDragId &&
            reorderHint?.sectionId === section.id &&
            sectionDragId !== section.id
              ? reorderHint.place
              : null
          }
          onToggle={onToggle}
          onAddCurrent={onAddCurrent}
          onOpenAll={onOpenAll}
          onOpenLink={onOpenLink}
          onRenameLink={onRenameLink}
          onMoveLink={(linkId, sectionId) => onPlaceLink(linkId, sectionId, { kind: "end" })}
          onOpenCopy={onOpenCopy}
          onCloseTab={onCloseTab}
          onRemoveLink={onRemoveLink}
          onRenameSection={onRenameSection}
          onSetSectionIcon={onSetSectionIcon}
          onCloseSectionTabs={onCloseSectionTabs}
          onDeleteSection={onDeleteSection}
          onLinkDragStart={(linkId) => {
            clearSectionDrag();
            clearTabDrag();
            dragSourceIdRef.current = linkId;
            setDragSourceId(linkId);
          }}
          onLinkDragOver={(linkId, place) => {
            setHint({ type: "link", linkId, place });
          }}
          onLinkOverSection={(sectionId) => {
            setHint({ type: "section", sectionId });
          }}
          onLinkDrop={(targetId) => {
            const target = links.find((link) => link.id === targetId);
            const hint = dropHintRef.current;
            const place = hint?.type === "link" ? hint.place : "before";
            if (target) {
              dropAt(target.sectionId, { kind: "at", targetLinkId: targetId, place });
            } else {
              clearLinkDrag();
              clearTabDrag();
            }
          }}
          onLinkDropOnSection={(sectionId) => {
            dropAt(sectionId, { kind: "end" });
          }}
          onLinkDragEnd={clearLinkDrag}
          onSectionDragStart={(sectionId) => {
            clearLinkDrag();
            clearTabDrag();
            sectionDragIdRef.current = sectionId;
            setSectionDragId(sectionId);
          }}
          onSectionReorderOver={(sectionId, place) => {
            setReorder({ sectionId, place });
          }}
          onSectionReorderDrop={(targetId) => {
            const sourceId = sectionDragIdRef.current;
            const hint = reorderHintRef.current;
            const place = hint?.sectionId === targetId ? hint.place : "before";
            clearSectionDrag();
            if (sourceId) {
              void onReorderSections(sourceId, targetId, place);
            }
          }}
          onSectionDragEnd={clearSectionDrag}
        />
      ))}
      <UnsavedTabsSection
        tabs={unsavedTabs}
        sections={sections}
        draggingTabId={tabDragId}
        onOpen={onOpenUnsavedTab}
        onAddToSection={onAddUnsavedToSection}
        onPostpone={onPostponeUnsaved}
        onCloseTab={onCloseUnsavedTab}
        onDragStart={(tab) => {
          clearLinkDrag();
          clearSectionDrag();
          tabDragIdRef.current = tab.tabId;
          setTabDragId(tab.tabId);
        }}
        onDragEnd={clearTabDrag}
      />
    </div>
  );
}
