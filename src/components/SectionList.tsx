import type { RuntimeTabInfo, Section, StoredLink } from "../types/tabdock";
import { SectionRow } from "./SectionRow";

type SectionListProps = {
  sections: Section[];
  links: StoredLink[];
  runtimeByLinkId: Record<string, RuntimeTabInfo>;
  openingSectionId: string | null;
  onToggle: (sectionId: string) => void;
  onAddCurrent: (sectionId: string) => void;
  onOpenAll: (sectionId: string) => void;
  onOpenLink: (link: StoredLink) => Promise<void>;
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
}: SectionListProps) {
  const orderedSections = [...sections].sort((a, b) => a.order - b.order);

  return (
    <div className="section-list">
      {orderedSections.map((section) => (
        <SectionRow
          key={section.id}
          section={section}
          links={links.filter((link) => link.sectionId === section.id)}
          runtimeByLinkId={runtimeByLinkId}
          opening={openingSectionId === section.id}
          onToggle={onToggle}
          onAddCurrent={onAddCurrent}
          onOpenAll={onOpenAll}
          onOpenLink={onOpenLink}
        />
      ))}
    </div>
  );
}
