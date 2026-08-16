import type { StoredLink } from "../types/tabdock";

export function displayTitle(link: StoredLink): string {
  const custom = link.customTitle?.trim();
  return custom || link.title;
}
