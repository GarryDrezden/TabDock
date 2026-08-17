import type {
  BackupParseResult,
  TabDockBackup,
} from "../types/backup";
import { BACKUP_FORMAT_VERSION, BACKUP_TYPE, MAX_BACKUP_BYTES } from "../types/backup";
import type { Section, StoredLink, TabDockState } from "../types/tabdock";
import { ensureTemporarySection, userSections } from "../utils/section";
import { isSavableUrl } from "../utils/url";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function sortedByOrder<T extends { order: number }>(items: T[]): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((left, right) => left.item.order - right.item.order || left.index - right.index)
    .map(({ item }) => item);
}

export function createBackup(state: TabDockState, appVersion: string): TabDockBackup {
  return {
    type: BACKUP_TYPE,
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion,
    data: {
      version: 1,
      sections: state.sections,
      links: state.links,
      panelSide: state.panelSide,
    },
  };
}

export function serializeBackup(backup: TabDockBackup): string {
  return `${JSON.stringify(backup, null, 2)}\n`;
}

export function backupFilename(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `tabdock-backup-${year}-${month}-${day}.json`;
}

export function parseBackupText(text: string): BackupParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "not-json" };
  }
  return parseBackup(raw);
}

export async function readBackupFile(file: File): Promise<BackupParseResult> {
  if (file.size > MAX_BACKUP_BYTES) {
    return { ok: false, error: "too-large" };
  }

  let text: string;
  try {
    text = await file.text();
  } catch {
    return { ok: false, error: "read" };
  }

  return parseBackupText(text);
}

export function parseBackup(raw: unknown): BackupParseResult {
  if (!isRecord(raw)) {
    return { ok: false, error: "not-backup" };
  }

  if (raw.type !== BACKUP_TYPE) {
    return { ok: false, error: "not-backup" };
  }

  if (!isFiniteNumber(raw.formatVersion)) {
    return { ok: false, error: "damaged" };
  }
  if (raw.formatVersion > BACKUP_FORMAT_VERSION) {
    return { ok: false, error: "future-version" };
  }
  if (raw.formatVersion < 1) {
    return { ok: false, error: "damaged" };
  }

  if (!isRecord(raw.data)) {
    return { ok: false, error: "damaged" };
  }

  const dataVersion = raw.data.version;
  if (dataVersion !== undefined && dataVersion !== 1) {
    if (isFiniteNumber(dataVersion) && dataVersion > 1) {
      return { ok: false, error: "future-version" };
    }
    return { ok: false, error: "damaged" };
  }

  const state = parsePersistentState(raw.data);
  if (!state) {
    return { ok: false, error: "damaged" };
  }

  const backup: TabDockBackup = {
    type: BACKUP_TYPE,
    formatVersion: raw.formatVersion,
    exportedAt: typeof raw.exportedAt === "string" ? raw.exportedAt : new Date().toISOString(),
    appVersion: typeof raw.appVersion === "string" ? raw.appVersion : undefined,
    data: state,
  };

  return { ok: true, backup, state };
}

function parsePersistentState(raw: Record<string, unknown>): TabDockState | null {
  if (!Array.isArray(raw.sections) || !Array.isArray(raw.links)) {
    return null;
  }

  const sections: Section[] = [];
  const sectionIds = new Set<string>();

  for (const item of raw.sections) {
    const section = parseSection(item);
    if (!section || sectionIds.has(section.id)) {
      return null;
    }
    sectionIds.add(section.id);
    sections.push(section);
  }

  const links: StoredLink[] = [];
  const linkIds = new Set<string>();

  for (const item of raw.links) {
    const link = parseLink(item);
    if (!link || linkIds.has(link.id) || !sectionIds.has(link.sectionId)) {
      return null;
    }
    linkIds.add(link.id);
    links.push(link);
  }

  const panelSide = raw.panelSide === "left" || raw.panelSide === "right" ? raw.panelSide : undefined;
  const users = sortedByOrder(userSections(sections)).map((section, index) => ({
    ...section,
    order: index,
  }));
  const temporary = sections.filter((section) => section.kind === "temporary");
  const orderedSections = [...users, ...temporary];
  const reindexedLinks = orderedSections.flatMap((section) =>
    sortedByOrder(links.filter((link) => link.sectionId === section.id)).map((link, index) => ({
      ...link,
      order: index,
    })),
  );

  return ensureTemporarySection({
    version: 1,
    sections: orderedSections,
    links: reindexedLinks,
    panelSide,
  }).state;
}

function parseSection(value: unknown): Section | null {
  if (!isRecord(value) || typeof value.id !== "string" || !value.id.trim()) {
    return null;
  }
  if (typeof value.name !== "string" || !value.name.trim()) {
    return null;
  }
  if (!isFiniteNumber(value.order)) {
    return null;
  }
  if (value.collapsed !== undefined && typeof value.collapsed !== "boolean") {
    return null;
  }
  if (value.kind !== undefined && value.kind !== "user" && value.kind !== "temporary") {
    return null;
  }

  return {
    id: value.id,
    name: value.name.trim(),
    icon: typeof value.icon === "string" && value.icon.trim() ? value.icon.trim() : "📁",
    order: value.order,
    collapsed: Boolean(value.collapsed),
    kind: value.kind === "temporary" ? "temporary" : undefined,
  };
}

function parseLink(value: unknown): StoredLink | null {
  if (!isRecord(value) || typeof value.id !== "string" || !value.id.trim()) {
    return null;
  }
  if (typeof value.sectionId !== "string" || !value.sectionId.trim()) {
    return null;
  }
  if (typeof value.url !== "string" || !isSavableUrl(value.url)) {
    return null;
  }
  if (typeof value.title !== "string") {
    return null;
  }
  if (!isFiniteNumber(value.order)) {
    return null;
  }
  if (value.createdAt !== undefined && !isFiniteNumber(value.createdAt)) {
    return null;
  }
  if (value.lastOpenedAt !== undefined && !isFiniteNumber(value.lastOpenedAt)) {
    return null;
  }
  if (value.customTitle !== undefined && typeof value.customTitle !== "string") {
    return null;
  }
  if (value.favIconUrl !== undefined && typeof value.favIconUrl !== "string") {
    return null;
  }

  const customTitle = typeof value.customTitle === "string" ? value.customTitle.trim() : "";

  return {
    id: value.id,
    sectionId: value.sectionId,
    url: value.url,
    title: value.title,
    customTitle: customTitle || undefined,
    favIconUrl: typeof value.favIconUrl === "string" && value.favIconUrl ? value.favIconUrl : undefined,
    order: value.order,
    createdAt: isFiniteNumber(value.createdAt) ? value.createdAt : 0,
    lastOpenedAt: isFiniteNumber(value.lastOpenedAt) ? value.lastOpenedAt : undefined,
  };
}

export function downloadJsonFile(filename: string, contents: string): void {
  const blob = new Blob([contents], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
