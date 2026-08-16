import type { Section, TabDockState } from "../types/tabdock";

export const TEMPORARY_SECTION_ID = "temporary";
export const TEMPORARY_SECTION_NAME = "Временное";
export const TEMPORARY_SECTION_ICON = "📥";

export function isTemporarySection(section: Section): boolean {
  return section.kind === "temporary";
}

export function createTemporarySection(): Section {
  return {
    id: TEMPORARY_SECTION_ID,
    name: TEMPORARY_SECTION_NAME,
    icon: TEMPORARY_SECTION_ICON,
    order: 0,
    collapsed: false,
    kind: "temporary",
  };
}

export function findTemporarySection(sections: Section[]): Section | undefined {
  return sections.find(isTemporarySection);
}

export function sortSectionsForDisplay(sections: Section[]): Section[] {
  const user = sections
    .filter((section) => !isTemporarySection(section))
    .sort((a, b) => a.order - b.order);
  const temporary = sections.filter(isTemporarySection);
  return [...user, ...temporary];
}

export function ensureTemporarySection(state: TabDockState): {
  state: TabDockState;
  changed: boolean;
} {
  const existing = state.sections.filter(isTemporarySection);
  if (existing.length === 0) {
    const idTaken = state.sections.some((section) => section.id === TEMPORARY_SECTION_ID);
    const temporary: Section = {
      ...createTemporarySection(),
      id: idTaken ? `${TEMPORARY_SECTION_ID}-${crypto.randomUUID()}` : TEMPORARY_SECTION_ID,
    };
    return {
      state: {
        ...state,
        sections: [...state.sections, temporary],
      },
      changed: true,
    };
  }

  const keepId = existing[0].id;
  let changed = false;
  const sections = state.sections.map((section) => {
    if (section.id === keepId) {
      if (
        section.kind === "temporary" &&
        section.name === TEMPORARY_SECTION_NAME &&
        section.icon === TEMPORARY_SECTION_ICON
      ) {
        return section;
      }
      changed = true;
      return {
        ...section,
        kind: "temporary" as const,
        name: TEMPORARY_SECTION_NAME,
        icon: TEMPORARY_SECTION_ICON,
      };
    }
    if (section.kind === "temporary") {
      changed = true;
      return {
        ...section,
        kind: undefined,
      };
    }
    return section;
  });

  if (!changed) {
    return { state, changed: false };
  }

  return {
    state: {
      ...state,
      sections,
    },
    changed: true,
  };
}
