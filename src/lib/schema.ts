import { z } from "zod";
import { prueferSchema } from "./vierAugen";

/** Fictional packaging lines (Northwind Snacks). */
export const LINIEN = ["L1", "L2", "L3", "L4"] as const;
export const linieSchema = z.enum(LINIEN);
export type Linie = z.infer<typeof linieSchema>;

export const SCHICHTTYPEN = ["Frueh", "Spaet", "Nacht"] as const;
export const schichtTypSchema = z.enum(SCHICHTTYPEN);
export type SchichtTyp = z.infer<typeof schichtTypSchema>;
export const SCHICHT_LABEL: Record<SchichtTyp, string> = {
  Frueh: "Frühschicht",
  Spaet: "Spätschicht",
  Nacht: "Nachtschicht",
};

export const FARBEN = [
  "blue",
  "green",
  "yellow",
  "orange",
  "red",
  "teal",
  "gray",
] as const;
export const farbeSchema = z.enum(FARBEN);
export type Farbe = z.infer<typeof farbeSchema>;
export const FARBE_HEX: Record<Farbe, string> = {
  blue: "#00BCFF",
  green: "#89D329",
  yellow: "#F5C518",
  orange: "#F08C1F",
  red: "#E4572E",
  teal: "#12A5A5",
  gray: "#8FA6B4",
};

export const NOTIZ_ARTEN = ["handover", "info", "issue"] as const;
export const notizArtSchema = z.enum(NOTIZ_ARTEN);
export type NotizArt = z.infer<typeof notizArtSchema>;
export const NOTIZ_LABEL: Record<NotizArt, string> = {
  handover: "Übergabe",
  info: "Info",
  issue: "Störung",
};

/** "Offen" = no event recorded. */
export const AUFGABEN_STATUS = ["done", "blocked", "skipped"] as const;
export const aufgabenStatusSchema = z.enum(AUFGABEN_STATUS);
export type AufgabenStatus = z.infer<typeof aufgabenStatusSchema>;
export type AnzeigeStatus = AufgabenStatus | "open";
export const STATUS_LABEL: Record<AnzeigeStatus, string> = {
  done: "Erledigt",
  blocked: "Blockiert",
  skipped: "Übersprungen",
  open: "Offen",
};

/** Roles come from the identity system, never typed by users. */
export const ROLLEN = [
  "bediener",
  "qualitaetspruefer",
  "linienleitung",
  "trainer",
] as const;
export const rolleSchema = z.enum(ROLLEN);
export type Rolle = z.infer<typeof rolleSchema>;
export const ROLLE_LABEL: Record<Rolle, string> = {
  bediener: "Bediener",
  qualitaetspruefer: "Qualitätsprüfer",
  linienleitung: "Linienleitung",
  trainer: "Trainer",
};

/** User ID (Kennung): always exactly 5 letters, stored upper-case. */
export const KENNUNG_REGEX = /^[A-Za-z]{5}$/;
export const kennungSchema = z
  .string()
  .trim()
  .regex(
    KENNUNG_REGEX,
    "Kennung ungültig – erwartet werden genau fünf Buchstaben, z. B. QXZTW."
  )
  .transform((s) => s.toUpperCase());

const isoZeit = z.string().datetime({ offset: true });

/** An operator works EITHER in Bereich A (blue) OR in Bereich B (green). */
export const ARBEITSBEREICHE = ["Primary", "Secondary"] as const;
export const arbeitsbereichSchema = z.enum(ARBEITSBEREICHE);
export type Arbeitsbereich = z.infer<typeof arbeitsbereichSchema>;
export const ARBEITSBEREICH_LABEL: Record<Arbeitsbereich, string> = {
  Primary: "Bereich A – Schlauchbeutel",
  Secondary: "Bereich B – Karton/Palette",
};

/** Where the shift enters the running order. */
export const EINSTIEGE = ["auftrag_beginn", "laufender_auftrag", "auftrag_ende"] as const;
export const einstiegSchema = z.enum(EINSTIEGE);
export type Einstieg = z.infer<typeof einstiegSchema>;
export const EINSTIEG_LABEL: Record<Einstieg, string> = {
  auftrag_beginn: "Auftragsbeginn",
  laufender_auftrag: "Laufender Auftrag",
  auftrag_ende: "Auftragsende & nächster Auftrag",
};
/** Sections the previous shift has already completed for each entry point. */
export const EINSTIEG_VORSCHICHT_BEREICHE: Record<Einstieg, readonly string[]> = {
  auftrag_beginn: [],
  laufender_auftrag: ["Schichtstart"],
  auftrag_ende: ["Schichtstart", "Produktion"],
};

/**
 * Change type of the order change. It decides which cleaning steps apply.
 * A format change ("umbau") can come on top of any type.
 */
export const WECHSELARTEN = ["standard", "sorte", "allergen"] as const;
export const wechselartSchema = z.enum(WECHSELARTEN);
export type Wechselart = z.infer<typeof wechselartSchema>;
export const WECHSELART_LABEL: Record<Wechselart, string> = {
  standard: "Auftragswechsel (gleiche Sorte)",
  sorte: "Sortenwechsel",
  allergen: "Sortenwechsel mit Allergenwechsel",
};
export const WECHSELART_KURZ: Record<Wechselart, string> = {
  standard: "Gleiche Sorte",
  sorte: "Sorte",
  allergen: "Allergen",
};
export const WECHSELART_HILFE: Record<Wechselart, string> = {
  standard: "Gleiches Produkt, neuer Auftrag – Zwischenreinigung.",
  sorte: "Andere Sorte ohne neue Allergene – Linie leerfahren, Zwischenreinigung.",
  allergen: "Andere Sorte mit anderen Allergenen – zusätzlich Allergenreinigung.",
};

/** Template condition: node only applies to these change types and/or only with a format change. */
export const bedingungSchema = z.object({
  wechsel: z.array(wechselartSchema).min(1).optional(),
  umbau: z.boolean().optional(),
  /** Only when an allergen cleaning is required. */
  reinigung: z.boolean().optional(),
});
export type Bedingung = z.infer<typeof bedingungSchema>;

export const signaturSchema = z.object({
  kennung: z.string().regex(/^[A-Z]{5}$/),
  name: z.string().min(1),
  rolle: rolleSchema,
  zeit: isoZeit,
});
export type Signatur = z.infer<typeof signaturSchema>;

export const aktivitaetSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  farbe: farbeSchema,
  parentId: z.number().int().positive().nullable(),
  sortOrder: z.number().int(),
  archiviert: z.boolean(),
  /** Only copied into a shift whose change type matches (absent = always). */
  bedingung: bedingungSchema.optional(),
});
export type Aktivitaet = z.infer<typeof aktivitaetSchema>;

/** Immutable snapshot of a template node, copied at shift start. */
export const schichtAktivitaetSchema = z.object({
  id: z.number().int().positive(),
  aktivitaetId: z.number().int().positive(),
  name: z.string(),
  farbe: farbeSchema,
  /** Refers to Aktivitaet.id (not ShiftActivity.id). */
  parentAktivitaetId: z.number().int().positive().nullable(),
  sortOrder: z.number().int(),
});
export type SchichtAktivitaet = z.infer<typeof schichtAktivitaetSchema>;

/** Append-only; the latest event per task wins. */
export const aufgabenEreignisSchema = z.object({
  id: z.number().int().positive(),
  schichtAktivitaetId: z.number().int().positive(),
  status: aufgabenStatusSchema,
  notiz: z.string(),
  /** true if recorded while the supervisor release (Sperre aufgehoben) was active and the task was locked. */
  ueberSperre: z.boolean(),
  /** Pre-marked at shift start as already done by the previous shift (entry context). */
  durchVorschicht: z.boolean().default(false),
  /** 4-Augen-Prinzip: both checkers of a line clearance (Abnahme). */
  pruefer: prueferSchema.optional(),
  signiert: signaturSchema,
});
export type AufgabenEreignis = z.infer<typeof aufgabenEreignisSchema>;

export const notizSchema = z.object({
  id: z.number().int().positive(),
  art: notizArtSchema,
  text: z.string().min(3),
  /** Linked tasks (SchichtAktivitaet ids) – handover notes belong to tasks. */
  aufgabenIds: z.array(z.number().int().positive()),
  signiert: signaturSchema,
});
export type Notiz = z.infer<typeof notizSchema>;

/** A ticked handover-relevant event ("meldepflichtiges Ereignis") on a task. */
export const meldungSchema = z.object({
  id: z.number().int().positive(),
  schichtAktivitaetId: z.number().int().positive(),
  ereignis: z.string().min(1),
  signiert: signaturSchema,
});
export type Meldung = z.infer<typeof meldungSchema>;

export const VERLAUF_ARTEN = [
  "schicht_gestartet",
  "vorschicht_uebernommen",
  "status_gemeldet",
  "notiz_erfasst",
  "ereignis_gemeldet",
  "stillstand_erfasst",
  "hinweis",
  "freigabe_erteilt",
  "freigabe_beendet",
  "schicht_abgeschlossen",
  "schicht_wiedereroeffnet",
] as const;
export const verlaufEintragSchema = z.object({
  id: z.number().int().positive(),
  art: z.enum(VERLAUF_ARTEN),
  text: z.string(),
  signiert: signaturSchema,
});
export type VerlaufEintrag = z.infer<typeof verlaufEintragSchema>;
export type VerlaufArt = VerlaufEintrag["art"];

export const STILLSTAND_GRUENDE = [
  "pause",
  "gruppenrunde",
  "stoerung",
  "sonstiges",
] as const;
export const stillstandGrundSchema = z.enum(STILLSTAND_GRUENDE);
export type StillstandGrund = z.infer<typeof stillstandGrundSchema>;
export const STILLSTAND_GRUND_LABEL: Record<StillstandGrund, string> = {
  pause: "Pause",
  gruppenrunde: "Gruppenrunde",
  stoerung: "Störung",
  sonstiges: "Sonstiges",
};
export const stillstandSchema = z.object({
  id: z.number().int().positive(),
  grund: stillstandGrundSchema,
  text: z.string().default(""),
  dauerMin: z.number().int().positive(),
  /** >= 30 min = long standstill. */
  lang: z.boolean(),
  signiert: signaturSchema,
});
export type Stillstand = z.infer<typeof stillstandSchema>;

export const schichtSchema = z.object({
  id: z.number().int().positive(),
  datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  schichtTyp: schichtTypSchema,
  linie: linieSchema,
  arbeitsbereich: arbeitsbereichSchema.default("Primary"),
  einstieg: einstiegSchema.default("auftrag_beginn"),
  /** Change type chosen at start . */
  wechselart: wechselartSchema.default("standard"),
  /** Additional format change. */
  umbau: z.boolean().default(false),
  gestartet: signaturSchema,
  abgeschlossen: signaturSchema.nullable(),
  /** Active supervisor release (cascade locks disabled), or null. */
  freigabe: signaturSchema.nullable(),
  aktivitaeten: z.array(schichtAktivitaetSchema),
  ereignisse: z.array(aufgabenEreignisSchema),
  notizen: z.array(notizSchema),
  meldungen: z.array(meldungSchema),
  stillstaende: z.array(stillstandSchema).default([]),
  /** Append-only audit trail of everything signed in this shift. */
  verlauf: z.array(verlaufEintragSchema),
});
export type Schicht = z.infer<typeof schichtSchema>;

export const datenbankSchema = z.object({
  version: z.literal(1),
  /** Template content version; older stored templates are replaced on load. */
  vorlageVersion: z.number().int().positive().default(1),
  nextId: z.number().int().positive(),
  aktivitaeten: z.array(aktivitaetSchema),
  schichten: z.array(schichtSchema),
});
export type Datenbank = z.infer<typeof datenbankSchema>;

/** Short German area name ("Bereich A"/"Bereich B"); other strings pass through unchanged. */
export const bereichKurz = (b: string): string =>
  b === "Primary" ? "Bereich A" : b === "Secondary" ? "Bereich B" : b;
