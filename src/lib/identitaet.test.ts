import { DEMO_VERZEICHNIS, imVerzeichnisSuchen, normalisiereKennung } from "./identitaet";
import { kennungSchema } from "./schema";

describe("Kennung", () => {
  it.each(["qxztw", "QXZTW", "  QxZtW "])("akzeptiert %s und normalisiert", (e) => {
    expect(normalisiereKennung(e)).toEqual({ ok: true, kennung: "QXZTW" });
    expect(kennungSchema.parse(e)).toBe("QXZTW");
  });
  it.each(["QXZT", "QXZTWA", "AB1234", "QXZ W", "QXZT1", "ÄBCDE", ""])(
    "lehnt %j ab",
    (e) => {
      expect(normalisiereKennung(e).ok).toBe(false);
    }
  );
});

describe("Demo-Verzeichnis", () => {
  it("liefert Name und Rolle aus dem Verzeichnis", () => {
    const r = imVerzeichnisSuchen("jpxnl");
    expect(r).toEqual({
      ok: true,
      eintrag: { kennung: "JPXNL", name: "Rina Sommerau", rolle: "linienleitung" },
    });
  });
  it("unbekannte Kennung ergibt klaren Fehler", () => {
    const r = imVerzeichnisSuchen("zzzzz");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fehler).toContain("ZZZZZ ist im Verzeichnis nicht bekannt");
  });
  it("alle Einträge haben gültige Kennungen und decken alle Rollen ab", () => {
    for (const e of DEMO_VERZEICHNIS) expect(e.kennung).toMatch(/^[A-Z]{5}$/);
    expect(new Set(DEMO_VERZEICHNIS.map((e) => e.rolle)).size).toBe(4);
  });
});
