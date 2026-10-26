import { z } from "zod";

/**
 * 4-Augen-Prinzip for the first-sample release (Erstmusterfreigabe): one person
 * prepares and checks the sample, a second person confirms independently.
 */
export const prueferSchema = z.object({
  /** First checker (Kennung or name). */
  erster: z.string().trim().min(1),
  /** Second checker (Kennung or name); must differ from the first. */
  zweiter: z.string().trim().min(1),
});
export type Pruefer = z.infer<typeof prueferSchema>;

/** Release steps that need two checkers. */
export const istAbnahmeSchritt = (name: string) =>
  /^(Erstmuster|Palettenfreigabe)/i.test(name.trim());

const norm = (s: string) => s.trim().toLowerCase();

/** Returns an error message, or null when both checkers are present and different. */
export function vierAugenFehler(p: Partial<Pruefer> | undefined | null): string | null {
  const a = p?.erster?.trim() ?? "";
  const b = p?.zweiter?.trim() ?? "";
  if (!a || !b)
    return "4-Augen-Prinzip: Für die Freigabe sind zwei Prüfer nötig (erster und zweiter Prüfer).";
  if (norm(a) === norm(b))
    return "4-Augen-Prinzip: Erster und zweiter Prüfer müssen verschiedene Personen sein.";
  return null;
}

export const prueferText = (p: Pruefer) => `${p.erster} + ${p.zweiter}`;

export const VIER_AUGEN_HINWEIS =
  "Freigabe nach dem 4-Augen-Prinzip: Der Bediener prüft Erstmuster bzw. Palette, der Qualitätsprüfer bestätigt unabhängig. Erst mit beiden Unterschriften ist die Freigabe erledigt.";
