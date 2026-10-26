import { berichtCsv, csvDateiname } from "./csv";
import { notizErfassen, schichtStarten } from "./schicht";
import { leereDatenbank, vorlageUmfang } from "./seed";
import { sig } from "@/test/testdaten";

describe("CSV", () => {
  it("BOM, Semikolon, Quoting, CRLF, Übergabe ohne Zeilenumbrüche", () => {
    const start = schichtStarten(
      leereDatenbank(),
      { datum: "2026-10-11", schichtTyp: "Nacht", linie: "L4" },
      sig()
    );
    let db = start.db;
    const id = start.id;
    db = notizErfassen(db, id, "handover", 'Linie "läuft";\nZeile 2', sig());
    const csv = berichtCsv(db.schichten);
    expect(csv.startsWith('\uFEFF"Datum";"Schicht"')).toBe(true);
    const zeilen = csv.slice(1).split("\r\n");
    expect(zeilen).toHaveLength(3);
    const n = vorlageUmfang("Primary").aufgaben;
    expect(zeilen[1]).toBe(
      `"2026-10-11";"Nachtschicht";"L4";"Primary";"Auftragsbeginn";"QXZTW";"Tilda Morgenstern";"Offen";"${n}";"0";"0";"0";"${n}";"0";"Linie ""läuft""; Zeile 2";"QXZTW"`
    );
  });
  it("Dateiname mit Berliner Datum", () => {
    expect(csvDateiname(new Date("2026-10-10T22:30:00Z"))).toBe(
      "schichtbericht-2026-10-11.csv"
    );
  });
});
