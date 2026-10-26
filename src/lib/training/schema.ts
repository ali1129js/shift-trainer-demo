import { prueferSchema } from "../vierAugen";
import { z } from "zod";
import {
  arbeitsbereichSchema,
  rolleSchema,
  schichtTypSchema,
  wechselartSchema,
} from "../schema";

/**
 * Training sessions (Trainingssitzungen) for the per-shift trainee report and the
 * per-Kennung training record. A session is one simulated shift of one trainee (Kennung)
 * in ONE area (Primary or Secondary).
 */
export const SCHRITT_ERGEBNISSE = [
  "ok",
  "fehler",
  "uebersprungen",
  "blockiert",
  "offen",
] as const;
export const schrittErgebnisSchema = z.enum(SCHRITT_ERGEBNISSE);
export type SchrittErgebnis = z.infer<typeof schrittErgebnisSchema>;
export const ERGEBNIS_LABEL: Record<SchrittErgebnis, string> = {
  ok: "OK",
  fehler: "Fehler",
  uebersprungen: "Übersprungen",
  blockiert: "Blockiert",
  offen: "Offen",
};

export const schrittProtokollSchema = z.object({
  /** Task-flow section: "Schichtstart", "Auftragsende", "Nächster Auftrag". */
  abschnitt: z.string().min(1),
  schritt: z.string().min(1),
  /** Position in the defined flow (1-based). */
  sollNr: z.number().int().positive(),
  /** Order in which the trainee actually completed it (1-based), null = not done. */
  istNr: z.number().int().positive().nullable(),
  ergebnis: schrittErgebnisSchema,
  bemerkung: z.string().default(""),
  /** 4-Augen-Prinzip: both checkers of a line clearance (Abnahme). */
  pruefer: prueferSchema.optional(),
});
export type SchrittProtokoll = z.infer<typeof schrittProtokollSchema>;

export const UEBERGABE_STATUS = ["ok", "fehlt", "beanstandet"] as const;
export const uebergabeStatusSchema = z.enum(UEBERGABE_STATUS);
export type UebergabeStatus = z.infer<typeof uebergabeStatusSchema>;

export const uebergabePruefungSchema = z.object({
  /** Step / trigger the handover note belongs to. */
  bezug: z.string().min(1),
  status: uebergabeStatusSchema,
  text: z.string().default(""),
});
export type UebergabePruefung = z.infer<typeof uebergabePruefungSchema>;

export const ausserplanSchema = z.object({
  zeit: z.string().regex(/^\d{2}:\d{2}$/),
  text: z.string().min(1),
});
export type Ausserplan = z.infer<typeof ausserplanSchema>;

export const trainingsSitzungSchema = z.object({
  id: z.string().min(1),
  datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  schichtTyp: schichtTypSchema,
  kennung: z.string().regex(/^[A-Z]{5}$/),
  name: z.string().default(""),
  bereich: arbeitsbereichSchema,
  /** Change type of the simulated order change (older sessions: plain Auftragswechsel). */
  wechselart: wechselartSchema.default("standard"),
  umbau: z.boolean().default(false),
  /** Trainer name/Kennung; empty = to be filled in by hand on the printout. */
  trainer: z.string().default(""),
  /** Completed order changes (Auftragsende -> Nächster Auftrag) in this session. */
  auftragsWechsel: z.number().int().min(0),
  schritte: z.array(schrittProtokollSchema),
  uebergaben: z.array(uebergabePruefungSchema),
  ausserplan: z.array(ausserplanSchema),
});
export type TrainingsSitzung = z.infer<typeof trainingsSitzungSchema>;

/**
 * Release (Freigabe) rules. NOT YET DECIDED by the leads – every default below is a
 * PLACEHOLDER and is labelled as such in the UI.
 */
export const freigabeEinstellungenSchema = z.object({
  minAuftragsWechsel: z.number().int().min(0),
  /** Max. counted errors in the evaluation window (last N sessions of the area). */
  maxFehler: z.number().int().min(0),
  fensterSitzungen: z.number().int().min(1),
  fehlendeUebergabeIstFehler: z.boolean(),
  getrennteFreigabe: z.boolean(),
  freigeberRolle: rolleSchema,
});
export type FreigabeEinstellungen = z.infer<typeof freigabeEinstellungenSchema>;

export const PLATZHALTER_EINSTELLUNGEN: FreigabeEinstellungen = {
  minAuftragsWechsel: 10,
  maxFehler: 2,
  fensterSitzungen: 3,
  fehlendeUebergabeIstFehler: true,
  getrennteFreigabe: true,
  freigeberRolle: "linienleitung",
};

export const trainingsDatenSchema = z.object({
  version: z.literal(1),
  sitzungen: z.array(trainingsSitzungSchema),
  einstellungen: freigabeEinstellungenSchema,
});
export type TrainingsDaten = z.infer<typeof trainingsDatenSchema>;
