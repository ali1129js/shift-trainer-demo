import { allergenReinigung } from "@/lib/wechselart";
import { useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { useAuth, useSignieren } from "@/auth";
import { BereichBadge, Fortschritt } from "@/components/Bausteine";
import { useToast } from "@/components/ui/toast";
import { useAktion, useSchichten } from "@/data/hooks";
import { nachStartAbsteigend, statistik } from "@/lib/ablauf";
import { formatZeitstempel, heuteBerlin, schichtAusUhrzeit } from "@/lib/date";
import { schichtTitel, type StartEingabe } from "@/lib/schicht";
import {
  ARBEITSBEREICH_LABEL,
  ARBEITSBEREICHE,
  EINSTIEG_LABEL,
  EINSTIEGE,
  LINIEN,
  SCHICHT_LABEL,
  SCHICHTTYPEN,
  WECHSELART_HILFE,
  WECHSELART_KURZ,
  WECHSELART_LABEL,
  WECHSELARTEN,
  type Wechselart,
  type Arbeitsbereich,
  type Einstieg,
  type Linie,
  type SchichtTyp,
} from "@/lib/schema";

const EINSTIEG_HILFE: Record<Einstieg, string> = {
  auftrag_beginn: "Der Auftrag beginnt in Ihrer Schicht – alle Abschnitte sind offen.",
  laufender_auftrag:
    "Der Auftrag läuft schon: Schichtstart wurde von der Vorschicht erledigt. Übergabe zuerst lesen.",
  auftrag_ende:
    "Der Auftrag ist fast fertig: Schichtstart und Produktion erledigt, Sie übernehmen Auftragsende und den nächsten Auftrag.",
};

export function Schichten() {
  const { data: schichten = [] } = useSchichten();
  const { account } = useAuth();
  const signieren = useSignieren();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [datum, setDatum] = useState(() => heuteBerlin());
  const [typ, setTyp] = useState<SchichtTyp>(() => schichtAusUhrzeit());
  const [linie, setLinie] = useState<Linie>("L1");
  const [arbeitsbereich, setArbeitsbereich] = useState<Arbeitsbereich>("Primary");
  const [einstieg, setEinstieg] = useState<Einstieg>("auftrag_beginn");
  const [wechselart, setWechselart] = useState<Wechselart>("standard");
  const [umbau, setUmbau] = useState(false);
  const reinigung = allergenReinigung({ wechselart, umbau });
  const starten = useAktion((repo, e: StartEingabe) =>
    repo.schichtStarten(e, signieren())
  );

  const absenden = (e: FormEvent) => {
    e.preventDefault();
    if (!datum) {
      toast({ variant: "destructive", title: "Bitte ein Datum auswählen." });
      return;
    }
    starten.mutate(
      {
        datum,
        schichtTyp: typ,
        linie,
        arbeitsbereich,
        einstieg,
        wechselart,
        umbau,
      },
      {
        onSuccess: (s) => navigate(`/schichten/${s.id}`),
        onError: (err) =>
          toast({
            variant: "destructive",
            title: "Start fehlgeschlagen",
            description: err.message,
          }),
      }
    );
  };

  return (
    <main className="page">
      <section className="hero">
        <span className="eyebrow">Trainingsmodus</span>
        <h1>Simulationen</h1>
        <p>
          Starten Sie eine Simulation für eine Linie und Schicht. Der Schichttyp wird aus
          der aktuellen Uhrzeit vorgeschlagen. Jede Aktion wird mit Ihrer Kennung und
          Uhrzeit signiert.
        </p>
      </section>

      <form className="card stack" onSubmit={absenden} noValidate>
        <h2>Neue Simulation starten</h2>
        <p className="muted small">
          Beim Start werden alle aktiven Aktivitäten der Vorlage als unveränderliche
          Momentaufnahme übernommen.
        </p>
        <fieldset className="wahl" aria-label="Bereich">
          <legend>Bereich (Sie arbeiten entweder Bereich A oder Bereich B)</legend>
          {ARBEITSBEREICHE.map((b) => (
            <label key={b} className={`wahl__opt wahl__opt--${b}`}>
              <input
                type="radio"
                name="arbeitsbereich"
                checked={arbeitsbereich === b}
                onChange={() => setArbeitsbereich(b)}
              />
              <span>
                <strong>{ARBEITSBEREICH_LABEL[b]}</strong>
              </span>
            </label>
          ))}
        </fieldset>
        <fieldset className="wahl" aria-label="Einstieg">
          <legend>Einstieg in den Auftrag</legend>
          {EINSTIEGE.map((e) => (
            <label key={e} className="wahl__opt">
              <input
                type="radio"
                name="einstieg"
                checked={einstieg === e}
                onChange={() => setEinstieg(e)}
              />
              <span>
                <strong>{EINSTIEG_LABEL[e]}</strong>
                <span className="muted small">{EINSTIEG_HILFE[e]}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <fieldset className="wahl" aria-label="Wechselart">
          <legend>
            Wechselart (bestimmt die Reinigungsschritte beim Auftragswechsel)
          </legend>
          {WECHSELARTEN.map((w) => (
            <label key={w} className="wahl__opt">
              <input
                type="radio"
                name="wechselart"
                checked={wechselart === w}
                onChange={() => {
                  setWechselart(w);
                }}
              />
              <span>
                <strong>{WECHSELART_LABEL[w]}</strong>
                <span className="muted small">{WECHSELART_HILFE[w]}</span>
              </span>
            </label>
          ))}
          <label className="wahl__opt">
            <input
              type="checkbox"
              checked={umbau}
              onChange={(e) => setUmbau(e.target.checked)}
            />
            <span>
              <strong>zusätzlich Formatwechsel</strong>
              <span className="muted small">
                Andere Packungs- oder Kartongröße – kommt immer zu einer Wechselart dazu (
                {WECHSELART_KURZ[wechselart]} + Formatwechsel).
              </span>
            </span>
          </label>
          <p className="muted small" role="note">
            {reinigung
              ? "Zwischenreinigung immer. Hier zusätzlich Allergenreinigung der Kontaktflächen mit Sichtkontrolle."
              : "Zwischenreinigung immer. Keine Allergenreinigung nötig."}
          </p>
        </fieldset>
        <div className="row" style={{ alignItems: "flex-end" }}>
          <label>
            Datum
            <input
              type="date"
              value={datum}
              onChange={(e) => setDatum(e.target.value)}
              required
            />
          </label>
          <label>
            Schicht
            <select value={typ} onChange={(e) => setTyp(e.target.value as SchichtTyp)}>
              {SCHICHTTYPEN.map((t) => (
                <option key={t} value={t}>
                  {SCHICHT_LABEL[t]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Linie
            <select value={linie} onChange={(e) => setLinie(e.target.value as Linie)}>
              {LINIEN.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
          <label>
            Gestartet von
            <input
              readOnly
              value={account ? `${account.name} (${account.kennung})` : ""}
            />
          </label>
          <button
            className="btn btn--green btn--lg"
            disabled={starten.isPending}
            type="submit"
          >
            Simulation starten
          </button>
        </div>
      </form>

      <section className="stack">
        <h2>Alle Simulationen</h2>
        {schichten.length === 0 && (
          <p className="muted">Noch keine Simulationen vorhanden.</p>
        )}
        {nachStartAbsteigend(schichten).map((s) => (
          <article key={s.id} className="card row">
            <div className="stack" style={{ flex: 1, minWidth: 260, gap: 6 }}>
              <div className="row">
                <strong>{schichtTitel(s)}</strong>
                <BereichBadge bereich={s.arbeitsbereich} />
                <span className="badge">{EINSTIEG_LABEL[s.einstieg]}</span>
                <span className="badge">
                  {WECHSELART_KURZ[s.wechselart]}
                  {s.umbau ? " + Formatwechsel" : ""}
                </span>
                <span className={`badge ${s.abgeschlossen ? "" : "badge--open"}`}>
                  {s.abgeschlossen ? "Abgeschlossen" : "Läuft"}
                </span>
              </div>
              <span className="muted small">
                {s.gestartet.name} ({s.gestartet.kennung}) · gestartet{" "}
                {formatZeitstempel(s.gestartet.zeit)}
              </span>
              <Fortschritt st={statistik(s)} label="Fortschritt" />
            </div>
            <button
              className="btn btn--primary"
              onClick={() => navigate(`/schichten/${s.id}`)}
            >
              Ablauf öffnen
            </button>
          </article>
        ))}
      </section>
    </main>
  );
}
