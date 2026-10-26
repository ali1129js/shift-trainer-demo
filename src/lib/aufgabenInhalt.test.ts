import { describe, expect, it } from "vitest";
import { BEREICH_INHALT, inhaltFuer } from "./aufgabenInhalt";
import { VORLAGE } from "./seed";

describe("Aufgabeninhalt", () => {
  it("every template step has a description and a reason", () => {
    for (const root of VORLAGE)
      for (const b of root.kinder ?? []) {
        if (typeof b === "string") continue;
        expect(BEREICH_INHALT[`${root.name} / ${b.name}`]).toBeTruthy();
        for (const k of b.kinder ?? []) {
          const name = typeof k === "string" ? k : k.name;
          const i = inhaltFuer(root.name, b.name, name);
          expect(i.beschreibung, name).toBeTruthy();
          expect(i.warum, name).toBeTruthy();
        }
      }
  });
});
