import { useRef, useState } from "react";
import type { RuntimeTabInfo, Section, StoredLink } from "../types/tabdock";
import type { DropPlace, LinkPlacement } from "../utils/order";
import { sortSectionsForDisplay } from "../utils/section";
import { SectionRow, type DropHint } from "./SectionRow";

type SectionListProps = {
  sections: Section[];
  links: StoredLink[];
  runtimeByLinkId: Record<string, RuntimeTabInfo>;
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
};

export function SectionList({
  sections,
  links,
  runtimeByLinkId,
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
}: SectionListProps) {
  const [dragSourceId, setDragSourceId] = useState<string | null>(null);
  const [dropHint, setDropHint] = useState<DropHint | null>(null);
  const [sectionDragId, setSectionDragId] = useState<string | null>(null);
  const [reorderHint, setReorderHint] = useState<{ sectionId: string; place: DropPlace } | null>(
    null,
  );
  const dragSourceIdRef = useRef<string | null>(null);
  const dropHintRef = useRef<DropHint | null>(null);
  const sectionDragIdRef = useRef<string | null>(null);
  const reorderHintRef = useRef<{ sectionId: string; place: DropPlace } | null>(null);
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

  const dropLinkAt = (sectionId: string, placement: LinkPlacement) => {
    const sourceId = dragSourceIdRef.current;
    if (!sourceId) {
      return;
    }
    clearLinkDrag();
    void onPlaceLink(sourceId, sectionId, placement);
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
              dropLinkAt(target.sectionId, { kind: "at", targetLinkId: targetId, place });
            } else {
              clearLinkDrag();
            }
          }}
          onLinkDropOnSection={(sectionId) => {
            dropLinkAt(sectionId, { kind: "end" });
          }}
          onLinkDragEnd={clearLinkDrag}
          onSectionDragStart={(sectionId) => {
            clearLinkDrag();
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
    </div>
  );
}
