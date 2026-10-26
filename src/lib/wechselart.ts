import type { Bedingung, Wechselart } from "./schema";

export interface WechselKontext {
  wechselart: Wechselart;
  umbau: boolean;
}

export const STANDARD_WECHSEL: WechselKontext = { wechselart: "standard", umbau: false };

/** Allergen cleaning is needed for an allergen change or a format change. */
export const allergenReinigung = (k: WechselKontext) =>
  k.wechselart === "allergen" || k.umbau;

/** Does a template condition apply to the given change context? */
export function giltFuer(b: Bedingung | undefined, k: WechselKontext): boolean {
  if (!b) return true;
  if (b.wechsel && !b.wechsel.includes(k.wechselart)) return false;
  if (b.umbau !== undefined && b.umbau !== k.umbau) return false;
  if (b.reinigung !== undefined && b.reinigung !== allergenReinigung(k)) return false;
  return true;
}
