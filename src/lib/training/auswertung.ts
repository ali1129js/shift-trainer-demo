import { istAbnahmeSchritt } from "../vierAugen";
import type { Arbeitsbereich } from "../schema";
import type {
  Ausserplan,
  FreigabeEinstellungen,
  SchrittProtokoll,
  TrainingsSitzung,
  UebergabePruefung,
} from "./schema";

/** Pure aggregation for the training reports. No I/O. */

/**
 * Steps completed out of order: within a section, a step done AFTER a step that comes
 * later in the defined flow.
 */
export function reihenfolgeFehler(
  schritte: readonly SchrittProtokoll[]
): SchrittProtokoll[] {
  const out: SchrittProtokoll[] = [];
  const abschnitte = [...new Set(schritte.map((s) => s.abschnitt))];
  for (const ab of abschnitte) {
    const erledigt = schritte
      .filter((s) => s.abschnitt === ab && s.istNr !== null)
      .sort((a, b) => (a.istNr ?? 0) - (b.istNr ?? 0));
    let maxSoll = 0;
    for (const s of erledigt) {
      if (s.sollNr < maxSoll) out.push(s);
      maxSoll = Math.max(maxSoll, s.sollNr);
    }
  }
  return out;
}

export interface SchichtBericht {
  fehler: SchrittProtokoll[];
  uebersprungen: SchrittProtokoll[];
  blockiert: SchrittProtokoll[];
  reihenfolge: SchrittProtokoll[];
  uebergabeFehlt: UebergabePruefung[];
  uebergabeBeanstandet: UebergabePruefung[];
  ausserplan: Ausserplan[];
  zaehler: {
    schritte: number;
    ok: number;
    fehler: number;
    uebersprungen: number;
    blockiert: number;
    reihenfolge: number;
    uebergabeFehlt: number;
    uebergabeBeanstandet: number;
    ausserplan: number;
    /** Errors counted for release (incl. missed handovers if configured). */
    gewerteteFehler: number;
  };
  /** true if nothing to report. */
  ohneBefund: boolean;
}

export function gewerteteFehler(
  s: TrainingsSitzung,
  e: Pick<FreigabeEinstellungen, "fehlendeUebergabeIstFehler">
): number {
  const f = s.schritte.filter((x) => x.ergebnis === "fehler").length;
  const u = e.fehlendeUebergabeIstFehler
    ? s.uebergaben.filter((x) => x.status === "fehlt").length
    : 0;
  return f + u;
}

export function schichtBericht(
  s: TrainingsSitzung,
  e: Pick<FreigabeEinstellungen, "fehlendeUebergabeIstFehler">
): SchichtBericht {
  const nach = (k: SchrittProtokoll["ergebnis"]) =>
    s.schritte.filter((x) => x.ergebnis === k);
  const fehler = nach("fehler");
  const uebersprungen = nach("uebersprungen");
  const blockiert = nach("blockiert");
  const reihenfolge = reihenfolgeFehler(s.schritte);
  const uebergabeFehlt = s.uebergaben.filter((x) => x.status === "fehlt");
  const uebergabeBeanstandet = s.uebergaben.filter((x) => x.status === "beanstandet");
  const zaehler = {
    schritte: s.schritte.length,
    ok: nach("ok").length,
    fehler: fehler.length,
    uebersprungen: uebersprungen.length,
    blockiert: blockiert.length,
    reihenfolge: reihenfolge.length,
    uebergabeFehlt: uebergabeFehlt.length,
    uebergabeBeanstandet: uebergabeBeanstandet.length,
    ausserplan: s.ausserplan.length,
    gewerteteFehler: gewerteteFehler(s, e),
  };
  return {
    fehler,
    uebersprungen,
    blockiert,
    reihenfolge,
    uebergabeFehlt,
    uebergabeBeanstandet,
    ausserplan: s.ausserplan,
    zaehler,
    ohneBefund:
      fehler.length +
        uebersprungen.length +
        blockiert.length +
        reihenfolge.length +
        uebergabeFehlt.length +
        uebergabeBeanstandet.length +
        s.ausserplan.length ===
      0,
  };
}

export interface Schwachstelle {
  bereich: Arbeitsbereich;
  abschnitt: string;
  schritt: string;
  /** Number of sessions with an error / skip / out-of-order on this step. */
  sitzungen: number;
  daten: string[];
}

/** Steps with problems in at least `minSitzungen` sessions (default 2), most frequent first. */
export function schwachstellen(
  sitzungen: readonly TrainingsSitzung[],
  minSitzungen = 2
): Schwachstelle[] {
  const m = new Map<string, Schwachstelle>();
  for (const s of sitzungen) {
    const reihen = new Set(reihenfolgeFehler(s.schritte));
    const betroffen = new Set<string>();
    for (const x of s.schritte) {
      if (x.ergebnis !== "fehler" && x.ergebnis !== "uebersprungen" && !reihen.has(x))
        continue;
      const k = `${s.bereich}|${x.abschnitt}|${x.schritt}`;
      if (betroffen.has(k)) continue;
      betroffen.add(k);
      const w = m.get(k) ?? {
        bereich: s.bereich,
        abschnitt: x.abschnitt,
        schritt: x.schritt,
        sitzungen: 0,
        daten: [],
      };
      w.sitzungen++;
      w.daten.push(s.datum);
      m.set(k, w);
    }
  }
  return [...m.values()]
    .filter((w) => w.sitzungen >= minSitzungen)
    .sort((a, b) => b.sitzungen - a.sitzungen || a.schritt.localeCompare(b.schritt));
}

export interface Kriterium {
  label: string;
  ist: string;
  soll: string;
  erfuellt: boolean;
}

export interface FreigabeStatus {
  /** Area, or "Gesamt" when Primary/Secondary are released together. */
  umfang: Arbeitsbereich | "Gesamt";
  sitzungen: number;
  auftragsWechsel: number;
  fehlerImFenster: number;
  kriterien: Kriterium[];
  freigabefaehig: boolean;
}

const chronologisch = (a: TrainingsSitzung, b: TrainingsSitzung) =>
  a.datum.localeCompare(b.datum) || a.id.localeCompare(b.id);

export function freigabeStatus(
  sitzungen: readonly TrainingsSitzung[],
  umfang: Arbeitsbereich | "Gesamt",
  e: FreigabeEinstellungen
): FreigabeStatus {
  const liste = sitzungen
    .filter((s) => umfang === "Gesamt" || s.bereich === umfang)
    .sort(chronologisch);
  const auftragsWechsel = liste.reduce((n, s) => n + s.auftragsWechsel, 0);
  const fenster = liste.slice(-e.fensterSitzungen);
  const fehlerImFenster = fenster.reduce((n, s) => n + gewerteteFehler(s, e), 0);
  const kriterien: Kriterium[] = [
    {
      label: "Auftragswechsel",
      ist: String(auftragsWechsel),
      soll: `≥ ${e.minAuftragsWechsel}`,
      erfuellt: auftragsWechsel >= e.minAuftragsWechsel,
    },
    {
      label: `Fehler in den letzten ${e.fensterSitzungen} Sitzungen`,
      ist: String(fehlerImFenster),
      soll: `≤ ${e.maxFehler}`,
      erfuellt: liste.length > 0 && fehlerImFenster <= e.maxFehler,
    },
    {
      label: "Mindestanzahl Sitzungen im Fenster",
      ist: String(fenster.length),
      soll: `≥ ${e.fensterSitzungen}`,
      erfuellt: fenster.length >= e.fensterSitzungen,
    },
  ];
  return {
    umfang,
    sitzungen: liste.length,
    auftragsWechsel,
    fehlerImFenster,
    kriterien,
    freigabefaehig: kriterien.every((k) => k.erfuellt),
  };
}

export interface KennungAkte {
  kennung: string;
  name: string;
  sitzungen: TrainingsSitzung[];
  verlauf: {
    id: string;
    datum: string;
    bereich: Arbeitsbereich;
    auftragsWechsel: number;
    auftragsWechselKumuliert: number;
    gewerteteFehler: number;
  }[];
  auftragsWechselJeBereich: Record<Arbeitsbereich, number>;
  schwachstellen: Schwachstelle[];
  freigaben: FreigabeStatus[];
}

export function kennungAkte(
  alle: readonly TrainingsSitzung[],
  kennung: string,
  e: FreigabeEinstellungen
): KennungAkte {
  const sitzungen = alle.filter((s) => s.kennung === kennung).sort(chronologisch);
  const kum: Record<Arbeitsbereich, number> = { Primary: 0, Secondary: 0 };
  const verlauf = sitzungen.map((s) => {
    kum[s.bereich] += s.auftragsWechsel;
    return {
      id: s.id,
      datum: s.datum,
      bereich: s.bereich,
      auftragsWechsel: s.auftragsWechsel,
      auftragsWechselKumuliert: kum[s.bereich],
      gewerteteFehler: gewerteteFehler(s, e),
    };
  });
  const freigaben = e.getrennteFreigabe
    ? (["Primary", "Secondary"] as const)
        .filter((b) => sitzungen.some((s) => s.bereich === b))
        .map((b) => freigabeStatus(sitzungen, b, e))
    : [freigabeStatus(sitzungen, "Gesamt", e)];
  return {
    kennung,
    name: sitzungen.find((s) => s.name)?.name ?? "",
    sitzungen,
    verlauf,
    auftragsWechselJeBereich: { ...kum },
    schwachstellen: schwachstellen(sitzungen),
    freigaben,
  };
}

export const kennungsVon = (s: readonly TrainingsSitzung[]) =>
  [...new Set(s.map((x) => x.kennung))].sort();

export interface KritischerVerstoss {
  abschnitt: string;
  schritt: string;
  regel: string;
}

/**
 * Critical-rule violations in a training session (shown prominently in the trainer report):
 * a four-eyes release step or the metal detector test was failed or skipped.
 */
export function kritischeVerstoesse(s: TrainingsSitzung): KritischerVerstoss[] {
  const nichtOk = (x: SchrittProtokoll) =>
    x.ergebnis === "fehler" || x.ergebnis === "uebersprungen";
  const out: KritischerVerstoss[] = [];
  for (const x of s.schritte) {
    if (!nichtOk(x)) continue;
    if (istAbnahmeSchritt(x.schritt))
      out.push({
        abschnitt: x.abschnitt,
        schritt: x.schritt,
        regel: "Vier-Augen-Freigabe fehlt oder fehlerhaft",
      });
    else if (x.schritt === "Metalldetektor-Testkörper")
      out.push({
        abschnitt: x.abschnitt,
        schritt: x.schritt,
        regel: "Metalldetektor-Test nicht bestanden oder ausgelassen",
      });
  }
  return out;
}
