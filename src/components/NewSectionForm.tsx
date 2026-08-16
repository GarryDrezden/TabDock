import { useEffect, useRef } from "react";

type NewSectionFormProps = {
  onCreate: (name: string) => void;
  onCancel: () => void;
};

export function NewSectionForm({ onCreate, onCancel }: NewSectionFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <form
      className="new-section-form"
      onSubmit={(event) => {
        event.preventDefault();
        const name = inputRef.current?.value ?? "";
        if (!name.trim()) {
          return;
        }
        onCreate(name);
      }}
    >
      <input
        ref={inputRef}
        className="new-section-input"
        type="text"
        placeholder="Название раздела..."
        aria-label="Название раздела"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
          }
        }}
      />
      <button type="submit" className="text-button">
        Создать
      </button>
    </form>
  );
}
