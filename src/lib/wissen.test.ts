import { describe, expect, it } from "vitest";
import { WISSENSKARTEN, wissenSuchen } from "./wissen";

describe("wissen", () => {
  it("has 10 cards with unique ids", () => {
    expect(WISSENSKARTEN).toHaveLength(10);
    expect(new Set(WISSENSKARTEN.map((k) => k.id)).size).toBe(10);
  });
  it("searches title, text and keywords case-insensitively", () => {
    expect(wissenSuchen("").length).toBe(10);
    expect(wissenSuchen("mhd").map((k) => k.id)).toContain("mhd");
    expect(wissenSuchen("NÜSSE").map((k) => k.id)).toEqual(["allergene"]);
    expect(wissenSuchen("xyz")).toEqual([]);
  });
});
