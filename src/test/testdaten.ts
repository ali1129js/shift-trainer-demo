import type { Signatur } from "@/lib/schema";

let t = Date.parse("2026-10-12T04:00:00.000Z");

/** Signature with strictly increasing time. */
export function sig(
  kennung = "QXZTW",
  rolle: Signatur["rolle"] = "bediener",
  name = "Tilda Morgenstern"
): Signatur {
  t += 60000;
  return { kennung, name, rolle, zeit: new Date(t).toISOString() };
}
export const linienleitung = () => sig("JPXNL", "linienleitung", "Rina Sommerau");
export const trainer = () => sig("HTKVX", "trainer", "Edda Wintersohl");
export const pruefer = () => sig("WMZQD", "qualitaetspruefer", "Lasse Brückner");
export const PRUEFER = { erster: "QXZTW", zweiter: "VBKRY" };
