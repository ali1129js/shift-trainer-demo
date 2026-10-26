import { useState } from "react";
import { Link } from "wouter";
import { BereichBadge, Kpi } from "@/components/Bausteine";
import { useSchichten } from "@/data/hooks";
import { nachStartAbsteigend, statistik, summiere } from "@/lib/ablauf";
import { berichtCsv, csvDateiname } from "@/lib/csv";
import { isoZuDeutsch } from "@/lib/date";
import { LINIEN, SCHICHT_LABEL, type Linie } from "@/lib/schema";

function herunterladen(inhalt: string, name: string) {
  const url = URL.createObjectURL(new Blob([inhalt], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/** Minimal report: filter by line, table, CSV export (; with BOM), print. */
export function Berichte() {
  const { data: schichten = [] } = useSchichten();
  const [linie, setLinie] = useState<Linie | "">("");
  const auswahl = nachStartAbsteigend(schichten).filter(
    (s) => !linie || s.linie === linie
  );
  const summe = summiere(auswahl.map(statistik));
  return (
    <main className="page">
      <section className="hero">
        <span className="eyebrow">Auswertung</span>
        <h1>Berichte</h1>
        <p>Simulationen vergleichen und als CSV exportieren.</p>
        <div className="row no-print">
          <button
            className="btn btn--primary"
            disabled={auswahl.length === 0}
            onClick={() => herunterladen(berichtCsv(auswahl), csvDateiname())}
          >
            CSV exportieren
          </button>
          <button className="btn" onClick={() => window.print()}>
            Drucken
          </button>
        </div>
      </section>
      <label className="no-print" style={{ maxWidth: 220 }}>
        Linie
        <select value={linie} onChange={(e) => setLinie(e.target.value as Linie | "")}>
          <option value="">Alle Linien</option>
          {LINIEN.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
      </label>
      <section className="kpis">
        <Kpi label="Simulationen" wert={auswahl.length} />
        <Kpi label="Schritte" wert={summe.gesamt} />
        <Kpi label="Erledigt" wert={`${summe.prozent} %`} akzent="green" />
        <Kpi label="Blockiert" wert={summe.blockiert} akzent="red" />
      </section>
      <section className="card">
        {auswahl.length === 0 ? (
          <p className="muted">Keine Daten für diese Auswahl.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Datum</th>
                <th>Schicht</th>
                <th>Linie</th>
                <th>Bereich</th>
                <th>Kennung</th>
                <th>Status</th>
                <th>Fortschritt</th>
                <th>Blockiert</th>
              </tr>
            </thead>
            <tbody>
              {auswahl.map((s) => {
                const st = statistik(s);
                return (
                  <tr key={s.id}>
                    <td>
                      <Link href={`/schichten/${s.id}`}>{isoZuDeutsch(s.datum)}</Link>
                    </td>
                    <td>{SCHICHT_LABEL[s.schichtTyp]}</td>
                    <td>{s.linie}</td>
                    <td>
                      <BereichBadge bereich={s.arbeitsbereich} />
                    </td>
                    <td>{s.gestartet.kennung}</td>
                    <td>{s.abgeschlossen ? "Abgeschlossen" : "Offen"}</td>
                    <td>
                      {st.prozent} % ({st.erledigt}/{st.gesamt})
                    </td>
                    <td>{st.blockiert}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
