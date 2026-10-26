import { ARBEITSBEREICH_LABEL, bereichKurz } from "@/lib/schema";
import { Link } from "wouter";
import { useTraining } from "@/data/training";
import { kennungAkte } from "@/lib/training/auswertung";
import { isoZuDeutsch } from "@/lib/date";
import { ROLLE_LABEL } from "@/lib/schema";

export function KennungAkteSeite({ params }: { params: { kennung: string } }) {
  const { daten } = useTraining();
  const e = daten.einstellungen;
  const a = kennungAkte(daten.sitzungen, params.kennung.toUpperCase(), e);
  if (a.sitzungen.length === 0)
    return (
      <main className="page">
        <p>
          Keine Sitzungen für {params.kennung}. <Link href="/training">Zurück</Link>
        </p>
      </main>
    );
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
          <h1>Trainingsnachweis</h1>
          <span className="a4-hinweis">
            Simulation (Training) · Stand {isoZuDeutsch(a.sitzungen.at(-1)!.datum)}
          </span>
          <dl>
            <dt>Kennung</dt>
            <dd>
              {a.kennung}
              {a.name && ` (${a.name})`}
            </dd>
            <dt>Sitzungen</dt>
            <dd>{a.sitzungen.length}</dd>
            <dt>Auftragswechsel {ARBEITSBEREICH_LABEL.Primary}</dt>
            <dd className="bereich-Primary">{a.auftragsWechselJeBereich.Primary}</dd>
            <dt>Auftragswechsel {ARBEITSBEREICH_LABEL.Secondary}</dt>
            <dd className="bereich-Secondary">{a.auftragsWechselJeBereich.Secondary}</dd>
          </dl>
        </header>

        <section className="a4-block">
          <h3>Fortschritt</h3>
          <table className="a4-tabelle">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Bereich</th>
                <th>Auftragswechsel</th>
                <th>kumuliert</th>
                <th>gew. Fehler</th>
              </tr>
            </thead>
            <tbody>
              {a.verlauf.map((v) => (
                <tr key={v.id}>
                  <td>{isoZuDeutsch(v.datum)}</td>
                  <td>{bereichKurz(v.bereich)}</td>
                  <td>{v.auftragsWechsel}</td>
                  <td>{v.auftragsWechselKumuliert}</td>
                  <td>{v.gewerteteFehler}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="a4-block">
          <h3>Wiederkehrende Schwachstellen (≥ 2 Sitzungen)</h3>
          {a.schwachstellen.length === 0 ? (
            <p>Keine.</p>
          ) : (
            <ul>
              {a.schwachstellen.map((w) => (
                <li key={`${w.bereich}${w.abschnitt}${w.schritt}`}>
                  <strong>
                    {bereichKurz(w.bereich)} · {w.abschnitt} · {w.schritt}
                  </strong>
                  <span className="a4-detail">
                    {" "}
                    – {w.sitzungen}× ({w.daten.map(isoZuDeutsch).join(", ")})
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="a4-block">
          <h3>
            Freigabestatus{" "}
            <span className="platzhalter">
              Regeln = PLATZHALTER, noch nicht festgelegt
            </span>
          </h3>
          <p className="a4-detail">
            Fehlende Übergabe zählt als Fehler:{" "}
            {e.fehlendeUebergabeIstFehler ? "ja" : "nein"} · Getrennte Freigabe Bereich
            A/Bereich B: {e.getrennteFreigabe ? "ja" : "nein"}
          </p>
          {a.freigaben.map((f) => (
            <div key={f.umfang} className="a4-freigabe">
              <h4>
                {bereichKurz(f.umfang)}:{" "}
                <span className={f.freigabefaehig ? "status-ok" : "status-nok"}>
                  {f.freigabefaehig
                    ? "Kriterien erfüllt – freigabefähig"
                    : "Noch nicht freigabefähig"}
                </span>
              </h4>
              <table className="a4-tabelle">
                <thead>
                  <tr>
                    <th>Kriterium</th>
                    <th>Ist</th>
                    <th>Soll</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {f.kriterien.map((k) => (
                    <tr key={k.label}>
                      <td>{k.label}</td>
                      <td>{k.ist}</td>
                      <td>{k.soll}</td>
                      <td>{k.erfuellt ? "✔" : "✘"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </section>

        <footer className="a4-fuss">
          <div>Trainer: ______________________ Datum/Unterschrift</div>
          <div>
            Freigabe ({ROLLE_LABEL[e.freigeberRolle]}): ______________________
            Datum/Unterschrift
          </div>
        </footer>
      </article>
    </main>
  );
}
