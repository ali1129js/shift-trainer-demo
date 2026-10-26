import { bereiche } from "./ablauf";
import { ereignisMelden, notizErfassen, schichtStarten, statusMelden } from "./schicht";
import { demoDatenbank, leereDatenbank } from "./seed";
import {
  ausloeser,
  fehlendeUebergaben,
  uebergabeVorlage,
  uebergabenNachAufgabe,
} from "./uebergabe";
import type { Datenbank } from "./schema";
import { sig, PRUEFER } from "@/test/testdaten";

function neu() {
  const r = schichtStarten(
    leereDatenbank(),
    { datum: "2026-10-11", schichtTyp: "Frueh", linie: "L1" },
    sig()
  );
  return r;
}
const s = (db: Datenbank, id: number) => db.schichten.find((x) => x.id === id)!;
const erste = (db: Datenbank, id: number) =>
  bereiche(s(db, id))[0]!.aufgaben[0]!.aktivitaet.id;

describe("Übergabe-Training", () => {
  it("übersprungene Aufgabe ohne Übergabe fehlt; verknüpfte Übergabe danach erfüllt", () => {
    const r = neu();
    const a = erste(r.db, r.id);
    let db = statusMelden(r.db, r.id, a, "skipped", "", sig(), PRUEFER);
    expect(fehlendeUebergaben(s(db, r.id))).toMatchObject([
      { schichtAktivitaetId: a, aufgabe: "Übergabenotiz lesen", anlass: "Übersprungen" },
    ]);
    // unverknüpfte Notiz reicht nicht
    db = notizErfassen(db, r.id, "handover", "Übergabenotiz übersprungen", sig());
    expect(fehlendeUebergaben(s(db, r.id))).toHaveLength(1);
    db = notizErfassen(
      db,
      r.id,
      "handover",
      "Übergabenotiz übersprungen, weil …",
      sig(),
      [a]
    );
    expect(fehlendeUebergaben(s(db, r.id))).toHaveLength(0);
  });

  it("Ereignis nach der Übergabe-Notiz gilt wieder als fehlend", () => {
    const r = neu();
    const a = erste(r.db, r.id);
    let db = notizErfassen(r.db, r.id, "handover", "Vorab-Info", sig(), [a]);
    db = ereignisMelden(db, r.id, a, "Folienriss", sig());
    expect(fehlendeUebergaben(s(db, r.id))[0]?.anlass).toBe("Folienriss");
    expect(s(db, r.id).verlauf.at(-1)?.art).toBe("ereignis_gemeldet");
  });

  it("erledigt löst keinen Übergabe-Bedarf aus; blockiert dann erledigt auch nicht", () => {
    const r = neu();
    const a = erste(r.db, r.id);
    let db = statusMelden(r.db, r.id, a, "blocked", "", sig(), PRUEFER);
    db = statusMelden(db, r.id, a, "done", "", sig(), PRUEFER);
    expect(ausloeser(s(db, r.id))).toHaveLength(0);
  });

  it("Notiz mit fremder Aufgabe wird abgelehnt", () => {
    const r = neu();
    expect(() => notizErfassen(r.db, r.id, "handover", "abc", sig(), [99999])).toThrow(
      /gehört nicht/
    );
  });

  it("Gruppierung nach Aufgabe + Allgemein", () => {
    const r = neu();
    const a = erste(r.db, r.id);
    let db = notizErfassen(r.db, r.id, "handover", "zur Übergabenotiz", sig(), [a]);
    db = notizErfassen(db, r.id, "handover", "allgemein", sig());
    db = notizErfassen(db, r.id, "info", "keine Übergabe", sig(), [a]);
    const g = uebergabenNachAufgabe(s(db, r.id));
    expect(g.map((x) => [x.titel, x.notizen.length])).toEqual([
      ["Bereich A · Schichtstart · Übergabenotiz lesen", 1],
      ["Allgemein", 1],
    ]);
  });

  it("Vorlage enthält Aufgabe und Anlass", () => {
    expect(uebergabeVorlage("Siegelnaht-Test", "Folienriss")).toContain(
      "Siegelnaht-Test – Folienriss."
    );
  });

  it("Demo: abgeschlossene Schichten haben keine fehlende Übergabe", () => {
    const db = demoDatenbank(new Date("2026-10-11T08:00:00Z"));
    for (const x of db.schichten.filter((y) => y.abgeschlossen))
      expect(fehlendeUebergaben(x)).toEqual([]);
  });
});
