import { createContext, useContext } from "react";
import type { AuthKontext } from "./types";

export const AuthContext = createContext<AuthKontext | null>(null);

export function useAuth(): AuthKontext {
  const a = useContext(AuthContext);
  if (!a) throw new Error("useAuth muss innerhalb eines AuthProviders verwendet werden.");
  return a;
}
