import { useState } from "react";
import { wissenSuchen } from "@/lib/wissen";

/** Reference page: knowledge cards (invented content). */
export function Wissen() {
  const [q, setQ] = useState("");
  const karten = wissenSuchen(q);
  return (
    <main className="page">
      <section className="hero">
        <span className="eyebrow">Nachschlagen</span>
        <h1>Wissen</h1>
        <p>
          Kurze Wissenskarten zu Hygiene, Kennzeichnung und Übergabe. Alle Inhalte
          erfunden.
        </p>
      </section>
      <div className="row no-print">
        <label style={{ flex: 1 }}>
          Suche
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="z. B. MHD, Allergene, Waage"
          />
        </label>
      </div>
      <div className="wissen-grid">
        {karten.map((k) => (
          <article key={k.id} className="card stack">
            <h2>{k.titel}</h2>
            <p>{k.text}</p>
            <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
              {k.stichworte.map((s) => (
                <span key={s} className="badge">
                  {s}
                </span>
              ))}
            </div>
          </article>
        ))}
        {karten.length === 0 && <p className="muted">Keine Karte gefunden.</p>}
      </div>
    </main>
  );
}
