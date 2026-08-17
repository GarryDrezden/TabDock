import { useEffect } from "react";

type ImportPreviewProps = {
  fileName: string;
  backupSections: number;
  backupLinks: number;
  currentSections: number;
  currentLinks: number;
  onCancel: () => void;
  onRestore: () => void;
};

export function ImportPreview({
  fileName,
  backupSections,
  backupLinks,
  currentSections,
  currentLinks,
  onCancel,
  onRestore,
}: ImportPreviewProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  return (
    <div className="import-preview" role="dialog" aria-labelledby="import-preview-title">
      <p id="import-preview-title" className="import-preview-title">
        Восстановить резервную копию?
      </p>
      <p className="import-preview-file">{fileName}</p>
      <p>
        В резервной копии: {backupSections} разделов · {backupLinks} ссылок
      </p>
      <p>
        Текущие данные: {currentSections} разделов · {currentLinks} ссылок
      </p>
      <p className="import-preview-warn">
        Текущая структура TabDock будет заменена. Если она нужна, сначала сделайте экспорт.
      </p>
      <div className="import-preview-actions">
        <button type="button" className="text-button import-preview-cancel" onClick={onCancel}>
          Отмена
        </button>
        <button type="button" className="text-button" onClick={onRestore}>
          Восстановить
        </button>
      </div>
    </div>
  );
}
