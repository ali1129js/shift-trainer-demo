import { bereiche } from "./ablauf";
import { WorkflowFehler } from "./fehler";
import {
  freigabeSetzen,
  notizErfassen,
  schichtAbschliessen,
  schichtStarten,
  schichtWiedereroeffnen,
  statusMelden,
} from "./schicht";
import { leereDatenbank, vorlageUmfang } from "./seed";
import type { Datenbank } from "./schema";
import { trainer, sig, linienleitung, pruefer, PRUEFER } from "@/test/testdaten";

function neu() {
  const r = schichtStarten(
    leereDatenbank(),
    { datum: "2026-10-11", schichtTyp: "Spaet", linie: "L2" },
    sig()
  );
  return r;
}
const schicht = (db: Datenbank, id: number) => db.schichten.find((s) => s.id === id)!;
const aufgabeId = (db: Datenbank, id: number, b: number, i: number) =>
  bereiche(schicht(db, id))[b]!.aufgaben[i]!.aktivitaet.id;

describe("Schicht-Operationen", () => {
  it("Start ist signiert, im Verlauf und kopiert nur nicht-archivierte Aktivitäten", () => {
    const basis = leereDatenbank();
    basis.aktivitaeten.find((a) => a.name === "Übergabenotiz lesen")!.archiviert = true;
    const { db, id } = schichtStarten(
      basis,
      { datum: "2026-10-11", schichtTyp: "Frueh", linie: "L1" },
      sig()
    );
    const s = schicht(db, id);
    expect(s.gestartet.kennung).toBe("QXZTW");
    expect(s.aktivitaeten).toHaveLength(vorlageUmfang("Primary").knoten - 1); // ohne archivierten Schritt
    expect(s.verlauf[0]).toMatchObject({
      art: "schicht_gestartet",
      signiert: { kennung: "QXZTW" },
    });
    // eindeutige IDs über globalen Zähler
    const ids = [
      id,
      ...s.aktivitaeten.map((a) => a.id),
      ...s.verlauf.map((v) => v.id),
      ...basis.aktivitaeten.map((a) => a.id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("ist unveränderlich (Eingabe-DB bleibt gleich)", () => {
    const { db, id } = neu();
    const vorher = JSON.stringify(db);
    statusMelden(db, id, aufgabeId(db, id, 0, 0), "done", "", sig(), PRUEFER);
    expect(JSON.stringify(db)).toBe(vorher);
  });

  it("Statusmeldung signiert, mit Notiz, append-only im Verlauf", () => {
    const start = neu();
    let db = start.db;
    const id = start.id;
    db = statusMelden(
      db,
      id,
      aufgabeId(db, id, 0, 0),
      "done",
      "  alles ok ",
      sig("VBKRY", "bediener", "Okan Feldberg"),
      PRUEFER
    );
    const s = schicht(db, id);
    expect(s.ereignisse[0]).toMatchObject({
      status: "done",
      notiz: "alles ok",
      ueberSperre: false,
      signiert: { kennung: "VBKRY" },
    });
    expect(s.verlauf.at(-1)).toMatchObject({
      art: "status_gemeldet",
      text: "Übergabenotiz lesen: Erledigt – alles ok",
    });
  });

  it("gesperrte Aufgabe wird abgelehnt", () => {
    const { db, id } = neu();
    expect(() =>
      statusMelden(db, id, aufgabeId(db, id, 0, 1), "done", "", sig(), PRUEFER)
    ).toThrow(/wartet auf »Übergabenotiz lesen«/);
  });

  it("Freigabe nur für Linienleitung, mit Begründung, im Verlauf; Meldungen markiert", () => {
    const start = neu();
    let db = start.db;
    const id = start.id;
    expect(() => freigabeSetzen(db, id, true, sig(), "x y z")).toThrow(WorkflowFehler);
    expect(() => freigabeSetzen(db, id, true, pruefer(), "x y z")).toThrow(
      /Nur die Linienleitung/
    );
    expect(() => freigabeSetzen(db, id, true, linienleitung(), "")).toThrow(/Begründung/);
    expect(() => freigabeSetzen(db, id, true, trainer(), "x y z")).toThrow(
      /Linienleitung/
    );
    db = freigabeSetzen(db, id, true, linienleitung(), "Messmittel kommt");
    db = statusMelden(db, id, aufgabeId(db, id, 0, 1), "done", "", sig(), PRUEFER);
    let s = schicht(db, id);
    expect(s.freigabe?.kennung).toBe("JPXNL");
    expect(s.ereignisse[0]!.ueberSperre).toBe(true);
    db = freigabeSetzen(db, id, false, linienleitung());
    s = schicht(db, id);
    expect(s.freigabe).toBeNull();
    expect(s.verlauf.map((v) => v.art)).toEqual([
      "schicht_gestartet",
      "freigabe_erteilt",
      "status_gemeldet",
      "freigabe_beendet",
    ]);
    expect(s.verlauf[1]!.text).toContain("Messmittel kommt");
  });

  it("Abschluss sperrt Meldungen, Notizen bleiben möglich; Wiedereröffnen nur Vorgesetzte", () => {
    const start = neu();
    let db = start.db;
    const id = start.id;
    db = schichtAbschliessen(db, id, sig());
    expect(() =>
      statusMelden(db, id, aufgabeId(db, id, 0, 0), "done", "", sig(), PRUEFER)
    ).toThrow(/abgeschlossen/);
    db = notizErfassen(db, id, "info", "Nachtrag", sig());
    expect(() => schichtWiedereroeffnen(db, id, sig(), "Fehler")).toThrow(
      /Nur die Linienleitung/
    );
    expect(() => schichtWiedereroeffnen(db, id, linienleitung(), "")).toThrow(
      /Begründung/
    );
    db = schichtWiedereroeffnen(db, id, linienleitung(), "Meldung fehlte");
    expect(schicht(db, id).abgeschlossen).toBeNull();
    expect(schicht(db, id).verlauf.at(-1)!.art).toBe("schicht_wiedereroeffnet");
  });

  it("Notiz braucht mindestens 3 Zeichen", () => {
    const { db, id } = neu();
    expect(() => notizErfassen(db, id, "handover", " ab ", sig())).toThrow(
      /mindestens 3/
    );
  });

  it("unbekannte Schicht", () => {
    expect(() => notizErfassen(leereDatenbank(), 999, "info", "abc", sig())).toThrow(
      /nicht gefunden/
    );
  });
});

describe("Erledigt nur einmal, Lauf endet sauber", () => {
  it("ein erledigter Schritt kann nicht erneut als erledigt gemeldet werden", () => {
    const r = neu();
    const a = aufgabeId(r.db, r.id, 0, 0);
    const db = statusMelden(r.db, r.id, a, "done", "", sig(), PRUEFER);
    const n = schicht(db, r.id).ereignisse.length;
    const v = schicht(db, r.id).verlauf.length;
    expect(() => statusMelden(db, r.id, a, "done", "", sig(), PRUEFER)).toThrow(
      /bereits erledigt/
    );
    expect(schicht(db, r.id).ereignisse.length).toBe(n);
    expect(schicht(db, r.id).verlauf.length).toBe(v);
  });

  it("nach dem letzten Schritt ist nichts mehr offen – kein endloser nächster Schritt", async () => {
    const { statistik } = await import("./ablauf");
    const r = neu();
    let db = r.db;
    const id = r.id;
    for (let runde = 0; runde < 20; runde++) {
      for (const b of bereiche(schicht(db, id)))
        for (const x of b.aufgaben) {
          if (x.status === "done" || x.status === "skipped" || x.gesperrt) continue;
          try {
            db = statusMelden(db, id, x.aktivitaet.id, "done", "ok", sig(), PRUEFER);
          } catch {
            try {
              db = statusMelden(db, id, x.aktivitaet.id, "skipped", "Test", sig());
            } catch {
              /* bleibt offen */
            }
          }
        }
      if (statistik(schicht(db, id)).offen === 0) break;
    }
    const st = statistik(schicht(db, id));
    expect(st.offen).toBe(0);
    expect(schicht(db, id).ereignisse.length).toBe(st.gesamt);
    for (const b of bereiche(schicht(db, id)))
      expect(b.aufgaben.some((a) => a.istNaechste)).toBe(false);
  });
});
