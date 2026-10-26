import { describe, expect, it } from "vitest";
import {
  kennungAkte,
  kennungsVon,
  freigabeStatus,
  gewerteteFehler,
  reihenfolgeFehler,
  schichtBericht,
  schwachstellen,
} from "./auswertung";
import { ablaufVon, demoSitzungen, sitzungBauen } from "./demo";
import { PLATZHALTER_EINSTELLUNGEN as E, trainingsSitzungSchema } from "./schema";

const basis = {
  datum: "2026-10-01",
  schichtTyp: "Frueh" as const,
  kennung: "QXZTW",
  name: "Tilda Morgenstern",
  bereich: "Primary" as const,
};

describe("reihenfolgeFehler", () => {
  it("is empty for a flow completed in order", () => {
    const s = sitzungBauen({ ...basis, id: "a", auftragsWechsel: 1 });
    expect(reihenfolgeFehler(s.schritte)).toEqual([]);
  });
  it("flags the step done after a later step (swap)", () => {
    const s = sitzungBauen({
      ...basis,
      id: "a",
      auftragsWechsel: 1,
      abw: { "Schichtstart/Persönliche Hygiene prüfen": { vertauscht: true } },
    });
    const r = reihenfolgeFehler(s.schritte);
    expect(r.map((x) => x.schritt)).toEqual(["Persönliche Hygiene prüfen"]);
  });
  it("ignores skipped steps and evaluates sections independently", () => {
    const s = sitzungBauen({
      ...basis,
      id: "a",
      auftragsWechsel: 1,
      abw: { "Schichtstart/Übergabenotiz lesen": { ergebnis: "uebersprungen" } },
    });
    expect(reihenfolgeFehler(s.schritte)).toEqual([]);
  });
});

describe("schichtBericht", () => {
  it("lists only exceptions and counts them", () => {
    const s = demoSitzungen().find((x) => x.id === "demo-5")!;
    const b = schichtBericht(s, E);
    expect(b.fehler.map((x) => x.schritt)).toEqual(["Erstmusterfreigabe (Vier-Augen)"]);
    expect(b.blockiert.map((x) => x.schritt)).toEqual(["Material bereitstellen"]);
    expect(b.reihenfolge).toEqual([]);
    expect(b.zaehler.uebergabeFehlt).toBe(1);
    expect(b.zaehler.ausserplan).toBe(2);
    expect(b.zaehler.gewerteteFehler).toBe(2);
    expect(b.zaehler.schritte).toBe(
      ablaufVon("Primary").flatMap((a) => a.schritte).length
    );
    expect(b.ohneBefund).toBe(false);
  });
  it("reports 'ohne Befund' for a clean session", () => {
    const b = schichtBericht(sitzungBauen({ ...basis, id: "x", auftragsWechsel: 1 }), E);
    expect(b.ohneBefund).toBe(true);
    expect(b.zaehler.ok).toBe(b.zaehler.schritte);
  });
  it("missed handover counts as error only when configured", () => {
    const s = sitzungBauen({
      ...basis,
      id: "x",
      auftragsWechsel: 1,
      uebergaben: [{ bezug: "x", status: "fehlt", text: "" }],
    });
    expect(gewerteteFehler(s, { fehlendeUebergabeIstFehler: true })).toBe(1);
    expect(gewerteteFehler(s, { fehlendeUebergabeIstFehler: false })).toBe(0);
  });
});

describe("schwachstellen", () => {
  it("finds steps with problems in ≥2 sessions, most frequent first", () => {
    const w = schwachstellen(demoSitzungen().filter((s) => s.kennung === "QXZTW"));
    expect(w.map((x) => [x.schritt, x.sitzungen])).toEqual([["Folienrolle wechseln", 2]]);
  });
  it("counts a step once per session and keeps areas apart", () => {
    const a = sitzungBauen({
      ...basis,
      id: "1",
      auftragsWechsel: 0,
      abw: { "Schichtstart/Übergabenotiz lesen": { ergebnis: "fehler" } },
    });
    const b = sitzungBauen({
      ...basis,
      id: "2",
      bereich: "Secondary",
      auftragsWechsel: 0,
    });
    expect(schwachstellen([a, b])).toEqual([]);
    expect(schwachstellen([a, { ...a, id: "3" }])[0]?.sitzungen).toBe(2);
  });
});

describe("freigabeStatus / kennungAkte", () => {
  it("separate release per area by default", () => {
    const akte = kennungAkte(demoSitzungen(), "QXZTW", E);
    expect(akte.auftragsWechselJeBereich).toEqual({ Primary: 11, Secondary: 2 });
    expect(akte.freigaben.map((f) => f.umfang)).toEqual(["Primary", "Secondary"]);
    const p = akte.freigaben[0]!;
    expect(p.fehlerImFenster).toBe(1 + 0 + 2); // demo-2, demo-3, demo-5
    expect(p.freigabefaehig).toBe(false);
    expect(akte.verlauf.at(-1)?.auftragsWechselKumuliert).toBe(11);
  });
  it("releases a clean trainee meeting all thresholds", () => {
    const akte = kennungAkte(demoSitzungen(), "VBKRY", E);
    expect(akte.freigaben).toHaveLength(1);
    expect(akte.freigaben[0]!.freigabefaehig).toBe(true);
  });
  it("combined release when getrennteFreigabe is off", () => {
    const akte = kennungAkte(demoSitzungen(), "QXZTW", {
      ...E,
      getrennteFreigabe: false,
    });
    expect(akte.freigaben.map((f) => f.umfang)).toEqual(["Gesamt"]);
    expect(akte.freigaben[0]!.auftragsWechsel).toBe(13);
  });
  it("thresholds are respected", () => {
    const s = demoSitzungen().filter((x) => x.kennung === "QXZTW");
    const locker = {
      ...E,
      maxFehler: 5,
      minAuftragsWechsel: 5,
      fehlendeUebergabeIstFehler: false,
    };
    expect(freigabeStatus(s, "Primary", locker).freigabefaehig).toBe(true);
    expect(freigabeStatus([], "Primary", E).freigabefaehig).toBe(false);
  });
  it("lists Kennungen and demo data is schema-valid", () => {
    expect(kennungsVon(demoSitzungen())).toEqual(["QXZTW", "VBKRY"]);
    for (const s of demoSitzungen()) expect(trainingsSitzungSchema.parse(s)).toEqual(s);
  });
});
