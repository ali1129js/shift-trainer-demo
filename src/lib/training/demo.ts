import { istAbnahmeSchritt } from "../vierAugen";
import { VORLAGE, vorlageSchritte } from "../seed";
import { STANDARD_WECHSEL, type WechselKontext } from "../wechselart";
import type { Arbeitsbereich, SchichtTyp } from "../schema";
import {
  PLATZHALTER_EINSTELLUNGEN,
  type Ausserplan,
  type SchrittErgebnis,
  type SchrittProtokoll,
  type TrainingsDaten,
  type TrainingsSitzung,
  type UebergabePruefung,
} from "./schema";

/** Task flow (sections -> steps) of an area, taken from the existing template. */
export function ablaufVon(
  bereich: Arbeitsbereich,
  kontext: WechselKontext = STANDARD_WECHSEL
): { abschnitt: string; schritte: string[] }[] {
  const root = VORLAGE.find((k) => k.name === bereich);
  return (root?.kinder ?? []).map((k) => {
    const name = typeof k === "string" ? k : k.name;
    return { abschnitt: name, schritte: vorlageSchritte(bereich, name, kontext) };
  });
}

interface Abweichung {
  ergebnis?: SchrittErgebnis;
  bemerkung?: string;
  /** Swap completion order with the next step (out-of-order). */
  vertauscht?: boolean;
}

/** Builds a session: every step OK in flow order unless listed in `abw` (key "Abschnitt/Schritt"). */
export function sitzungBauen(p: {
  id: string;
  datum: string;
  schichtTyp: SchichtTyp;
  kennung: string;
  name: string;
  bereich: Arbeitsbereich;
  kontext?: WechselKontext;
  trainer?: string;
  auftragsWechsel: number;
  abw?: Record<string, Abweichung>;
  uebergaben?: UebergabePruefung[];
  ausserplan?: Ausserplan[];
}): TrainingsSitzung {
  const schritte: SchrittProtokoll[] = [];
  for (const { abschnitt, schritte: liste } of ablaufVon(p.bereich, p.kontext)) {
    const reihenfolge = liste.map((_, i) => i);
    liste.forEach((s, i) => {
      if (p.abw?.[`${abschnitt}/${s}`]?.vertauscht && i + 1 < liste.length) {
        const pos = reihenfolge.indexOf(i);
        const pos2 = reihenfolge.indexOf(i + 1);
        reihenfolge[pos] = i + 1;
        reihenfolge[pos2] = i;
      }
    });
    let ist = 0;
    const istNr = new Map<number, number>();
    for (const idx of reihenfolge) {
      const a = p.abw?.[`${abschnitt}/${liste[idx]}`];
      const erg = a?.ergebnis ?? "ok";
      if (erg === "ok" || erg === "fehler") istNr.set(idx, ++ist);
    }
    liste.forEach((s, i) => {
      const a = p.abw?.[`${abschnitt}/${s}`];
      schritte.push({
        abschnitt,
        schritt: s,
        sollNr: i + 1,
        istNr: istNr.get(i) ?? null,
        ergebnis: a?.ergebnis ?? "ok",
        bemerkung: a?.bemerkung ?? "",
        ...(istAbnahmeSchritt(s) && (a?.ergebnis ?? "ok") === "ok"
          ? {
              pruefer: {
                erster: p.kennung,
                zweiter: p.kennung === "WMZQD" ? "JPXNL" : "WMZQD",
              },
            }
          : {}),
      });
    });
  }
  return {
    id: p.id,
    datum: p.datum,
    schichtTyp: p.schichtTyp,
    kennung: p.kennung,
    name: p.name,
    bereich: p.bereich,
    wechselart: (p.kontext ?? STANDARD_WECHSEL).wechselart,
    umbau: (p.kontext ?? STANDARD_WECHSEL).umbau,
    trainer: p.trainer ?? "",
    auftragsWechsel: p.auftragsWechsel,
    schritte,
    uebergaben: p.uebergaben ?? [],
    ausserplan: p.ausserplan ?? [],
  };
}

/** FICTIONAL demo sessions (names from the demo directory; no real training data). */
export function demoSitzungen(): TrainingsSitzung[] {
  const k = { kennung: "QXZTW", name: "Tilda Morgenstern" };
  const h = { kennung: "VBKRY", name: "Okan Feldberg" };
  return [
    sitzungBauen({
      ...k,
      id: "demo-1",
      datum: "2026-10-05",
      schichtTyp: "Frueh",
      bereich: "Primary",
      trainer: "Edda Wintersohl (HTKVX)",
      auftragsWechsel: 2,
      abw: {
        "Schichtstart/Metalldetektor-Testkörper": {
          ergebnis: "fehler",
          bemerkung: "Edelstahl-Testkörper nicht ausgeschleust",
        },
        "Auftragsende/Restmaterial zurückbuchen": { ergebnis: "uebersprungen" },
      },
      uebergaben: [
        { bezug: "Auftragsende · Restmaterial zurückbuchen", status: "fehlt", text: "" },
      ],
    }),
    sitzungBauen({
      ...k,
      id: "demo-2",
      datum: "2026-10-08",
      schichtTyp: "Spaet",
      bereich: "Primary",
      trainer: "Edda Wintersohl (HTKVX)",
      auftragsWechsel: 3,
      abw: {
        "Produktion/MHD- und Chargendruck kontrollieren": {
          ergebnis: "fehler",
          bemerkung: "MHD vom Vortag nicht bemerkt",
        },
        "Auftragswechsel/Folienrolle wechseln": { vertauscht: true },
      },
      uebergaben: [
        {
          bezug: "Produktion · MHD- und Chargendruck kontrollieren",
          status: "ok",
          text: "Drucker neu eingestellt, Packungen seit 14:10 gesperrt",
        },
      ],
    }),
    sitzungBauen({
      ...k,
      id: "demo-3",
      datum: "2026-10-14",
      schichtTyp: "Nacht",
      bereich: "Primary",
      trainer: "Edda Wintersohl (HTKVX)",
      auftragsWechsel: 3,
      abw: {
        "Auftragswechsel/Folienrolle wechseln": { vertauscht: true },
        "Produktion/Siegelnaht-Test": {
          ergebnis: "uebersprungen",
          bemerkung: "Linie lief unruhig",
        },
      },
      uebergaben: [
        { bezug: "Produktion · Siegelnaht-Test", status: "beanstandet", text: "fehlt" },
      ],
      ausserplan: [{ zeit: "02:40", text: "Folienriss – Linie 12 min gestoppt" }],
    }),
    sitzungBauen({
      ...k,
      id: "demo-4",
      datum: "2026-10-20",
      schichtTyp: "Frueh",
      bereich: "Secondary",
      auftragsWechsel: 2,
      abw: {
        "Produktion/Etikett am Karton scannen": {
          ergebnis: "fehler",
          bemerkung: "Etikett des Vorauftrags nicht erkannt",
        },
      },
      uebergaben: [
        { bezug: "Produktion · Etikett am Karton scannen", status: "fehlt", text: "" },
      ],
    }),
    sitzungBauen({
      ...k,
      id: "demo-5",
      datum: "2026-10-23",
      schichtTyp: "Spaet",
      bereich: "Primary",
      trainer: "Edda Wintersohl (HTKVX)",
      auftragsWechsel: 3,
      abw: {
        "Auftragswechsel/Erstmusterfreigabe (Vier-Augen)": {
          ergebnis: "fehler",
          bemerkung: "Freigabe ohne zweite Unterschrift gestartet",
        },
        "Nächster Auftrag/Material bereitstellen": {
          ergebnis: "blockiert",
          bemerkung: "Folienrolle nicht geliefert",
        },
      },
      uebergaben: [
        { bezug: "Nächster Auftrag · Material bereitstellen", status: "fehlt", text: "" },
      ],
      ausserplan: [
        { zeit: "17:05", text: "Rückfrage Qualität zur Charge – 20 min Wartezeit" },
        { zeit: "19:30", text: "Siegelbacke außerplanmäßig gereinigt" },
      ],
    }),
    sitzungBauen({
      ...h,
      id: "demo-6",
      datum: "2026-10-21",
      schichtTyp: "Frueh",
      bereich: "Secondary",
      trainer: "Edda Wintersohl (HTKVX)",
      auftragsWechsel: 6,
    }),
    sitzungBauen({
      ...h,
      id: "demo-7",
      datum: "2026-10-22",
      schichtTyp: "Frueh",
      bereich: "Secondary",
      trainer: "Edda Wintersohl (HTKVX)",
      auftragsWechsel: 5,
    }),
    sitzungBauen({
      ...h,
      id: "demo-8",
      datum: "2026-10-24",
      schichtTyp: "Spaet",
      bereich: "Secondary",
      trainer: "Edda Wintersohl (HTKVX)",
      auftragsWechsel: 2,
    }),
  ];
}

export const demoTrainingsDaten = (): TrainingsDaten => ({
  version: 1,
  sitzungen: demoSitzungen(),
  einstellungen: { ...PLATZHALTER_EINSTELLUNGEN },
});
