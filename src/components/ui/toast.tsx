import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

export interface ToastDaten {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
}
interface ToastEintrag extends ToastDaten {
  id: number;
}

const ToastContext = createContext<{ toast: (t: ToastDaten) => void } | null>(null);
let zaehler = 0;

/** Minimal toaster. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEintrag[]>([]);
  const entfernen = useCallback(
    (id: number) => setToasts((t) => t.filter((x) => x.id !== id)),
    []
  );
  const toast = useCallback(
    (t: ToastDaten) => {
      const id = ++zaehler;
      setToasts((alt) => [...alt.slice(-2), { ...t, id }]);
      window.setTimeout(() => entfernen(id), t.variant === "destructive" ? 8000 : 4000);
    },
    [entfernen]
  );
  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ol className="toasts no-print" aria-live="polite">
        {toasts.map((t) => (
          <li
            key={t.id}
            role="status"
            className={`toast toast--${t.variant ?? "default"}`}
          >
            <strong>{t.title}</strong>
            {t.description && <p>{t.description}</p>}
            <button type="button" aria-label="Schließen" onClick={() => entfernen(t.id)}>
              ×
            </button>
          </li>
        ))}
      </ol>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const c = useContext(ToastContext);
  if (!c) throw new Error("useToast muss innerhalb von ToastProvider verwendet werden.");
  return c;
}
