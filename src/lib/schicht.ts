import { bereiche, findeAufgabe } from "./ablauf";
import { WorkflowFehler } from "./fehler";
import { stillstandRegel } from "./stillstand";
import { bereichKurz, STILLSTAND_GRUND_LABEL, type StillstandGrund } from "./schema";
import { darfSperreAufheben, darfWiedereroeffnen } from "./rechte";
import {
  NOTIZ_LABEL,
  SCHICHT_LABEL,
  STATUS_LABEL,
  EINSTIEG_LABEL,
  EINSTIEG_VORSCHICHT_BEREICHE,
  type Aktivitaet,
  type AufgabenStatus,
  type Arbeitsbereich,
  type Einstieg,
  type Datenbank,
  type Linie,
  type NotizArt,
  type Schicht,
  type SchichtTyp,
  type Signatur,
  type VerlaufArt,
  type Wechselart,
  WECHSELART_LABEL,
} from "./schema";
import { giltFuer } from "./wechselart";
import {
  istAbnahmeSchritt,
  prueferText,
  vierAugenFehler,
  type Pruefer,
} from "./vierAugen";

/**
 * Pure, immutable operations on the database. Every write is signed (Kennung + time)
 * and appended to the shift's audit trail (`verlauf`). Nothing is ever edited or deleted.
 */

export interface StartEingabe {
  datum: string;
  schichtTyp: SchichtTyp;
  linie: Linie;
  /** Primary or Secondary (default Primary) – only that area is copied. */
  arbeitsbereich?: Arbeitsbereich;
  /** Entry point into the running order (default: Auftragsbeginn). */
  einstieg?: Einstieg;
  /** Change type (default standard) – branches cleaning steps. */
  wechselart?: Wechselart;
  /** Additional format change. */
  umbau?: boolean;
}

/** Fictitious signer for steps pre-marked as done by the previous shift. */
export const VORSCHICHT_KENNUNG = "VORSC";
export function vorschichtSignatur(vor: Signatur): Signatur {
  return {
    kennung: VORSCHICHT_KENNUNG,
    name: "Vorschicht (simuliert)",
    rolle: "bediener",
    zeit: new Date(Date.parse(vor.zeit) - 60000).toISOString(),
  };
}

export const vorschichtUebergabeText = (einstieg: Einstieg) =>
  einstieg === "auftrag_ende"
    ? "Übergabe der Vorschicht (simuliert): Schichtstart und Produktion erledigt. Auftrag ist fast fertig – bitte Auftragsende und den nächsten Auftrag vorbereiten."
    : "Übergabe der Vorschicht (simuliert): Schichtstart erledigt, Auftrag läuft stabil. Bitte Linie weiter überwachen.";

export const schichtTitel = (
  s: Pick<Schicht, "linie" | "schichtTyp" | "datum"> &
    Partial<Pick<Schicht, "arbeitsbereich">>
) =>
  `${s.linie}${s.arbeitsbereich ? ` ${bereichKurz(s.arbeitsbereich)}` : ""} · ${SCHICHT_LABEL[s.schichtTyp]} · ${s.datum.split("-").reverse().join(".")}`;

function klon(db: Datenbank): Datenbank {
  return structuredClone(db);
}

function holeSchicht(db: Datenbank, id: number): Schicht {
  const s = db.schichten.find((x) => x.id === id);
  if (!s) throw new WorkflowFehler(`Schicht ${id} wurde nicht gefunden.`);
  return s;
}

function verlauf(
  db: Datenbank,
  s: Schicht,
  art: VerlaufArt,
  text: string,
  signiert: Signatur
) {
  s.verlauf.push({ id: db.nextId++, art, text, signiert });
}

/** Copies all non-archived template nodes into the shift as an immutable snapshot. */
export function schichtStarten(
  alt: Datenbank,
  e: StartEingabe,
  signiert: Signatur
): { db: Datenbank; id: number } {
  const db = klon(alt);
  const id = db.nextId++;
  const arbeitsbereich = e.arbeitsbereich ?? "Primary";
  const nachId = new Map(db.aktivitaeten.map((a) => [a.id, a]));
  const wurzel = (a: Aktivitaet): Aktivitaet => {
    let x = a;
    while (x.parentId !== null) {
      const p = nachId.get(x.parentId);
      if (!p) break;
      x = p;
    }
    return x;
  };
  const kontext = { wechselart: e.wechselart ?? "standard", umbau: e.umbau ?? false };
  const ausgeschlossen = new Set<number>();
  // a node is excluded if it or any ancestor does not apply to the change type
  for (const a of db.aktivitaeten) {
    let x: Aktivitaet | undefined = a;
    while (x) {
      if (!giltFuer(x.bedingung, kontext)) {
        ausgeschlossen.add(a.id);
        break;
      }
      x = x.parentId !== null ? nachId.get(x.parentId) : undefined;
    }
  }
  const aktive = db.aktivitaeten.filter(
    (a) => !a.archiviert && !ausgeschlossen.has(a.id) && wurzel(a).name === arbeitsbereich
  );
  if (aktive.length === 0)
    throw new WorkflowFehler(
      `Keine Aktivitäten für den Bereich ${bereichKurz(arbeitsbereich)} vorhanden.`
    );
  const s: Schicht = {
    id,
    datum: e.datum,
    schichtTyp: e.schichtTyp,
    linie: e.linie,
    arbeitsbereich,
    einstieg: e.einstieg ?? "auftrag_beginn",
    wechselart: kontext.wechselart,
    umbau: kontext.umbau,
    gestartet: signiert,
    abgeschlossen: null,
    freigabe: null,
    aktivitaeten: aktive.map((a) => ({
      id: db.nextId++,
      aktivitaetId: a.id,
      name: a.name,
      farbe: a.farbe,
      parentAktivitaetId: a.parentId,
      sortOrder: a.sortOrder,
    })),
    ereignisse: [],
    notizen: [],
    meldungen: [],
    stillstaende: [],
    verlauf: [],
  };
  verlauf(
    db,
    s,
    "schicht_gestartet",
    `Schicht gestartet: ${schichtTitel(s)} · Einstieg: ${EINSTIEG_LABEL[s.einstieg]} · Wechselart: ${WECHSELART_LABEL[s.wechselart]}${s.umbau ? " + Formatwechsel" : ""}`,
    signiert
  );
  const vorBereiche = EINSTIEG_VORSCHICHT_BEREICHE[s.einstieg];
  if (vorBereiche.length > 0) {
    const vs = vorschichtSignatur(signiert);
    let n = 0;
    for (const b of bereiche(s))
      if (vorBereiche.includes(b.name))
        for (const a of b.aufgaben) {
          s.ereignisse.push({
            id: db.nextId++,
            schichtAktivitaetId: a.aktivitaet.id,
            status: "done",
            notiz: "",
            ueberSperre: false,
            durchVorschicht: true,
            signiert: vs,
          });
          n++;
        }
    s.notizen.push({
      id: db.nextId++,
      art: "handover",
      text: vorschichtUebergabeText(s.einstieg),
      aufgabenIds: [],
      signiert: vs,
    });
    verlauf(
      db,
      s,
      "vorschicht_uebernommen",
      `${n} Schritte durch Vorschicht erledigt (${vorBereiche.join(", ")})`,
      vs
    );
  }
  db.schichten.push(s);
  return { db, id };
}

export function statusMelden(
  alt: Datenbank,
  schichtId: number,
  schichtAktivitaetId: number,
  status: AufgabenStatus,
  notiz: string,
  signiert: Signatur,
  pruefer?: Pruefer
): Datenbank {
  const db = klon(alt);
  const s = holeSchicht(db, schichtId);
  if (s.abgeschlossen)
    throw new WorkflowFehler(
      "Diese Schicht ist abgeschlossen. Statusmeldungen sind gesperrt."
    );
  const aufgabe = findeAufgabe(s, schichtAktivitaetId);
  if (!aufgabe) throw new WorkflowFehler("Aufgabe nicht gefunden.");
  if (status === "done" && aufgabe.status === "done")
    throw new WorkflowFehler(`»${aufgabe.aktivitaet.name}« ist bereits erledigt.`);
  const abnahme = status === "done" && istAbnahmeSchritt(aufgabe.aktivitaet.name);
  if (abnahme) {
    const f = vierAugenFehler(pruefer);
    if (f) throw new WorkflowFehler(f);
  }
  const p =
    abnahme && pruefer
      ? { erster: pruefer.erster.trim(), zweiter: pruefer.zweiter.trim() }
      : undefined;
  if (aufgabe.gesperrt)
    throw new WorkflowFehler(
      `Aufgabe gesperrt – wartet auf »${aufgabe.gesperrtDurch ?? "vorherigen Bereich"}«.`
    );
  const n = notiz.trim();
  const ueberSperre = aufgabe.kaskadenGesperrt;
  s.ereignisse.push({
    id: db.nextId++,
    schichtAktivitaetId,
    status,
    notiz: n,
    ueberSperre,
    durchVorschicht: false,
    ...(p ? { pruefer: p } : {}),
    signiert,
  });
  verlauf(
    db,
    s,
    "status_gemeldet",
    `${aufgabe.aktivitaet.name}: ${STATUS_LABEL[status]}${ueberSperre ? " (über Freigabe der Linienleitung)" : ""}${p ? ` · Prüfer: ${prueferText(p)}` : ""}${n ? ` – ${n}` : ""}`,
    signiert
  );
  return db;
}

export function notizErfassen(
  alt: Datenbank,
  schichtId: number,
  art: NotizArt,
  text: string,
  signiert: Signatur,
  aufgabenIds: readonly number[] = []
): Datenbank {
  const t = text.trim();
  if (t.length < 3)
    throw new WorkflowFehler("Bitte einen Text mit mindestens 3 Zeichen erfassen.");
  const db = klon(alt);
  const s = holeSchicht(db, schichtId);
  const ids = [...new Set(aufgabenIds)];
  for (const id of ids)
    if (!s.aktivitaeten.some((a) => a.id === id))
      throw new WorkflowFehler(`Aufgabe ${id} gehört nicht zu dieser Schicht.`);
  s.notizen.push({ id: db.nextId++, art, text: t, aufgabenIds: ids, signiert });
  const namen = ids.map((id) => s.aktivitaeten.find((a) => a.id === id)?.name).join(", ");
  verlauf(
    db,
    s,
    "notiz_erfasst",
    `${NOTIZ_LABEL[art]} erfasst${namen ? ` zu ${namen}` : ""}`,
    signiert
  );
  return db;
}

/** Supervisor release ("Sperre aufheben"): Linienleitung only, signed and logged. */
export function freigabeSetzen(
  alt: Datenbank,
  schichtId: number,
  aktiv: boolean,
  signiert: Signatur,
  begruendung = ""
): Datenbank {
  if (!darfSperreAufheben(signiert.rolle))
    throw new WorkflowFehler(
      "Nur die Linienleitung darf die Sperre aufheben oder wieder aktivieren."
    );
  const db = klon(alt);
  const s = holeSchicht(db, schichtId);
  if (s.abgeschlossen) throw new WorkflowFehler("Diese Schicht ist abgeschlossen.");
  if (aktiv === (s.freigabe !== null)) return alt;
  const b = begruendung.trim();
  if (aktiv && b.length < 3)
    throw new WorkflowFehler("Bitte eine Begründung (mindestens 3 Zeichen) angeben.");
  s.freigabe = aktiv ? signiert : null;
  verlauf(
    db,
    s,
    aktiv ? "freigabe_erteilt" : "freigabe_beendet",
    aktiv
      ? `Sperre aufgehoben (Freigabe der Linienleitung): ${b}`
      : "Sperre wieder aktiviert",
    signiert
  );
  return db;
}

export function schichtAbschliessen(
  alt: Datenbank,
  schichtId: number,
  signiert: Signatur
): Datenbank {
  const db = klon(alt);
  const s = holeSchicht(db, schichtId);
  if (s.abgeschlossen) return alt;
  s.abgeschlossen = signiert;
  if (s.freigabe) {
    s.freigabe = null;
    verlauf(
      db,
      s,
      "freigabe_beendet",
      "Sperre mit Schichtabschluss wieder aktiviert",
      signiert
    );
  }
  verlauf(db, s, "schicht_abgeschlossen", "Schicht abgeschlossen", signiert);
  return db;
}

export function schichtWiedereroeffnen(
  alt: Datenbank,
  schichtId: number,
  signiert: Signatur,
  begruendung: string
): Datenbank {
  if (!darfWiedereroeffnen(signiert.rolle))
    throw new WorkflowFehler("Nur die Linienleitung darf eine Schicht wieder öffnen.");
  const b = begruendung.trim();
  if (b.length < 3)
    throw new WorkflowFehler("Bitte eine Begründung (mindestens 3 Zeichen) angeben.");
  const db = klon(alt);
  const s = holeSchicht(db, schichtId);
  if (!s.abgeschlossen) return alt;
  s.abgeschlossen = null;
  verlauf(db, s, "schicht_wiedereroeffnet", `Schicht wieder geöffnet: ${b}`, signiert);
  return db;
}

/** Tick a handover-relevant event on a task (e.g. "Folienriss"). */
export function ereignisMelden(
  alt: Datenbank,
  schichtId: number,
  schichtAktivitaetId: number,
  ereignis: string,
  signiert: Signatur
): Datenbank {
  const e = ereignis.trim();
  if (!e) throw new WorkflowFehler("Bitte ein Ereignis angeben.");
  const db = klon(alt);
  const s = holeSchicht(db, schichtId);
  if (s.abgeschlossen) throw new WorkflowFehler("Diese Schicht ist abgeschlossen.");
  const aufgabe = findeAufgabe(s, schichtAktivitaetId);
  if (!aufgabe) throw new WorkflowFehler("Aufgabe nicht gefunden.");
  s.meldungen.push({ id: db.nextId++, schichtAktivitaetId, ereignis: e, signiert });
  verlauf(
    db,
    s,
    "ereignis_gemeldet",
    `${aufgabe.aktivitaet.name}: Ereignis „${e}“`,
    signiert
  );
  return db;
}

export interface StillstandEingabe {
  grund: StillstandGrund;
  text?: string;
  dauerMin: number;
}

/** Records a standstill; >= 30 min is marked as long standstill. */
export function stillstandErfassen(
  alt: Datenbank,
  schichtId: number,
  e: StillstandEingabe,
  signiert: Signatur
): Datenbank {
  const text = (e.text ?? "").trim();
  if (!Number.isInteger(e.dauerMin) || e.dauerMin <= 0)
    throw new WorkflowFehler("Bitte eine Dauer in ganzen Minuten (> 0) angeben.");
  if (e.grund === "sonstiges" && text.length < 3)
    throw new WorkflowFehler("Bei »Sonstiges« bitte den Grund beschreiben.");
  const db = klon(alt);
  const s = holeSchicht(db, schichtId);
  if (s.abgeschlossen) throw new WorkflowFehler("Diese Schicht ist abgeschlossen.");
  const lang = stillstandRegel(e.dauerMin).art === "lang";
  s.stillstaende.push({
    id: db.nextId++,
    grund: e.grund,
    text,
    dauerMin: e.dauerMin,
    lang,
    signiert,
  });
  verlauf(
    db,
    s,
    "stillstand_erfasst",
    `Stillstand ${e.dauerMin} min (${STILLSTAND_GRUND_LABEL[e.grund]}${text ? `: ${text}` : ""})${lang ? " – langer Stillstand" : ""}`,
    signiert
  );
  return db;
}
