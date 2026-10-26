import { KENNUNG_REGEX, type Rolle } from "./schema";

export type KennungErgebnis =
  { ok: true; kennung: string } | { ok: false; fehler: string };

/** Normalises user input to a Benutzer-Kennung (exactly 5 letters, upper-case). */
export function normalisiereKennung(eingabe: string): KennungErgebnis {
  const t = eingabe.trim();
  if (!t) return { ok: false, fehler: "Bitte die Kennung eingeben." };
  if (!KENNUNG_REGEX.test(t))
    return {
      ok: false,
      fehler: "Kennung ungültig – erwartet werden genau fünf Buchstaben, z. B. QXZTW.",
    };
  return { ok: true, kennung: t.toUpperCase() };
}

export interface VerzeichnisEintrag {
  kennung: string;
  name: string;
  rolle: Rolle;
}

/**
 * FAKE demo directory. All names and IDs are invented.
 */
export const DEMO_VERZEICHNIS: readonly VerzeichnisEintrag[] = [
  { kennung: "QXZTW", name: "Tilda Morgenstern", rolle: "bediener" },
  { kennung: "VBKRY", name: "Okan Feldberg", rolle: "bediener" },
  { kennung: "ZGPMX", name: "Ivo Kranichfeld", rolle: "bediener" },
  { kennung: "WMZQD", name: "Lasse Brückner", rolle: "qualitaetspruefer" },
  { kennung: "JPXNL", name: "Rina Sommerau", rolle: "linienleitung" },
  { kennung: "HTKVX", name: "Edda Wintersohl", rolle: "trainer" },
];

export type NachschlagErgebnis =
  { ok: true; eintrag: VerzeichnisEintrag } | { ok: false; fehler: string };

export function imVerzeichnisSuchen(
  eingabe: string,
  verzeichnis: readonly VerzeichnisEintrag[] = DEMO_VERZEICHNIS
): NachschlagErgebnis {
  const n = normalisiereKennung(eingabe);
  if (!n.ok) return n;
  const e = verzeichnis.find((v) => v.kennung === n.kennung);
  if (!e)
    return {
      ok: false,
      fehler: `Kennung ${n.kennung} ist im Verzeichnis nicht bekannt. Bitte prüfen oder an die Linienleitung wenden.`,
    };
  return { ok: true, eintrag: e };
}
