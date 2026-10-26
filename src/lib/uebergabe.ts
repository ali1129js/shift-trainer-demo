import { bereiche, letztesEreignis } from "./ablauf";
import { bereichKurz, STATUS_LABEL, type Notiz, type Schicht } from "./schema";

/**
 * Handover training logic. The MES only shows what was done – not what was NOT done.
 * Rule: every skipped/blocked task and every ticked event needs a handover note
 * linked to that task, written at or after the triggering moment.
 */

export interface Ausloeser {
  schichtAktivitaetId: number;
  aufgabe: string;
  /** "Übersprungen", "Blockiert" or the event text. */
  anlass: string;
  zeit: string;
}

export function ausloeser(schicht: Schicht): Ausloeser[] {
  const out: Ausloeser[] = [];
  for (const b of bereiche(schicht))
    for (const a of b.aufgaben) {
      const e = letztesEreignis(schicht, a.aktivitaet.id);
      if (e && (e.status === "skipped" || e.status === "blocked"))
        out.push({
          schichtAktivitaetId: a.aktivitaet.id,
          aufgabe: a.aktivitaet.name,
          anlass: STATUS_LABEL[e.status],
          zeit: e.signiert.zeit,
        });
    }
  for (const m of schicht.meldungen) {
    const sa = schicht.aktivitaeten.find((a) => a.id === m.schichtAktivitaetId);
    out.push({
      schichtAktivitaetId: m.schichtAktivitaetId,
      aufgabe: sa?.name ?? "?",
      anlass: m.ereignis,
      zeit: m.signiert.zeit,
    });
  }
  return out;
}

export const uebergabenZu = (schicht: Schicht, schichtAktivitaetId: number): Notiz[] =>
  schicht.notizen.filter(
    (n) => n.art === "handover" && n.aufgabenIds.includes(schichtAktivitaetId)
  );

/** Triggers without a matching handover note ("Dieses Ereignis fehlt in der Übergabe"). */
export function fehlendeUebergaben(schicht: Schicht): Ausloeser[] {
  return ausloeser(schicht).filter(
    (a) =>
      !uebergabenZu(schicht, a.schichtAktivitaetId).some((n) => n.signiert.zeit >= a.zeit)
  );
}

/** Pre-filled handover template for a trigger. */
export function uebergabeVorlage(aufgabe: string, anlass: string): string {
  return `${aufgabe} – ${anlass}.\nWas ist passiert: \nWas muss die nächste Schicht tun: `;
}

/** Handover notes grouped by task (template order); notes without task under "Allgemein". */
export function uebergabenNachAufgabe(
  schicht: Schicht
): { titel: string; schichtAktivitaetId: number | null; notizen: Notiz[] }[] {
  const handover = schicht.notizen.filter((n) => n.art === "handover");
  const gruppen: {
    titel: string;
    schichtAktivitaetId: number | null;
    notizen: Notiz[];
  }[] = [];
  for (const b of bereiche(schicht))
    for (const a of b.aufgaben) {
      const n = handover.filter((x) => x.aufgabenIds.includes(a.aktivitaet.id));
      if (n.length)
        gruppen.push({
          titel: `${bereichKurz(b.rootName)} · ${b.name} · ${a.aktivitaet.name}`,
          schichtAktivitaetId: a.aktivitaet.id,
          notizen: n,
        });
    }
  const allgemein = handover.filter((x) => x.aufgabenIds.length === 0);
  if (allgemein.length)
    gruppen.push({ titel: "Allgemein", schichtAktivitaetId: null, notizen: allgemein });
  return gruppen;
}
