import type { StoredLink } from "../types/tabdock";

export type DropPlace = "before" | "after";

export type LinkPlacement =
  | { kind: "end" }
  | { kind: "at"; targetLinkId: string; place: DropPlace };

export function moveItemById<T extends { id: string }>(
  items: T[],
  draggedId: string,
  targetId: string,
  place: DropPlace,
): T[] {
  if (draggedId === targetId) {
    return items;
  }

  const from = items.findIndex((item) => item.id === draggedId);
  const target = items.findIndex((item) => item.id === targetId);
  if (from < 0 || target < 0) {
    return items;
  }

  const next = [...items];
  const [dragged] = next.splice(from, 1);
  let insertAt = next.findIndex((item) => item.id === targetId);
  if (insertAt < 0) {
    return items;
  }
  if (place === "after") {
    insertAt += 1;
  }
  next.splice(insertAt, 0, dragged);
  return next;
}

export function linksInSection(
  links: StoredLink[],
  sectionId: string,
  exceptId?: string,
): StoredLink[] {
  return links
    .filter((link) => link.sectionId === sectionId && link.id !== exceptId)
    .sort((a, b) => a.order - b.order);
}

export function ordersEqual<T extends { id: string; order: number }>(left: T[], right: T[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  return left.every((item, index) => item.id === right[index]?.id && item.order === index);
}
