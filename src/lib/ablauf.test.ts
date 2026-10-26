import {
  bereiche,
  blaetter,
  letztesEreignis,
  standardBereich,
  statistik,
} from "./ablauf";
import {
  freigabeSetzen,
  schichtStarten,
  statusMelden,
  type StartEingabe,
} from "./schicht";
import { leereDatenbank, vorlageSchritte, vorlageUmfang } from "./seed";
import type { Datenbank, Schicht } from "./schema";
import { sig, linienleitung, PRUEFER } from "@/test/testdaten";

function start(e: Partial<StartEingabe> = {}): {
  db: Datenbank;
  id: number;
  s(): Schicht;
} {
  const r = schichtStarten(
    leereDatenbank(),
    { datum: "2026-10-11", schichtTyp: "Frueh", linie: "L1", ...e },
    sig()
  );
  return {
    db: r.db,
    id: r.id,
    s() {
      return this.db.schichten.find((x) => x.id === r.id)!;
    },
  };
}

const aufgabe = (s: Schicht, name: string, bereich = 0) => {
  const a = bereiche(s)[bereich]!.aufgaben.find((x) => x.aktivitaet.name === name);
  if (!a) throw new Error(name);
  return a;
};

describe("Ablauf", () => {
  it("Primary/Secondary: Bereiche und Aufgaben laut Vorlage (Standard-Wechselart)", () => {
    const p = start();
    const up = vorlageUmfang("Primary");
    expect(bereiche(p.s()).map((x) => x.name)).toEqual(up.bereiche);
    expect(bereiche(p.s()).every((x) => x.rootName === "Primary")).toBe(true);
    expect(blaetter(p.s())).toHaveLength(up.aufgaben);
    expect(statistik(p.s())).toMatchObject({
      gesamt: up.aufgaben,
      offen: up.aufgaben,
      prozent: 0,
    });
    const s = start({ arbeitsbereich: "Secondary" });
    const us = vorlageUmfang("Secondary");
    expect(bereiche(s.s()).map((x) => x.name)).toEqual(us.bereiche);
    expect(blaetter(s.s())).toHaveLength(us.aufgaben);
    expect(s.s().aktivitaeten.some((a) => a.name === "Primary")).toBe(false);
  });

  it("Bereiche sind unabhängig: jeder Bereich hat einen eigenen nächsten Schritt", () => {
    const k = start();
    const b = bereiche(k.s());
    for (const x of b) {
      expect(x.aufgaben[0]).toMatchObject({ istNaechste: true, gesperrt: false });
      expect(x.zustand).toBe("offen");
    }
    expect(b[0]!.aufgaben[1]).toMatchObject({
      gesperrt: true,
      grund: "aufgabe",
      gesperrtDurch: "Übergabenotiz lesen",
    });
    // Produktion ist ohne Schichtstart bedienbar
    const prod = b[1]!.aufgaben[0]!.aktivitaet.id;
    k.db = statusMelden(k.db, k.id, prod, "done", "", sig(), PRUEFER);
    expect(bereiche(k.s())[1]!.zustand).toBe("in_arbeit");
  });

  it("blockiert löst nicht auf; übersprungen löst auf", () => {
    const k = start();
    k.db = statusMelden(
      k.db,
      k.id,
      aufgabe(k.s(), "Übergabenotiz lesen").aktivitaet.id,
      "blocked",
      "x",
      sig(),
      PRUEFER
    );
    expect(aufgabe(k.s(), "Übergabenotiz lesen").istNaechste).toBe(true);
    expect(aufgabe(k.s(), "Persönliche Hygiene prüfen").gesperrt).toBe(true);
    k.db = statusMelden(
      k.db,
      k.id,
      aufgabe(k.s(), "Übergabenotiz lesen").aktivitaet.id,
      "skipped",
      "",
      sig(),
      PRUEFER
    );
    expect(aufgabe(k.s(), "Persönliche Hygiene prüfen")).toMatchObject({
      gesperrt: false,
      istNaechste: true,
    });
    expect(statistik(k.s())).toMatchObject({ uebersprungen: 1, erledigt: 0, prozent: 0 });
  });

  it("kompletter Bereich: Zustand abgeschlossen, Standardauswahl springt weiter", () => {
    const k = start();
    for (const a of bereiche(k.s())[0]!.aufgaben)
      k.db = statusMelden(k.db, k.id, a.aktivitaet.id, "done", "", sig(), PRUEFER);
    const b = bereiche(k.s());
    expect(b[0]!.zustand).toBe("abgeschlossen");
    expect(standardBereich(b)).toBe(b[1]!.aktivitaet.id);
    const n = vorlageSchritte("Primary", "Schichtstart").length;
    expect(statistik(k.s()).prozent).toBe(
      Math.round((n / vorlageUmfang("Primary").aufgaben) * 100)
    );
  });

  it("letztes Ereignis gewinnt (Zeit, dann ID)", () => {
    const k = start();
    const id = aufgabe(k.s(), "Übergabenotiz lesen").aktivitaet.id;
    k.db = statusMelden(k.db, k.id, id, "blocked", "", sig(), PRUEFER);
    k.db = statusMelden(k.db, k.id, id, "done", "", sig(), PRUEFER);
    expect(letztesEreignis(k.s(), id)?.status).toBe("done");
    expect(aufgabe(k.s(), "Übergabenotiz lesen").verlauf.map((e) => e.status)).toEqual([
      "done",
      "blocked",
    ]);
  });

  it("Freigabe der Linienleitung hebt Schritt-Sperren auf", () => {
    const k = start();
    k.db = freigabeSetzen(k.db, k.id, true, linienleitung(), "Technik parallel");
    const t = bereiche(k.s())[0]!.aufgaben[3]!;
    expect(t).toMatchObject({ gesperrt: false, kaskadenGesperrt: true });
  });

  it("Einstieg laufender Auftrag: Schichtstart durch Vorschicht erledigt, Übergabe der Vorschicht vorhanden", () => {
    const k = start({ einstieg: "laufender_auftrag" });
    const b = bereiche(k.s());
    expect(b[0]!.zustand).toBe("vorschicht");
    expect(b[0]!.aufgaben.every((a) => a.vonVorschicht && a.status === "done")).toBe(
      true
    );
    expect(b[1]!.zustand).toBe("offen");
    expect(standardBereich(b)).toBe(b[1]!.aktivitaet.id);
    const s = k.s();
    expect(s.notizen[0]).toMatchObject({
      art: "handover",
      signiert: { kennung: "VORSC" },
    });
    expect(Date.parse(s.notizen[0]!.signiert.zeit)).toBeLessThan(
      Date.parse(s.gestartet.zeit)
    );
    expect(s.verlauf.map((v) => v.art)).toEqual([
      "schicht_gestartet",
      "vorschicht_uebernommen",
    ]);
  });

  it("Einstieg Auftragsende (Secondary): Schichtstart und Produktion vorbelegt", () => {
    const k = start({ einstieg: "auftrag_ende", arbeitsbereich: "Secondary" });
    const b = bereiche(k.s());
    expect(b[0]!.zustand).toBe("vorschicht");
    expect(b[1]!.zustand).toBe("vorschicht");
    expect(b.slice(2).every((x) => x.zustand !== "vorschicht")).toBe(true);
    expect(statistik(k.s())).toMatchObject({
      gesamt: vorlageUmfang("Secondary").aufgaben,
      erledigt: b[0]!.gesamt + b[1]!.gesamt,
    });
  });
});
