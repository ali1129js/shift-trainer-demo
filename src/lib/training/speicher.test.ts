import { describe, expect, it } from "vitest";
import { TestSpeicher } from "@/test/speicher";
import { demoTrainingsDaten } from "./demo";
import { PLATZHALTER_EINSTELLUNGEN } from "./schema";
import { TRAINING_KEY, TrainingsSpeicher } from "./speicher";

describe("TrainingsSpeicher", () => {
  it("starts empty with placeholder settings", () => {
    const r = new TrainingsSpeicher(new TestSpeicher()).laden();
    expect(r.ok && r.daten.einstellungen).toEqual(PLATZHALTER_EINSTELLUNGEN);
  });
  it("round-trips sessions and settings", () => {
    const st = new TestSpeicher();
    const sp = new TrainingsSpeicher(st);
    sp.allesErsetzen(demoTrainingsDaten());
    sp.einstellungenSpeichern({ ...PLATZHALTER_EINSTELLUNGEN, minAuftragsWechsel: 4 });
    const r = new TrainingsSpeicher(st).laden();
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.daten.sitzungen).toHaveLength(demoTrainingsDaten().sitzungen.length);
      expect(r.daten.einstellungen.minAuftragsWechsel).toBe(4);
    }
  });
  it("backs up corrupt data and locks writes", () => {
    const st = new TestSpeicher();
    st.setItem(TRAINING_KEY, "{kaputt");
    const sp = new TrainingsSpeicher(st, () => new Date("2026-10-26T05:00:00Z"));
    const r = sp.laden();
    expect(r.ok).toBe(false);
    if (!r.ok) expect(st.getItem(r.backupKey!)).toBe("{kaputt");
    expect(() => sp.allesErsetzen(demoTrainingsDaten())).toThrow();
    sp.neuBeginnen();
    expect(sp.laden().ok).toBe(true);
  });
});
