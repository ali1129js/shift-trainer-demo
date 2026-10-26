import {
  AGGREGATION_INHALT,
  hatInhalt,
  type AggregationAbschnitt,
} from "@/lib/aggregation";

function Abschnitt({ a }: { a: AggregationAbschnitt }) {
  return (
    <div>
      <h3>{a.titel}</h3>
      <ul>
        {a.punkte.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      {a.unterabschnitte?.map((u) => (
        <Abschnitt key={u.id} a={u} />
      ))}
      {a.offen && <p className="placeholder small">Offen: {a.offen}</p>}
    </div>
  );
}

/** Reserved page for the Aggregation topic. */
export function Aggregation() {
  return (
    <main className="page">
      <section className="hero">
        <span className="eyebrow">Nachschlagen</span>
        <h1>Aggregation</h1>
        <p>Schulungshilfe – verbindlich sind die Arbeitsanweisungen.</p>
      </section>
      <section className="card stack">
        {hatInhalt() ? (
          AGGREGATION_INHALT.abschnitte.map((a) => <Abschnitt key={a.id} a={a} />)
        ) : (
          <p className="placeholder">Inhalt folgt.</p>
        )}
      </section>
    </main>
  );
}
