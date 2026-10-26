import { istAbnahmeSchritt } from "./vierAugen";
import { bereiche } from "./ablauf";
import {
  heuteBerlin,
  schichtAusUhrzeit,
  stundeBerlin,
  tageAddieren,
  zeitpunktBerlin,
} from "./date";
import { DEMO_VERZEICHNIS } from "./identitaet";
import {
  ereignisMelden,
  notizErfassen,
  freigabeSetzen,
  schichtAbschliessen,
  schichtStarten,
  statusMelden,
} from "./schicht";
import { giltFuer, STANDARD_WECHSEL, type WechselKontext } from "./wechselart";
import type {
  Bedingung,
  Aktivitaet,
  Arbeitsbereich,
  AufgabenStatus,
  Einstieg,
  Datenbank,
  Farbe,
  Linie,
  NotizArt,
  SchichtTyp,
  Signatur,
} from "./schema";

export interface Knoten {
  name: string;
  farbe?: Farbe;
  /** Only applies to some change types / only with a format change. */
  bedingung?: Bedingung;
  kinder?: (Knoten | string)[];
}

/** Shorthands for conditional template steps. */
const nurUmbau = (name: string): Knoten => ({ name, bedingung: { umbau: true } });
/** Only when an allergen cleaning is required (allergen change or format change). */
const nurAllergen = (name: string): Knoten => ({ name, bedingung: { reinigung: true } });

/**
 * Bump whenever VORLAGE changes. Stored databases with an older template get the
 * current template on load (shift snapshots are untouched).
 */
export const VORLAGE_VERSION = 1;

/** Release step that needs the four-eyes check (Bereich A). */
export const FREIGABE_SCHRITT = "Erstmusterfreigabe (Vier-Augen)";

/** Activity template: roots (areas) → sections (Bereiche) → tasks. All content invented. */
export const VORLAGE: Knoten[] = [
  {
    name: "Primary",
    farbe: "blue",
    kinder: [
      {
        name: "Schichtstart",
        kinder: [
          "Übergabenotiz lesen",
          "Persönliche Hygiene prüfen",
          "Linie frei von Vorprodukt",
          "Arbeitsplatz sauber und ordentlich",
          "Sicherheitseinrichtungen prüfen",
          "Metalldetektor-Testkörper",
          "Kontrollwaage nullen",
        ],
      },
      {
        name: "Produktion",
        kinder: [
          "Erste Packungen prüfen",
          "Stündliche Gewichtskontrolle",
          "MHD- und Chargendruck kontrollieren",
          "Siegelnaht-Test",
          "Ausschuss zählen",
          "Folienvorrat prüfen",
        ],
      },
      {
        name: "Auftragsende",
        kinder: [
          "Letzte Packung markieren",
          "Mengen erfassen",
          "Restmaterial zurückbuchen",
          "Auftragsdokumentation prüfen",
          "Auftrag abschließen",
        ],
      },
      {
        name: "Auftragswechsel",
        kinder: [
          "Linie leerfahren",
          "Folienrolle wechseln",
          nurAllergen("Allergenreinigung"),
          "Datumsdruck umstellen",
          nurUmbau("Formatteile prüfen"),
          FREIGABE_SCHRITT,
        ],
      },
      {
        name: "Nächster Auftrag",
        kinder: [
          "Auftrag auswählen",
          "Material bereitstellen",
          "Allergenstatus abgleichen",
          "Anlagenparameter laden",
          "Freigabe prüfen",
          "Produktion starten",
        ],
      },
    ],
  },
  {
    name: "Secondary",
    farbe: "green",
    kinder: [
      {
        name: "Schichtstart",
        kinder: [
          "Übergabenotiz lesen",
          "Persönliche Hygiene prüfen",
          "Kartonierer frei von Vorprodukt",
          "Sicherheitseinrichtungen prüfen",
          "Etikettendrucker Probedruck",
          "Stretchfolie und Paletten bereitstellen",
        ],
      },
      {
        name: "Produktion",
        kinder: [
          "Etikett am Karton scannen",
          "Kartonverschluss prüfen",
          "Packschema der Palette prüfen",
          "Palettenetikett anbringen",
          "Störung erfassen",
          "Kartonvorrat prüfen",
        ],
      },
      {
        name: "Auftragsende",
        kinder: [
          "Letzte Palette abschließen",
          "Rückstellmuster ablegen",
          "Restkartons zurückbuchen",
          "Mengen abgleichen",
          "Übergabeprotokoll ergänzen",
        ],
      },
      {
        name: "Auftragswechsel",
        kinder: [
          "Kartonierer leerfahren",
          "Kartonetiketten tauschen",
          nurUmbau("Kartonformat umstellen"),
          "Palettenfreigabe (Vier-Augen)",
        ],
      },
      {
        name: "Nächster Auftrag",
        kinder: [
          "Kartons und Etiketten bereitstellen",
          "Packschema laden",
          "Freigabe aus Bereich A prüfen",
          "Kartonierer starten",
        ],
      },
    ],
  },
];

/** Builds template activities depth-first; colour inherits from the parent (root fallback gray). */
export function vorlageAktivitaeten(startId = 1): Aktivitaet[] {
  const out: Aktivitaet[] = [];
  let id = startId;
  const lauf = (k: Knoten | string, parent: Aktivitaet | null, idx: number) => {
    const knoten: Knoten = typeof k === "string" ? { name: k } : k;
    const a: Aktivitaet = {
      id: id++,
      name: knoten.name,
      farbe: knoten.farbe ?? parent?.farbe ?? "gray",
      parentId: parent?.id ?? null,
      sortOrder: idx,
      archiviert: false,
      ...(knoten.bedingung ? { bedingung: knoten.bedingung } : {}),
    };
    out.push(a);
    (knoten.kinder ?? []).forEach((c, i) => lauf(c, a, i));
  };
  VORLAGE.forEach((k, i) => lauf(k, null, i));
  return out;
}

export function leereDatenbank(): Datenbank {
  const aktivitaeten = vorlageAktivitaeten(1);
  return {
    version: 1,
    vorlageVersion: VORLAGE_VERSION,
    nextId: aktivitaeten.length + 1,
    aktivitaeten,
    schichten: [],
  };
}

/**
 * Replaces an outdated stored template with the current one (new ids from nextId, so
 * no id collides with existing shift snapshots). Returns the same object if current.
 */
export function vorlageAktualisieren(db: Datenbank): Datenbank {
  if (db.vorlageVersion === VORLAGE_VERSION) return db;
  const aktivitaeten = vorlageAktivitaeten(db.nextId);
  return {
    ...db,
    vorlageVersion: VORLAGE_VERSION,
    aktivitaeten,
    nextId: db.nextId + aktivitaeten.length,
  };
}

/** Template steps of one Bereich that apply to a run context (names, in order). */
export function vorlageSchritte(
  haupt: string,
  bereich: string,
  k: WechselKontext = STANDARD_WECHSEL
): string[] {
  const root = VORLAGE.find((x) => x.name === haupt);
  const b = root?.kinder?.find(
    (x): x is Knoten => typeof x !== "string" && x.name === bereich
  );
  return (b?.kinder ?? [])
    .map((c) => (typeof c === "string" ? { name: c } : c))
    .filter((c) => giltFuer(c.bedingung, k))
    .map((c) => c.name);
}

const person = (kennung: string) => {
  const p = DEMO_VERZEICHNIS.find((v) => v.kennung === kennung);
  if (!p) throw new Error(`Demo-Person ${kennung} fehlt`);
  return p;
};
const sig = (kennung: string, zeit: Date): Signatur => {
  const p = person(kennung);
  return { kennung: p.kennung, name: p.name, rolle: p.rolle, zeit: zeit.toISOString() };
};

type Schritt =
  | {
      typ: "status";
      anzahl: number;
      blockiertBei?: number;
      /** Block when this task is reached (instead of counting). */
      blockiertAn?: string;
      blockNotiz?: string;
    }
  | { typ: "notiz"; art: NotizArt; text: string; kennung?: string; aufgabe?: string }
  | { typ: "meldung"; aufgabe: string; ereignis: string }
  | { typ: "freigabe"; kennung: string; grund: string }
  | { typ: "freigabeEnde"; kennung: string }
  | { typ: "abschluss" };

interface Szenario {
  tagOffset: number;
  schichtTyp: SchichtTyp;
  linie: Linie;
  arbeitsbereich: Arbeitsbereich;
  einstieg: Einstieg;
  kennung: string;
  schritte: Schritt[];
}

const START_STUNDE: Record<SchichtTyp, number> = { Frueh: 6, Spaet: 14, Nacht: 22 };

/** Closed demo shifts (fake data). Status steps follow the cascade. */
const SZENARIEN: Szenario[] = [
  {
    tagOffset: -3,
    schichtTyp: "Frueh",
    linie: "L3",
    arbeitsbereich: "Primary",
    einstieg: "auftrag_beginn",
    kennung: "QXZTW",
    schritte: [
      { typ: "status", anzahl: 99 },
      {
        typ: "notiz",
        art: "info",
        text: "Neue Folienrollen für Auftrag A3-2026-0413 im Lager bereitgestellt.",
      },
      {
        typ: "notiz",
        art: "handover",
        text: "Auftrag A3-2026-0412 komplett gelaufen. Metalldetektor-Tests ohne Befund, Ausschuss im Normalbereich.",
      },
      { typ: "abschluss" },
    ],
  },
  {
    tagOffset: -2,
    schichtTyp: "Spaet",
    linie: "L3",
    arbeitsbereich: "Primary",
    einstieg: "laufender_auftrag",
    kennung: "VBKRY",
    schritte: [
      { typ: "status", anzahl: 3 },
      { typ: "meldung", aufgabe: "Siegelnaht-Test", ereignis: "Folienriss" },
      {
        typ: "freigabe",
        kennung: "JPXNL",
        grund: "Folienriss behoben, Nachprüfung durch Linienleitung erfolgt.",
      },
      { typ: "status", anzahl: 4 },
      { typ: "freigabeEnde", kennung: "JPXNL" },
      {
        typ: "notiz",
        art: "handover",
        aufgabe: "Siegelnaht-Test",
        text: "Siegelbacke nach Folienriss neu eingestellt. Bitte Siegelnaht in der nächsten Stunde zweimal prüfen.",
      },
      { typ: "abschluss" },
    ],
  },
  {
    tagOffset: -1,
    schichtTyp: "Frueh",
    linie: "L3",
    arbeitsbereich: "Secondary",
    einstieg: "laufender_auftrag",
    kennung: "ZGPMX",
    schritte: [
      { typ: "status", anzahl: 4 },
      {
        typ: "notiz",
        art: "handover",
        aufgabe: "Packschema der Palette prüfen",
        text: "Bereich B: Etiketten geprüft, Packschema korrekt. Kartonvorrat für ca. 2 Stunden.",
      },
      { typ: "abschluss" },
    ],
  },
];

/**
 * Demo database: template + three closed shifts + two open shifts (Bereich A and B
 * on L3) that started about 70 minutes before `jetzt`. All names/Kennungen are fictitious.
 */
export function demoDatenbank(jetzt: Date = new Date()): Datenbank {
  let db = leereDatenbank();
  const heute = heuteBerlin(jetzt);

  const aufgabeId = (id: number, name: string) => {
    const a = db.schichten
      .find((x) => x.id === id)!
      .aktivitaeten.find((x) => x.name === name);
    if (!a) throw new Error(`Demo-Aufgabe ${name} fehlt`);
    return a.id;
  };

  const ausfuehren = (id: number, kennung: string, start: Date, schritte: Schritt[]) => {
    let t = start.getTime() + 5 * 60000;
    const tick = (min = 7) => new Date((t += min * 60000));
    for (const s of schritte) {
      if (s.typ === "status") {
        for (let i = 0; i < s.anzahl; i++) {
          const schicht = db.schichten.find((x) => x.id === id)!;
          const naechste = bereiche(schicht)
            .flatMap((b) => b.aufgaben)
            .find((a) => !a.gesperrt && a.status === "open");
          if (!naechste) break;
          const blockiert =
            s.blockiertBei === i + 1 || s.blockiertAn === naechste.aktivitaet.name;
          const status: AufgabenStatus = blockiert ? "blocked" : "done";
          db = statusMelden(
            db,
            id,
            naechste.aktivitaet.id,
            status,
            blockiert ? (s.blockNotiz ?? "") : "",
            sig(kennung, tick(2)),
            istAbnahmeSchritt(naechste.aktivitaet.name)
              ? { erster: kennung, zweiter: "WMZQD" }
              : undefined
          );
          if (blockiert) break;
        }
      } else if (s.typ === "notiz") {
        db = notizErfassen(
          db,
          id,
          s.art,
          s.text,
          sig(s.kennung ?? kennung, tick(4)),
          s.aufgabe ? [aufgabeId(id, s.aufgabe)] : []
        );
      } else if (s.typ === "meldung") {
        db = ereignisMelden(
          db,
          id,
          aufgabeId(id, s.aufgabe),
          s.ereignis,
          sig(kennung, tick(3))
        );
      } else if (s.typ === "freigabe") {
        db = freigabeSetzen(db, id, true, sig(s.kennung, tick(10)), s.grund);
      } else if (s.typ === "freigabeEnde") {
        db = freigabeSetzen(db, id, false, sig(s.kennung, tick(3)));
      } else {
        db = schichtAbschliessen(db, id, sig(kennung, tick(30)));
      }
    }
  };

  for (const sz of SZENARIEN) {
    const datum = tageAddieren(heute, sz.tagOffset);
    const start = zeitpunktBerlin(datum, START_STUNDE[sz.schichtTyp]);
    const r = schichtStarten(
      db,
      {
        datum,
        schichtTyp: sz.schichtTyp,
        linie: sz.linie,
        arbeitsbereich: sz.arbeitsbereich,
        einstieg: sz.einstieg,
      },
      sig(sz.kennung, start)
    );
    db = r.db;
    ausfuehren(r.id, sz.kennung, start, sz.schritte);
  }

  // open shifts: the current one, started 70 minutes ago (one Primary, one Secondary)
  const start = new Date(jetzt.getTime() - 70 * 60000);
  const typ = schichtAusUhrzeit(start);
  const datum =
    typ === "Nacht" && stundeBerlin(start) < 6
      ? tageAddieren(heuteBerlin(start), -1)
      : heuteBerlin(start);
  const prim = schichtStarten(
    db,
    {
      datum,
      schichtTyp: typ,
      linie: "L3",
      arbeitsbereich: "Primary",
      einstieg: "auftrag_ende",
    },
    sig("QXZTW", start)
  );
  db = prim.db;
  ausfuehren(prim.id, "QXZTW", start, [
    {
      typ: "status",
      anzahl: 99,
      blockiertAn: "Restmaterial zurückbuchen",
      blockNotiz: "Lagerplatz für Restfolie belegt – Linienleitung informiert.",
    },
    {
      typ: "notiz",
      art: "info",
      text: "Schichtübergabe mündlich zu Schichtbeginn erfolgt.",
    },
  ]);
  const start2 = new Date(start.getTime() + 2 * 60000);
  const sek = schichtStarten(
    db,
    {
      datum,
      schichtTyp: typ,
      linie: "L3",
      arbeitsbereich: "Secondary",
      einstieg: "laufender_auftrag",
    },
    sig("VBKRY", start2)
  );
  db = sek.db;
  ausfuehren(sek.id, "VBKRY", start2, [{ typ: "status", anzahl: 2 }]);
  return db;
}

/** Bereich names and number of applicable tasks of one area for a run context. */
export function vorlageUmfang(haupt: string, k: WechselKontext = STANDARD_WECHSEL) {
  const root = VORLAGE.find((x) => x.name === haupt);
  const bereiche = (root?.kinder ?? []).map((b) => (typeof b === "string" ? b : b.name));
  const aufgaben = bereiche.reduce((n, b) => n + vorlageSchritte(haupt, b, k).length, 0);
  return { bereiche, aufgaben, knoten: 1 + bereiche.length + aufgaben };
}
