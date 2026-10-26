import { BACKUP_PREFIX, LocalStorageSchichtRepository, STORAGE_KEY } from "./storage";
import { SpeicherFehler } from "./fehler";
import { TestSpeicher } from "@/test/speicher";
import { sig } from "@/test/testdaten";
import { vorlageAktivitaeten } from "./seed";

const jetzt = () => new Date("2026-10-11T08:00:00Z");

describe("LocalStorageSchichtRepository", () => {
  it("leerer Speicher startet mit Vorlage, Schreiben persistiert", async () => {
    const sp = new TestSpeicher();
    const repo = new LocalStorageSchichtRepository(sp, { jetzt });
    expect(await repo.laden()).toEqual({ ok: true });
    expect((await repo.vorlage()).length).toBe(vorlageAktivitaeten().length);
    const s = await repo.schichtStarten(
      { datum: "2026-10-11", schichtTyp: "Frueh", linie: "L1" },
      sig()
    );
    const repo2 = new LocalStorageSchichtRepository(sp, { jetzt });
    await repo2.laden();
    expect(await repo2.holen(s.id)).toEqual(s);
  });

  it("defektes JSON wird gesichert und Schreiben gesperrt", async () => {
    const sp = new TestSpeicher();
    sp.setItem(STORAGE_KEY, "{kaputt");
    const repo = new LocalStorageSchichtRepository(sp, { jetzt });
    const r = await repo.laden();
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.fehler.art).toBe("json");
    expect(r.fehler.backupKey).toMatch(new RegExp(`^${BACKUP_PREFIX}`));
    expect(sp.getItem(r.fehler.backupKey!)).toBe("{kaputt");
    await expect(
      repo.schichtStarten(
        { datum: "2026-10-11", schichtTyp: "Frueh", linie: "L1" },
        sig()
      )
    ).rejects.toBeInstanceOf(SpeicherFehler);
    expect(sp.getItem(STORAGE_KEY)).toBe("{kaputt");
    await repo.neuBeginnen();
    expect(sp.getItem(r.fehler.backupKey!)).toBe("{kaputt");
    expect(await repo.liste()).toEqual([]);
  });

  it("Schema-Verletzung (z. B. ungültige Kennung) wird erkannt", async () => {
    const sp = new TestSpeicher();
    const repo = new LocalStorageSchichtRepository(sp, { jetzt });
    await repo.laden();
    await repo.schichtStarten(
      { datum: "2026-10-11", schichtTyp: "Frueh", linie: "L1" },
      sig()
    );
    sp.setItem(STORAGE_KEY, sp.getItem(STORAGE_KEY)!.replace(/"QXZTW"/g, '"AB1234"'));
    const r = await new LocalStorageSchichtRepository(sp, { jetzt }).laden();
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fehler.art).toBe("schema");
  });

  it("Speicher voll: Fehler, Zustand unverändert", async () => {
    const sp = new TestSpeicher();
    const repo = new LocalStorageSchichtRepository(sp, { jetzt });
    await repo.laden();
    sp.vollAb = 10;
    await expect(
      repo.schichtStarten(
        { datum: "2026-10-11", schichtTyp: "Frueh", linie: "L1" },
        sig()
      )
    ).rejects.toThrow(/Speichern fehlgeschlagen/);
    expect(await repo.liste()).toEqual([]);
  });

  it("Demo-Daten laden", async () => {
    const repo = new LocalStorageSchichtRepository(new TestSpeicher(), { jetzt });
    await repo.laden();
    await repo.demoLaden();
    expect((await repo.liste()).length).toBe(5);
  });
});
