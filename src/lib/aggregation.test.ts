import { describe, expect, it } from "vitest";
import { AGGREGATION_INHALT, hatInhalt } from "./aggregation";

describe("Aggregation (Platzhalter)", () => {
  it("ist noch leer", () => {
    expect(AGGREGATION_INHALT.abschnitte).toEqual([]);
    expect(hatInhalt()).toBe(false);
  });
  it("Struktur erlaubt verschachtelte Abschnitte", () => {
    expect(
      hatInhalt({
        abschnitte: [
          {
            id: "a",
            titel: "A",
            punkte: [],
            unterabschnitte: [{ id: "b", titel: "B", punkte: ["x"] }],
          },
        ],
      })
    ).toBe(true);
  });
});
