import type { ToastMessage } from "../types/tabdock";

type ToastProps = {
  toast: ToastMessage | null;
};

export function Toast({ toast }: ToastProps) {
  if (!toast) {
    return null;
  }

  return (
    <div
      className={`toast toast-${toast.tone}`}
      role={toast.tone === "error" ? "alert" : "status"}
    >
      {toast.text}
    </div>
  );
}
