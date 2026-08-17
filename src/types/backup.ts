import type { TabDockState } from "./tabdock";

export const BACKUP_TYPE = "tabdock-backup";
export const BACKUP_FORMAT_VERSION = 1;
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;

export type TabDockBackup = {
  type: typeof BACKUP_TYPE;
  formatVersion: number;
  exportedAt: string;
  appVersion?: string;
  data: TabDockState;
};

export type BackupParseError =
  | "too-large"
  | "read"
  | "not-json"
  | "not-backup"
  | "future-version"
  | "damaged";

export type BackupParseResult =
  | { ok: true; backup: TabDockBackup; state: TabDockState }
  | { ok: false; error: BackupParseError };

export function backupErrorMessage(error: BackupParseError): string {
  switch (error) {
    case "too-large":
    case "read":
      return "Не удалось прочитать файл";
    case "not-json":
      return "Файл не является JSON";
    case "not-backup":
      return "Это не резервная копия TabDock";
    case "future-version":
      return "Эта резервная копия создана более новой версией TabDock";
    case "damaged":
      return "Резервная копия повреждена";
    default:
      return "Резервная копия повреждена";
  }
}
