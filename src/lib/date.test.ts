import {
  formatDauer,
  formatZeitstempel,
  heuteBerlin,
  schichtAusUhrzeit,
  tageAddieren,
  zeitpunktBerlin,
} from "./date";

describe("Europe/Berlin", () => {
  it("heute nach Berliner Zeit, nicht UTC", () => {
    expect(heuteBerlin(new Date("2026-10-10T22:30:00Z"))).toBe("2026-10-11");
  });
  it("Schicht aus Uhrzeit (Berlin)", () => {
    expect(schichtAusUhrzeit(new Date("2026-10-11T04:00:00Z"))).toBe("Frueh"); // 06:00
    expect(schichtAusUhrzeit(new Date("2026-10-11T03:59:00Z"))).toBe("Nacht"); // 05:59
    expect(schichtAusUhrzeit(new Date("2026-10-11T12:00:00Z"))).toBe("Spaet"); // 14:00
    expect(schichtAusUhrzeit(new Date("2026-10-11T20:00:00Z"))).toBe("Nacht"); // 22:00
  });
  it("zeitpunktBerlin beachtet Sommer-/Winterzeit", () => {
    expect(zeitpunktBerlin("2026-10-11", 6).toISOString()).toBe(
      "2026-10-11T04:00:00.000Z"
    );
    expect(zeitpunktBerlin("2026-12-01", 6).toISOString()).toBe(
      "2026-12-01T05:00:00.000Z"
    );
  });
  it("Formatierung", () => {
    expect(formatZeitstempel("2026-10-11T04:05:00Z")).toBe("11.10.2026, 06:05");
    expect(formatDauer(45 * 60000)).toBe("45 Min.");
    expect(formatDauer(125 * 60000)).toBe("2 Std. 05 Min.");
    expect(tageAddieren("2026-03-01", -1)).toBe("2026-02-28");
  });
});
