import { bereiche, letzteUebergabe, statistik } from "./ablauf";
import { DEMO_VERZEICHNIS } from "./identitaet";
import { fehlendeUebergaben } from "./uebergabe";
import { demoDatenbank, leereDatenbank, vorlageAktivitaeten } from "./seed";
import { datenbankSchema } from "./schema";
import { VORSCHICHT_KENNUNG } from "./schicht";
import { istAbnahmeSchritt } from "./vierAugen";

describe("Seed", () => {
  it("Vorlage depth-first ab ID 1, Farbe vom Elternknoten", () => {
    const v = vorlageAktivitaeten();
    expect(v[0]).toMatchObject({ id: 1, name: "Primary", parentId: null, farbe: "blue" });
    expect(v[1]).toMatchObject({
      id: 2,
      name: "Schichtstart",
      parentId: 1,
      farbe: "blue",
    });
    expect(v[2]).toMatchObject({
      id: 3,
      name: "Übergabenotiz lesen",
      parentId: 2,
      farbe: "blue",
    });
    expect(v.find((a) => a.name === "Secondary")?.farbe).toBe("green");
    expect(v.filter((a) => istAbnahmeSchritt(a.name)).map((a) => a.name)).toEqual([
      "Erstmusterfreigabe (Vier-Augen)",
      "Palettenfreigabe (Vier-Augen)",
    ]);
    expect(leereDatenbank().nextId).toBe(v.length + 1);
  });

  const jetzt = new Date("2026-10-11T08:00:00Z");
  const db = demoDatenbank(jetzt);

  it("ist schema-gültig, nur fiktive Personen", () => {
    expect(datenbankSchema.safeParse(db).success).toBe(true);
    const kennungen = new Set([
      ...DEMO_VERZEICHNIS.map((d) => d.kennung),
      VORSCHICHT_KENNUNG,
    ]);
    for (const s of db.schichten)
      for (const v of s.verlauf) expect(kennungen.has(v.signiert.kennung)).toBe(true);
  });

  it("3 abgeschlossene + 2 offene Schichten (Bereich A + B), jede mit Übergabe", () => {
    expect(db.schichten.filter((s) => s.abgeschlossen)).toHaveLength(3);
    const offen = db.schichten.filter((s) => !s.abgeschlossen);
    expect(offen.map((s) => [s.linie, s.arbeitsbereich, s.einstieg])).toEqual([
      ["L3", "Primary", "auftrag_ende"],
      ["L3", "Secondary", "laufender_auftrag"],
    ]);
    expect(offen[0]).toMatchObject({ datum: "2026-10-11", schichtTyp: "Frueh" });
    for (const s of db.schichten) expect(letzteUebergabe(s)).not.toBeNull();
    expect(statistik(offen[0]!).blockiert).toBe(1);
  });

  it("offene Bereich-A-Schicht: blockiert ist »Restmaterial zurückbuchen«, Übergabe fehlt", () => {
    const s = db.schichten.find(
      (x) => !x.abgeschlossen && x.arbeitsbereich === "Primary"
    )!;
    const b = bereiche(s)
      .flatMap((x) => x.aufgaben)
      .filter((a) => a.status === "blocked");
    expect(b.map((a) => a.aktivitaet.name)).toEqual(["Restmaterial zurückbuchen"]);
    expect(fehlendeUebergaben(s).map((f) => f.anlass)).toEqual(["Blockiert"]);
  });

  it("Ereignisse liegen nicht in der Zukunft", () => {
    for (const s of db.schichten)
      for (const v of s.verlauf)
        expect(Date.parse(v.signiert.zeit)).toBeLessThanOrEqual(jetzt.getTime());
  });

  it("Szenario mit Linienleitungs-Freigabe ist im Verlauf nachvollziehbar", () => {
    const s = db.schichten.find((x) =>
      x.verlauf.some((v) => v.art === "freigabe_erteilt")
    )!;
    expect(
      s.verlauf.some(
        (v) => v.art === "freigabe_erteilt" && v.signiert.rolle === "linienleitung"
      )
    ).toBe(true);
    expect(s.meldungen.map((m) => m.ereignis)).toEqual(["Folienriss"]);
    expect(s.freigabe).toBeNull();
  });

  it("Vier-Augen-Freigaben in Demo-Schichten haben zwei verschiedene Prüfer", () => {
    const ev = db.schichten.flatMap((s) => s.ereignisse.filter((e) => e.pruefer));
    expect(ev.length).toBeGreaterThan(0);
    for (const e of ev) expect(e.pruefer!.erster).not.toBe(e.pruefer!.zweiter);
  });
});
