import type { Rolle } from "./schema";

/** Supervisor roles: may lift the cascade lock and reopen closed shifts. */
export const VORGESETZTEN_ROLLEN: readonly Rolle[] = ["linienleitung"];

export const darfSperreAufheben = (rolle: Rolle) => VORGESETZTEN_ROLLEN.includes(rolle);
export const darfWiedereroeffnen = (rolle: Rolle) => VORGESETZTEN_ROLLEN.includes(rolle);
