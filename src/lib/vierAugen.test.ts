import { describe, expect, it } from "vitest";
import { bereiche } from "./ablauf";
import { freigabeSetzen, schichtStarten, statusMelden } from "./schicht";
import { leereDatenbank } from "./seed";
import { istAbnahmeSchritt, vierAugenFehler } from "./vierAugen";
import { linienleitung, sig } from "@/test/testdaten";

function start() {
  const r = schichtStarten(
    leereDatenbank(),
    { datum: "2026-10-26", schichtTyp: "Frueh", linie: "L1" },
    sig()
  );
  // lift the step lock so the release step can be reported directly
  const db = freigabeSetzen(r.db, r.id, true, linienleitung(), "Test Freigabe");
  const s = db.schichten.find((x) => x.id === r.id)!;
  const a = bereiche(s)
    .flatMap((b) => b.aufgaben)
    .find((x) => istAbnahmeSchritt(x.aktivitaet.name))!;
  return { db, id: r.id, aufgabe: a.aktivitaet.id };
}

describe("4-Augen-Prinzip Abnahme", () => {
  it("erkennt Freigabe-Schritte, nicht die Kontrolle", () => {
    expect(istAbnahmeSchritt("Erstmusterfreigabe (Vier-Augen)")).toBe(true);
    expect(istAbnahmeSchritt("Palettenfreigabe (Vier-Augen)")).toBe(true);
    expect(istAbnahmeSchritt("Freigabe prüfen")).toBe(false);
    expect(istAbnahmeSchritt("Siegelnaht-Test")).toBe(false);
  });
  it("Validierung: beide nötig, verschieden (Groß/Klein egal)", () => {
    expect(vierAugenFehler(undefined)).toMatch(/zwei Prüfer/);
    expect(vierAugenFehler({ erster: "QXZTW", zweiter: " " })).toMatch(/zwei Prüfer/);
    expect(vierAugenFehler({ erster: "QXZTW", zweiter: "qxztw " })).toMatch(
      /verschiedene/
    );
    expect(vierAugenFehler({ erster: "QXZTW", zweiter: "VBKRY" })).toBeNull();
  });
  it("Abnahme erst erledigt mit zwei verschiedenen Prüfern; gespeichert am Ereignis", () => {
    const k = start();
    expect(() => statusMelden(k.db, k.id, k.aufgabe, "done", "", sig())).toThrow(
      /zwei Prüfer/
    );
    expect(() =>
      statusMelden(k.db, k.id, k.aufgabe, "done", "", sig(), {
        erster: "QXZTW",
        zweiter: "QXZTW",
      })
    ).toThrow(/verschiedene/);
    const db = statusMelden(k.db, k.id, k.aufgabe, "done", "", sig(), {
      erster: "QXZTW",
      zweiter: " VBKRY ",
    });
    const e = db.schichten.find((x) => x.id === k.id)!.ereignisse.at(-1)!;
    expect(e.pruefer).toEqual({ erster: "QXZTW", zweiter: "VBKRY" });
  });
  it("blockiert melden geht ohne Prüfer", () => {
    const k = start();
    expect(() => statusMelden(k.db, k.id, k.aufgabe, "blocked", "", sig())).not.toThrow();
  });
});

import { sitzungBauen } from "./training/demo";
import { WISSENSKARTEN } from "./wissen";
describe("4-Augen-Prinzip: Bericht und Wissen", () => {
  it("Trainingssitzung führt beide Prüfer bei der Abnahme", () => {
    const s = sitzungBauen({
      id: "t",
      datum: "2026-10-26",
      schichtTyp: "Frueh",
      kennung: "QXZTW",
      name: "",
      bereich: "Primary",
      auftragsWechsel: 0,
    });
    const ab = s.schritte.find((x) => istAbnahmeSchritt(x.schritt));
    expect(ab?.pruefer).toEqual({ erster: "QXZTW", zweiter: "WMZQD" });
  });
  it("Wissen enthält den Hinweis", () => {
    expect(WISSENSKARTEN.some((n) => /Vier-Augen/.test(n.titel))).toBe(true);
  });
});
