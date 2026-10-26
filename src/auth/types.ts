import type { Rolle } from "@/lib/schema";

/**
 * Signed-in demo account. The Kennung is the login identity (exactly 5 letters);
 * name and role come from the fictional demo directory and are never typed by users.
 */
export interface Konto {
  id: string;
  /** Login name, e.g. qxztw@northwind.example (fictional). */
  username: string;
  name: string;
  /** Benutzer-Kennung, upper-case, 5 letters. */
  kennung: string;
  /** Raw role claims from the demo directory. */
  roles: readonly string[];
}

export interface AuthKontext {
  status: "laedt" | "angemeldet" | "abgemeldet";
  account: Konto | null;
  /** Workflow role derived from the claims (highest wins); null when signed out or no app role. */
  rolle: Rolle | null;
  /** Sign-in: looks the Kennung up in the demo directory; rejects with a German message if unknown. */
  login(loginHint?: string): Promise<void>;
  logout(): Promise<void>;
}

/** Role claim values -> app roles. */
export const ROLLEN_CLAIMS: Record<string, Rolle> = {
  "Schicht.Bediener": "bediener",
  "Schicht.Qualitaet": "qualitaetspruefer",
  "Schicht.Linienleitung": "linienleitung",
  "Schicht.Trainer": "trainer",
};

const RANG: Rolle[] = ["bediener", "qualitaetspruefer", "linienleitung", "trainer"];

/** Highest app role contained in the claims, or null. */
export function rolleAusClaims(claims: readonly string[]): Rolle | null {
  let best: Rolle | null = null;
  for (const c of claims) {
    const r = ROLLEN_CLAIMS[c];
    if (r && (best === null || RANG.indexOf(r) > RANG.indexOf(best))) best = r;
  }
  return best;
}

export function claimFuer(rolle: Rolle): string {
  const e = Object.entries(ROLLEN_CLAIMS).find(([, r]) => r === rolle);
  if (!e) throw new Error(`Kein Claim für Rolle ${rolle}`);
  return e[0];
}
