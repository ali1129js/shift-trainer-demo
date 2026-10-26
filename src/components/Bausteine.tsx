import type { ReactNode } from "react";
import type { Statistik } from "@/lib/ablauf";
import {
  ARBEITSBEREICH_LABEL,
  STATUS_LABEL,
  type AnzeigeStatus,
  type Arbeitsbereich,
} from "@/lib/schema";

export function Kpi({
  label,
  wert,
  hinweis,
  akzent,
}: {
  label: string;
  wert: ReactNode;
  hinweis?: string;
  akzent?: "green" | "blue" | "red";
}) {
  return (
    <div className={`kpi${akzent ? ` kpi--${akzent}` : ""}`}>
      <span className="muted small">{label}</span>
      <strong>{wert}</strong>
      {hinweis && <span className="muted small">{hinweis}</span>}
    </div>
  );
}

export function Fortschritt({ st, label }: { st: Statistik; label: string }) {
  const p = (n: number) => (st.gesamt ? (n / st.gesamt) * 100 : 0);
  return (
    <div className="stack" style={{ gap: 4 }}>
      <div
        className="progress"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={st.prozent}
      >
        <span className="p-done" style={{ width: `${p(st.erledigt)}%` }} />
        <span className="p-skipped" style={{ width: `${p(st.uebersprungen)}%` }} />
        <span className="p-blocked" style={{ width: `${p(st.blockiert)}%` }} />
      </div>
      <span className="muted small">
        {st.prozent} % · {st.erledigt}/{st.gesamt} erledigt
        {st.blockiert > 0 && ` · ${st.blockiert} blockiert`}
      </span>
    </div>
  );
}

export function StatusBadge({ status }: { status: AnzeigeStatus }) {
  return <span className={`badge badge--${status}`}>{STATUS_LABEL[status]}</span>;
}

/** Area badge: colour plus text label (never colour-only). Primary = blue, Secondary = green. */
export function BereichBadge({ bereich }: { bereich: Arbeitsbereich }) {
  return (
    <span className={`badge badge--${bereich.toLowerCase()}`}>
      {ARBEITSBEREICH_LABEL[bereich]}
    </span>
  );
}
