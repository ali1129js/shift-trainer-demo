import { letzteUebergabe, statistik } from "./ablauf";
import { heuteBerlin } from "./date";
import { EINSTIEG_LABEL, SCHICHT_LABEL, type Schicht } from "./schema";

export const CSV_KOPF = [
  "Datum",
  "Schicht",
  "Linie",
  "Bereich",
  "Einstieg",
  "Kennung",
  "Name",
  "Status",
  "Aufgaben",
  "Erledigt",
  "Blockiert",
  "Uebersprungen",
  "Offen",
  "Fortschritt %",
  "Uebergabe",
  "Uebergabe Kennung",
] as const;

const zelle = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

/** Semicolon CSV, all values quoted, CRLF, UTF-8 BOM (opens correctly in German Excel). */
export function berichtCsv(schichten: readonly Schicht[]): string {
  const zeilen = [CSV_KOPF.map(zelle).join(";")];
  for (const s of schichten) {
    const st = statistik(s);
    const u = letzteUebergabe(s);
    zeilen.push(
      [
        s.datum,
        SCHICHT_LABEL[s.schichtTyp],
        s.linie,
        s.arbeitsbereich,
        EINSTIEG_LABEL[s.einstieg],
        s.gestartet.kennung,
        s.gestartet.name,
        s.abgeschlossen ? "Abgeschlossen" : "Offen",
        st.gesamt,
        st.erledigt,
        st.blockiert,
        st.uebersprungen,
        st.offen,
        st.prozent,
        u ? u.text.replace(/\s+/g, " ").trim() : "",
        u ? u.signiert.kennung : "",
      ]
        .map(zelle)
        .join(";")
    );
  }
  return "\uFEFF" + zeilen.join("\r\n") + "\r\n";
}

export const csvDateiname = (jetzt: Date = new Date()) =>
  `schichtbericht-${heuteBerlin(jetzt)}.csv`;
