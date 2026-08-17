export const LINK_DRAG_TYPE = "application/x-tabdock-link";
export const SECTION_DRAG_TYPE = "application/x-tabdock-section";
export const TAB_DRAG_TYPE = "application/x-tabdock-tab";

export function isSectionDrag(event: { dataTransfer: DataTransfer }): boolean {
  return Array.from(event.dataTransfer.types).includes(SECTION_DRAG_TYPE);
}

export function isTabDrag(event: { dataTransfer: DataTransfer }): boolean {
  return Array.from(event.dataTransfer.types).includes(TAB_DRAG_TYPE);
}
