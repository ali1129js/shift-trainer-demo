import { claimFuer, rolleAusClaims } from "./types";

describe("Rollen aus Claims", () => {
  it("höchste Rolle gewinnt, unbekannte Claims ignoriert", () => {
    expect(rolleAusClaims(["Schicht.Bediener", "Schicht.Linienleitung", "x"])).toBe(
      "linienleitung"
    );
    expect(rolleAusClaims(["foo"])).toBeNull();
  });
  it("Claim-Rundreise", () => {
    expect(rolleAusClaims([claimFuer("trainer")])).toBe("trainer");
  });
});
