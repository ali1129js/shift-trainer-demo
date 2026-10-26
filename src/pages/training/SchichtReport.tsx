import { istAbnahmeSchritt, prueferText } from "@/lib/vierAugen";
import { Link } from "wouter";
import { useTraining } from "@/data/training";
import { kritischeVerstoesse, schichtBericht } from "@/lib/training/auswertung";
import { ERGEBNIS_LABEL, type SchrittProtokoll } from "@/lib/training/schema";
import { isoZuDeutsch } from "@/lib/date";
import { ARBEITSBEREICH_LABEL, SCHICHT_LABEL, WECHSELART_LABEL } from "@/lib/schema";

function Liste({
  titel,
  eintraege,
}: {
  titel: string;
  eintraege: { key: string; text: string; detail?: string }[];
}) {
  if (eintraege.length === 0) return null;
  return (
    <section className="a4-block">
      <h3>
        {titel} ({eintraege.length})
      </h3>
      <ul>
        {eintraege.map((e) => (
          <li key={e.key}>
            <strong>{e.text}</strong>
            {e.detail && <span className="a4-detail"> – {e.detail}</span>}
            <span className="a4-lernpunkt">Lernpunkt: ____________________________</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

const schritt = (s: SchrittProtokoll, extra?: string) => ({
  key: `${s.abschnitt}/${s.schritt}`,
  text: `${s.abschnitt} · ${s.sollNr}. ${s.schritt}`,
  detail: [extra, s.bemerkung].filter(Boolean).join(" – ") || undefined,
});

export function SchichtReport({ params }: { params: { id: string } }) {
  const { daten, aendern } = useTraining();
  const s = daten.sitzungen.find((x) => x.id === params.id);
  if (!s)
    return (
      <main className="page">
        <p>
          Sitzung nicht gefunden. <Link href="/training">Zurück</Link>
        </p>
      </main>
    );
  const b = schichtBericht(s, daten.einstellungen);
  const kritisch = kritischeVerstoesse(s);
  const abnahmen = s.schritte.filter((x) => istAbnahmeSchritt(x.schritt));
  const z = b.zaehler;
  return (
    <main className="a4-seite-wrap">
      <div className="no-print row">
        <Link href="/training" className="btn">
          Zurück
        </Link>
        <button className="btn btn--primary" onClick={() => window.print()}>
          Drucken (A4)
        </button>
      </div>
      <article className="a4">
        <header className="a4-kopf">
          <h1>Schichtbericht Einarbeitung</h1>
          <span className="a4-hinweis">
            Nur Abweichungen &amp; Lernpunkte · Simulation (Training)
          </span>
          <dl>
            <dt>Datum</dt>
            <dd>{isoZuDeutsch(s.datum)}</dd>
            <dt>Schicht</dt>
            <dd>{SCHICHT_LABEL[s.schichtTyp]}</dd>
            <dt>Kennung</dt>
            <dd>
              {s.kennung}
              {s.name && ` (${s.name})`}
            </dd>
            <dt>Bereich</dt>
            <dd className={`bereich-${s.bereich}`}>{ARBEITSBEREICH_LABEL[s.bereich]}</dd>
            <dt>Wechselart</dt>
            <dd>
              {WECHSELART_LABEL[s.wechselart]}
              {s.umbau ? " + Formatwechsel" : ""}
            </dd>
            <dt>Abnahme (4 Augen)</dt>
            <dd>
              {abnahmen.length
                ? abnahmen
                    .map(
                      (x) =>
                        `${x.abschnitt}: ${x.pruefer ? prueferText(x.pruefer) : "fehlt"}`
                    )
                    .join(" · ")
                : "–"}
            </dd>
            <dt>Trainer</dt>
            <dd>
              <input
                className="a4-eingabe"
                value={s.trainer}
                placeholder="________________________"
                onChange={(e) =>
                  aendern((sp) => sp.sitzungSpeichern({ ...s, trainer: e.target.value }))
                }
              />
            </dd>
            <dt>Auftragswechsel</dt>
            <dd>{s.auftragsWechsel}</dd>
          </dl>
        </header>
        <section className="a4-zaehler">
          {[
            ["Schritte", `${z.ok}/${z.schritte} OK`],
            ["Fehler", z.fehler],
            ["Übersprungen", z.uebersprungen],
            ["Reihenfolge", z.reihenfolge],
            ["Blockiert", z.blockiert],
            ["Übergabe fehlt", z.uebergabeFehlt],
            ["Übergabe beanstandet", z.uebergabeBeanstandet],
            ["Außerplanmäßig", z.ausserplan],
            ["Gewertete Fehler", z.gewerteteFehler],
          ].map(([l, w]) => (
            <div key={l}>
              <span>{l}</span>
              <strong>{w}</strong>
            </div>
          ))}
        </section>
        {kritisch.length > 0 && (
          <Liste
            titel="⚠ Kritische Regeln verletzt"
            eintraege={kritisch.map((k) => ({
              key: `k/${k.abschnitt}/${k.schritt}/${k.regel}`,
              text: `${k.abschnitt} · ${k.schritt}`,
              detail: k.regel,
            }))}
          />
        )}
        {b.ohneBefund && <p className="a4-ok">Keine Abweichungen in dieser Schicht.</p>}
        <Liste titel="Fehler" eintraege={b.fehler.map((x) => schritt(x))} />
        <Liste
          titel="Übersprungene Schritte"
          eintraege={b.uebersprungen.map((x) => schritt(x))}
        />
        <Liste
          titel="Reihenfolge nicht eingehalten"
          eintraege={b.reihenfolge.map((x) => schritt(x, `als ${x.istNr}. erledigt`))}
        />
        <Liste
          titel={ERGEBNIS_LABEL.blockiert}
          eintraege={b.blockiert.map((x) => schritt(x))}
        />
        <Liste
          titel="Übergabe fehlt"
          eintraege={b.uebergabeFehlt.map((u, i) => ({ key: `f${i}`, text: u.bezug }))}
        />
        <Liste
          titel="Übergabe beanstandet"
          eintraege={b.uebergabeBeanstandet.map((u, i) => ({
            key: `b${i}`,
            text: u.bezug,
            detail: u.text ? `„${u.text}“` : undefined,
          }))}
        />
        <Liste
          titel="Außerplanmäßige Ereignisse"
          eintraege={b.ausserplan.map((a, i) => ({
            key: `a${i}`,
            text: `${a.zeit} Uhr`,
            detail: a.text,
          }))}
        />
        <footer className="a4-fuss">
          <div>Trainer: ______________________ Datum/Unterschrift</div>
          <div>Mitarbeiter ({s.kennung}): ______________________</div>
        </footer>
      </article>
    </main>
  );
}
