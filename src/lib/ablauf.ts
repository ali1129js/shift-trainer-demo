import type {
  AnzeigeStatus,
  AufgabenEreignis,
  Farbe,
  Schicht,
  SchichtAktivitaet,
} from "./schema";

/** Pure cascade engine. No I/O. */

const nachSortierung = (a: SchichtAktivitaet, b: SchichtAktivitaet) =>
  a.sortOrder - b.sortOrder || a.id - b.id;

function kinder(schicht: Schicht, parent: SchichtAktivitaet | null): SchichtAktivitaet[] {
  const pid = parent ? parent.aktivitaetId : null;
  return schicht.aktivitaeten
    .filter((a) => a.parentAktivitaetId === pid)
    .sort(nachSortierung);
}

/** Latest event per task: max time, ties broken by higher id. */
export function letztesEreignis(
  schicht: Schicht,
  schichtAktivitaetId: number
): AufgabenEreignis | null {
  let best: AufgabenEreignis | null = null;
  for (const e of schicht.ereignisse) {
    if (e.schichtAktivitaetId !== schichtAktivitaetId) continue;
    if (
      !best ||
      e.signiert.zeit > best.signiert.zeit ||
      (e.signiert.zeit === best.signiert.zeit && e.id > best.id)
    )
      best = e;
  }
  return best;
}

export function statusVon(schicht: Schicht, schichtAktivitaetId: number): AnzeigeStatus {
  return letztesEreignis(schicht, schichtAktivitaetId)?.status ?? "open";
}

const erledigtOderUebersprungen = (s: AnzeigeStatus) => s === "done" || s === "skipped";

/** Leaf = a snapshot node that is nobody's parent. Only leaves count as tasks. */
export function blaetter(schicht: Schicht): SchichtAktivitaet[] {
  const eltern = new Set(schicht.aktivitaeten.map((a) => a.parentAktivitaetId));
  return schicht.aktivitaeten.filter((a) => !eltern.has(a.aktivitaetId));
}

export interface Statistik {
  gesamt: number;
  erledigt: number;
  blockiert: number;
  uebersprungen: number;
  offen: number;
  /** done / total, rounded; skipped does not count. */
  prozent: number;
}

export function statistik(schicht: Schicht): Statistik {
  const s: Statistik = {
    gesamt: 0,
    erledigt: 0,
    blockiert: 0,
    uebersprungen: 0,
    offen: 0,
    prozent: 0,
  };
  for (const b of blaetter(schicht)) {
    s.gesamt++;
    const st = statusVon(schicht, b.id);
    if (st === "done") s.erledigt++;
    else if (st === "blocked") s.blockiert++;
    else if (st === "skipped") s.uebersprungen++;
    else s.offen++;
  }
  s.prozent = s.gesamt ? Math.round((s.erledigt / s.gesamt) * 100) : 0;
  return s;
}

export function summiere(liste: readonly Statistik[]): Statistik {
  const s = liste.reduce(
    (a, b) => ({
      gesamt: a.gesamt + b.gesamt,
      erledigt: a.erledigt + b.erledigt,
      blockiert: a.blockiert + b.blockiert,
      uebersprungen: a.uebersprungen + b.uebersprungen,
      offen: a.offen + b.offen,
      prozent: 0,
    }),
    { gesamt: 0, erledigt: 0, blockiert: 0, uebersprungen: 0, offen: 0, prozent: 0 }
  );
  s.prozent = s.gesamt ? Math.round((s.erledigt / s.gesamt) * 100) : 0;
  return s;
}

export type SperrGrund = "aufgabe" | null;

export interface AufgabeAnsicht {
  aktivitaet: SchichtAktivitaet;
  schritt: number;
  status: AnzeigeStatus;
  /** Latest event was recorded as "durch Vorschicht erledigt" (shift entry context). */
  vonVorschicht: boolean;
  /** Locked by the in-section dependency (ignoring a supervisor release). */
  kaskadenGesperrt: boolean;
  /** Effectively locked (dependency lock and no release active). */
  gesperrt: boolean;
  grund: SperrGrund;
  gesperrtDurch: string | null;
  /** First unresolved, unlocked step of its section. */
  istNaechste: boolean;
  /** Events, newest first. */
  verlauf: AufgabenEreignis[];
}

export type BereichZustand = "vorschicht" | "abgeschlossen" | "in_arbeit" | "offen";

export interface BereichAnsicht {
  aktivitaet: SchichtAktivitaet;
  name: string;
  rootName: string;
  farbe: Farbe;
  aufgaben: AufgabeAnsicht[];
  gesamt: number;
  erledigt: number;
  blockiert: number;
  vonVorschicht: number;
  komplett: boolean;
  zustand: BereichZustand;
}

/**
 * Bereiche = 2nd-level nodes (roots by sortOrder, then children). Sections are
 * independent: a shift can enter an order at the start, in the middle or near the end.
 * Within a section a step is locked while an earlier step is unresolved (open or
 * blocked); blocked does not resolve. An active supervisor release disables the locks.
 */
export function bereiche(schicht: Schicht): BereichAnsicht[] {
  const freigabe = schicht.freigabe !== null;
  const out: BereichAnsicht[] = [];

  for (const root of kinder(schicht, null)) {
    for (const bereich of kinder(schicht, root)) {
      const tasks = kinder(schicht, bereich);
      let ersteUngeloeste: string | null = null;
      let naechsteVergeben = false;
      const aufgaben: AufgabeAnsicht[] = tasks.map((t, i) => {
        const letztes = letztesEreignis(schicht, t.id);
        const status = letztes?.status ?? "open";
        const grund: SperrGrund = ersteUngeloeste !== null ? "aufgabe" : null;
        const durch = ersteUngeloeste;
        if (!erledigtOderUebersprungen(status) && ersteUngeloeste === null)
          ersteUngeloeste = t.name;
        const gesperrt = grund !== null && !freigabe;
        const istNaechste =
          !naechsteVergeben && !gesperrt && !erledigtOderUebersprungen(status);
        if (istNaechste) naechsteVergeben = true;
        const verlauf = schicht.ereignisse
          .filter((e) => e.schichtAktivitaetId === t.id)
          .sort((a, b) => b.signiert.zeit.localeCompare(a.signiert.zeit) || b.id - a.id);
        return {
          aktivitaet: t,
          schritt: i + 1,
          status,
          vonVorschicht: letztes?.durchVorschicht ?? false,
          kaskadenGesperrt: grund !== null,
          gesperrt,
          grund,
          gesperrtDurch: durch,
          istNaechste,
          verlauf,
        };
      });
      const komplett =
        aufgaben.length > 0 && aufgaben.every((a) => erledigtOderUebersprungen(a.status));
      const vonVorschicht = aufgaben.filter((a) => a.vonVorschicht).length;
      const begonnen = aufgaben.some((a) => a.status !== "open");
      out.push({
        aktivitaet: bereich,
        name: bereich.name,
        rootName: root.name,
        farbe: bereich.farbe,
        aufgaben,
        gesamt: aufgaben.length,
        erledigt: aufgaben.filter((a) => a.status === "done").length,
        blockiert: aufgaben.filter((a) => a.status === "blocked").length,
        vonVorschicht,
        komplett,
        zustand:
          komplett && vonVorschicht === aufgaben.length
            ? "vorschicht"
            : komplett
              ? "abgeschlossen"
              : begonnen
                ? "in_arbeit"
                : "offen",
      });
    }
  }
  return out;
}

/** Default selection: first incomplete Bereich, else the first. */
export function standardBereich(liste: readonly BereichAnsicht[]): number | null {
  return (liste.find((b) => !b.komplett) ?? liste[0])?.aktivitaet.id ?? null;
}

export function findeAufgabe(
  schicht: Schicht,
  schichtAktivitaetId: number
): AufgabeAnsicht | null {
  for (const b of bereiche(schicht))
    for (const a of b.aufgaben) if (a.aktivitaet.id === schichtAktivitaetId) return a;
  return null;
}

/** Newest handover note of a shift. */
export function letzteUebergabe(schicht: Schicht) {
  return (
    [...schicht.notizen]
      .filter((n) => n.art === "handover")
      .sort((a, b) => b.signiert.zeit.localeCompare(a.signiert.zeit) || b.id - a.id)[0] ??
    null
  );
}

/** Shifts newest first (by start time). */
export function nachStartAbsteigend(schichten: readonly Schicht[]): Schicht[] {
  return [...schichten].sort(
    (a, b) => b.gestartet.zeit.localeCompare(a.gestartet.zeit) || b.id - a.id
  );
}
