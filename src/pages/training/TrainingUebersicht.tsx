import { Link } from "wouter";
import { useTraining } from "@/data/training";
import { kennungsVon, gewerteteFehler } from "@/lib/training/auswertung";
import { demoTrainingsDaten } from "@/lib/training/demo";
import {
  PLATZHALTER_EINSTELLUNGEN,
  type FreigabeEinstellungen,
} from "@/lib/training/schema";
import { isoZuDeutsch } from "@/lib/date";
import {
  ARBEITSBEREICH_LABEL,
  ROLLEN,
  ROLLE_LABEL,
  SCHICHT_LABEL,
  type Rolle,
} from "@/lib/schema";

const PH = <span className="platzhalter">PLATZHALTER – noch nicht festgelegt</span>;

export function TrainingUebersicht() {
  const { stand, daten, aendern } = useTraining();
  const e = daten.einstellungen;
  const setze = (neu: Partial<FreigabeEinstellungen>) =>
    aendern((s) => s.einstellungenSpeichern({ ...e, ...neu }));
  const zahl = (
    k: "minAuftragsWechsel" | "maxFehler" | "fensterSitzungen",
    min: number
  ) => (
    <input
      type="number"
      min={min}
      value={e[k]}
      onChange={(ev) => setze({ [k]: Math.max(min, Number(ev.target.value) || 0) })}
    />
  );
  return (
    <main className="page">
      <section className="hero">
        <span className="eyebrow">Einarbeitung</span>
        <h1>Trainingsberichte</h1>
        <p>
          Schichtbericht je Simulation und Trainingsnachweis je Kennung (A4, druckbar).
        </p>
        <div className="row">
          <button
            className="btn"
            onClick={() => aendern((s) => s.allesErsetzen(demoTrainingsDaten()))}
          >
            Fiktive Demo-Sitzungen laden
          </button>
          {!stand.ok && (
            <button className="btn" onClick={() => aendern((s) => s.neuBeginnen())}>
              Neu beginnen (Backup bleibt erhalten)
            </button>
          )}
        </div>
        {!stand.ok && <p className="fehler">{stand.meldung}</p>}
      </section>

      <section className="card">
        <h2>Trainingsnachweise je Kennung</h2>
        {kennungsVon(daten.sitzungen).length === 0 && <p>Noch keine Sitzungen.</p>}
        <ul>
          {kennungsVon(daten.sitzungen).map((c) => (
            <li key={c}>
              <Link href={`/training/kennung/${c}`}>{c}</Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>Sitzungen</h2>
        <table className="tabelle">
          <thead>
            <tr>
              <th>Datum</th>
              <th>Schicht</th>
              <th>Kennung</th>
              <th>Bereich</th>
              <th>Auftragswechsel</th>
              <th>Fehler</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {[...daten.sitzungen]
              .sort((a, b) => b.datum.localeCompare(a.datum))
              .map((s) => (
                <tr key={s.id}>
                  <td>{isoZuDeutsch(s.datum)}</td>
                  <td>{SCHICHT_LABEL[s.schichtTyp]}</td>
                  <td>{s.kennung}</td>
                  <td>{ARBEITSBEREICH_LABEL[s.bereich]}</td>
                  <td>{s.auftragsWechsel}</td>
                  <td>{gewerteteFehler(s, e)}</td>
                  <td>
                    <Link href={`/training/schicht/${s.id}`}>Schichtbericht</Link>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>Freigaberegeln {PH}</h2>
        <p>Beispielhafte Freigaberegeln für die Demo. Alle Werte sind Platzhalter.</p>
        <div className="einstellungen">
          <label>
            Mindestanzahl Auftragswechsel (je Freigabeumfang){" "}
            {zahl("minAuftragsWechsel", 0)}
          </label>
          <label>Max. gewertete Fehler im Bewertungsfenster {zahl("maxFehler", 0)}</label>
          <label>
            Bewertungsfenster (letzte N Sitzungen) {zahl("fensterSitzungen", 1)}
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={e.fehlendeUebergabeIstFehler}
              onChange={(ev) => setze({ fehlendeUebergabeIstFehler: ev.target.checked })}
            />
            Fehlende Übergabe zählt als Fehler
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={e.getrennteFreigabe}
              onChange={(ev) => setze({ getrennteFreigabe: ev.target.checked })}
            />
            Getrennte Freigabe Bereich A / Bereich B
          </label>
          <label>
            Freigabe durch (Rolle)
            <select
              value={e.freigeberRolle}
              onChange={(ev) => setze({ freigeberRolle: ev.target.value as Rolle })}
            >
              {ROLLEN.map((r) => (
                <option key={r} value={r}>
                  {ROLLE_LABEL[r]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button className="btn" onClick={() => setze(PLATZHALTER_EINSTELLUNGEN)}>
          Platzhalter-Standardwerte
        </button>
      </section>
    </main>
  );
}
