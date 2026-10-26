import { Link, useLocation } from "wouter";
import { BereichBadge, Fortschritt, Kpi } from "@/components/Bausteine";
import { useToast } from "@/components/ui/toast";
import { useAktion, useSchichten } from "@/data/hooks";
import { letzteUebergabe, nachStartAbsteigend, statistik, summiere } from "@/lib/ablauf";
import { formatZeitstempel } from "@/lib/date";
import { schichtTitel } from "@/lib/schicht";
import { useTraining } from "@/data/training";
import { demoTrainingsDaten } from "@/lib/training/demo";
import { leereTrainingsDaten } from "@/lib/training/speicher";

export function Uebersicht() {
  const { data: schichten = [] } = useSchichten();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const demo = useAktion((repo) => repo.demoLaden());
  const reset = useAktion((repo) => repo.neuBeginnen());
  const training = useTraining();
  const sortiert = nachStartAbsteigend(schichten);
  const offen = sortiert.filter((s) => !s.abgeschlossen);
  const gesamt = summiere(schichten.map(statistik));
  const mitUebergabe = sortiert.find((s) => letzteUebergabe(s));
  const u = mitUebergabe ? letzteUebergabe(mitUebergabe) : null;

  const fehler = (e: Error) =>
    toast({
      variant: "destructive",
      title: "Aktion fehlgeschlagen",
      description: e.message,
    });

  return (
    <main className="page">
      <section className="hero">
        <span className="eyebrow">Trainingsmodus · Müsliriegel-Verpackung</span>
        <h1>Den Auftragsablauf verstehen – ohne echtes System</h1>
        <p>
          Dieser Trainer bildet die Aufgaben an einer fiktiven Verpackungslinie als
          kaskadierenden Ablauf nach: Jeder Schritt wird erst freigegeben, wenn der
          vorherige erledigt ist. So lernen neue Kolleginnen und Kollegen Reihenfolge und
          Abhängigkeiten gefahrlos in einer Simulation.
        </p>
        <div className="row">
          <Link className="btn btn--green btn--lg" href="/schichten">
            Neue Simulation starten
          </Link>
          <button
            className="btn"
            disabled={demo.isPending}
            onClick={() => {
              if (
                schichten.length === 0 ||
                window.confirm(
                  "Alle Simulationen und Trainingsberichte durch fiktive Demo-Daten ersetzen?"
                )
              ) {
                demo.mutate(undefined, { onError: fehler });
                training.aendern((t) => t.allesErsetzen(demoTrainingsDaten()));
              }
            }}
          >
            Demo-Daten laden
          </button>
          {schichten.length > 0 && (
            <button
              className="btn"
              onClick={() => {
                if (
                  window.confirm(
                    "Trainer zurücksetzen? Alle Simulationen und Trainingsberichte werden entfernt."
                  )
                ) {
                  reset.mutate(undefined, { onError: fehler });
                  training.aendern((t) => t.allesErsetzen(leereTrainingsDaten()));
                }
              }}
            >
              Trainer zurücksetzen
            </button>
          )}
        </div>
      </section>

      <section className="grid2">
        {[
          [
            "1 · Starten",
            "Linie und Schicht wählen. Die Aufgabenvorlage wird als Ablauf in die Simulation kopiert.",
          ],
          [
            "2 · Abarbeiten",
            "Nur der nächste freigegebene Schritt ist bedienbar. Gesperrte Schritte zeigen, worauf sie warten.",
          ],
          [
            "3 · Verstehen",
            "Zu jedem Schritt: Was ist zu tun, und warum hängen spätere Schritte davon ab?",
          ],
        ].map(([t, d]) => (
          <div key={t} className="card stack">
            <h3>{t}</h3>
            <p className="muted">{d}</p>
          </div>
        ))}
      </section>

      <section className="kpis">
        <Kpi label="Simulationen" wert={schichten.length} />
        <Kpi label="Laufend" wert={offen.length} akzent="blue" />
        <Kpi
          label="Schritte erledigt"
          wert={`${gesamt.prozent} %`}
          hinweis={`${gesamt.erledigt} von ${gesamt.gesamt}`}
          akzent="green"
        />
        <Kpi label="Blockiert" wert={gesamt.blockiert} akzent="red" />
      </section>

      <section className="stack">
        <h2>Laufende Simulationen</h2>
        {offen.length === 0 ? (
          <p className="muted">
            Keine laufende Simulation. Starten Sie eine neue oder laden Sie Demo-Daten.
          </p>
        ) : (
          <div className="grid2">
            {offen.map((s) => (
              <button
                key={s.id}
                className="card list-card btn"
                style={{ alignItems: "stretch", textAlign: "left" }}
                onClick={() => navigate(`/schichten/${s.id}`)}
              >
                <strong>{schichtTitel(s)}</strong>
                <BereichBadge bereich={s.arbeitsbereich} />
                <span className="muted small">
                  gestartet von {s.gestartet.name} ({s.gestartet.kennung})
                </span>
                <Fortschritt st={statistik(s)} label="Fortschritt" />
              </button>
            ))}
          </div>
        )}
      </section>

      {u && mitUebergabe && (
        <section className="card stack">
          <span className="eyebrow">Letzte Übergabe-Notiz</span>
          <strong>{schichtTitel(mitUebergabe)}</strong>
          <p>{u.text}</p>
          <span className="muted small">
            {u.signiert.name} · {u.signiert.kennung} ·{" "}
            {formatZeitstempel(u.signiert.zeit)}
          </span>
        </section>
      )}
    </main>
  );
}
