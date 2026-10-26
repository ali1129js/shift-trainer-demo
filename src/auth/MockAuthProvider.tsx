import { useMemo, useState, type ReactNode } from "react";
import { imVerzeichnisSuchen } from "@/lib/identitaet";
import { AuthContext } from "./AuthContext";
import { claimFuer, rolleAusClaims, type AuthKontext, type Konto } from "./types";

const SITZUNG_KEY = "shift-trainer-demo:sitzung";

function kontoFuer(kennung: string): Konto | null {
  const r = imVerzeichnisSuchen(kennung);
  if (!r.ok) return null;
  const e = r.eintrag;
  return {
    id: `demo-${e.kennung}`,
    username: `${e.kennung.toLowerCase()}@northwind.example`,
    name: e.name,
    kennung: e.kennung,
    roles: [claimFuer(e.rolle)],
  };
}

function gespeichert(): Konto | null {
  try {
    const c = window.sessionStorage.getItem(SITZUNG_KEY);
    return c ? kontoFuer(c) : null;
  } catch {
    return null;
  }
}

/**
 * Demo sign-in with a Kennung that is looked up in
 * the fake demo directory (name + role come from there). Session lives in sessionStorage.
 */
export function MockAuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Konto | null>(gespeichert);
  const wert = useMemo<AuthKontext>(
    () => ({
      status: account ? "angemeldet" : "abgemeldet",
      account,
      rolle: account ? rolleAusClaims(account.roles) : null,
      login: async (hint = "") => {
        const r = imVerzeichnisSuchen(hint);
        if (!r.ok) throw new Error(r.fehler);
        const k = kontoFuer(r.eintrag.kennung);
        try {
          window.sessionStorage.setItem(SITZUNG_KEY, r.eintrag.kennung);
        } catch {
          /* session only in memory */
        }
        setAccount(k);
      },
      logout: async () => {
        try {
          window.sessionStorage.removeItem(SITZUNG_KEY);
        } catch {
          /* ignore */
        }
        setAccount(null);
      },
    }),
    [account]
  );
  return <AuthContext.Provider value={wert}>{children}</AuthContext.Provider>;
}
