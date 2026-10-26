import type { Signatur } from "@/lib/schema";
import type { AuthKontext } from "./types";
import { useAuth } from "./AuthContext";

/** Builds the signature for a write from the logged-in identity (never from user input). */
export function signaturAus(
  auth: Pick<AuthKontext, "account" | "rolle">,
  jetzt = new Date()
): Signatur {
  if (!auth.account || !auth.rolle) throw new Error("Nicht angemeldet.");
  return {
    kennung: auth.account.kennung,
    name: auth.account.name,
    rolle: auth.rolle,
    zeit: jetzt.toISOString(),
  };
}

export function useSignieren(): () => Signatur {
  const auth = useAuth();
  return () => signaturAus(auth);
}
