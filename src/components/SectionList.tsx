import { useRef, useState } from "react";
import type { RuntimeTabInfo, Section, StoredLink } from "../types/tabdock";
import type { LinkPlacement } from "../utils/order";
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
}: SectionListProps) {
  const [dragSourceId, setDragSourceId] = useState<string | null>(null);
  const [dropHint, setDropHint] = useState<DropHint | null>(null);
  const dragSourceIdRef = useRef<string | null>(null);
  const dropHintRef = useRef<DropHint | null>(null);
  const orderedSections = sortSectionsForDisplay(sections);
  const dragSourceSectionId = links.find((link) => link.id === dragSourceId)?.sectionId ?? null;

  const setHint = (hint: DropHint | null) => {
    dropHintRef.current = hint;
    setDropHint(hint);
  };

  const clearDrag = () => {
    dragSourceIdRef.current = null;
    dropHintRef.current = null;
    setDragSourceId(null);
    setDropHint(null);
  };

  const dropAt = (sectionId: string, placement: LinkPlacement) => {
    const sourceId = dragSourceIdRef.current;
    if (!sourceId) {
      return;
    }
    clearDrag();
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
          onToggle={onToggle}
          onAddCurrent={onAddCurrent}
          onOpenAll={onOpenAll}
          onOpenLink={onOpenLink}
          onRenameLink={onRenameLink}
          onMoveLink={(linkId, sectionId) => onPlaceLink(linkId, sectionId, { kind: "end" })}
          onOpenCopy={onOpenCopy}
          onCloseTab={onCloseTab}
          onRemoveLink={onRemoveLink}
          onDragStart={(linkId) => {
            dragSourceIdRef.current = linkId;
            setDragSourceId(linkId);
          }}
          onLinkDragOver={(linkId, place) => {
            setHint({ type: "link", linkId, place });
          }}
          onSectionDragOver={(sectionId) => {
            setHint({ type: "section", sectionId });
          }}
          onLinkDrop={(targetId) => {
            const target = links.find((link) => link.id === targetId);
            const hint = dropHintRef.current;
            const place = hint?.type === "link" ? hint.place : "before";
            if (target) {
              dropAt(target.sectionId, { kind: "at", targetLinkId: targetId, place });
            } else {
              clearDrag();
            }
          }}
          onSectionDrop={(sectionId) => {
            dropAt(sectionId, { kind: "end" });
          }}
          onDragEnd={clearDrag}
        />
      ))}
    </div>
  );
}
