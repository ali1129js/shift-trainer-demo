import { SpeicherFehler } from "../fehler";
import {
  PLATZHALTER_EINSTELLUNGEN,
  trainingsDatenSchema,
  trainingsSitzungSchema,
  freigabeEinstellungenSchema,
  type FreigabeEinstellungen,
  type TrainingsDaten,
  type TrainingsSitzung,
} from "./schema";

/** Separate versioned key, same pattern as the shift repository (zod, backup, no silent overwrite). */
export const TRAINING_KEY = "shift-trainer-demo:training:v1";

export type TrainingsLadeErgebnis =
  | { ok: true; daten: TrainingsDaten }
  | { ok: false; meldung: string; backupKey: string | null; daten: TrainingsDaten };

export const leereTrainingsDaten = (): TrainingsDaten => ({
  version: 1,
  sitzungen: [],
  einstellungen: { ...PLATZHALTER_EINSTELLUNGEN },
});

export class TrainingsSpeicher {
  private gesperrt = false;
  constructor(
    private readonly storage: Storage,
    private readonly jetzt: () => Date = () => new Date()
  ) {}

  laden(): TrainingsLadeErgebnis {
    let roh: string | null;
    try {
      roh = this.storage.getItem(TRAINING_KEY);
    } catch (e) {
      this.gesperrt = true;
      return {
        ok: false,
        meldung: String(e),
        backupKey: null,
        daten: leereTrainingsDaten(),
      };
    }
    if (roh === null) return { ok: true, daten: leereTrainingsDaten() };
    let json: unknown;
    try {
      json = JSON.parse(roh);
    } catch {
      return this.fehler("Trainingsdaten sind kein gültiges JSON.", roh);
    }
    const r = trainingsDatenSchema.safeParse(json);
    if (!r.success)
      return this.fehler(
        `Trainingsdaten ungültig (${r.error.issues[0]?.path.join(".") ?? ""}).`,
        roh
      );
    this.gesperrt = false;
    return { ok: true, daten: schritteUmbenennen(r.data) };
  }

  private fehler(meldung: string, roh: string): TrainingsLadeErgebnis {
    this.gesperrt = true;
    const key = `${TRAINING_KEY}:backup:${this.jetzt().toISOString()}`;
    let backupKey: string | null = key;
    try {
      this.storage.setItem(key, roh);
    } catch {
      backupKey = null;
    }
    return { ok: false, meldung, backupKey, daten: leereTrainingsDaten() };
  }

  private schreiben(d: TrainingsDaten): TrainingsDaten {
    if (this.gesperrt)
      throw new SpeicherFehler(
        "Trainingsdaten konnten nicht geladen werden – Schreiben ist gesperrt."
      );
    const geprueft = trainingsDatenSchema.parse(d);
    try {
      this.storage.setItem(TRAINING_KEY, JSON.stringify(geprueft));
    } catch (e) {
      throw new SpeicherFehler(`Speichern fehlgeschlagen: ${String(e)}`);
    }
    return geprueft;
  }

  sitzungSpeichern(s: TrainingsSitzung): TrainingsDaten {
    const d = this.aktuell();
    const neu = trainingsSitzungSchema.parse(s);
    return this.schreiben({
      ...d,
      sitzungen: [...d.sitzungen.filter((x) => x.id !== neu.id), neu],
    });
  }

  einstellungenSpeichern(e: FreigabeEinstellungen): TrainingsDaten {
    return this.schreiben({
      ...this.aktuell(),
      einstellungen: freigabeEinstellungenSchema.parse(e),
    });
  }

  allesErsetzen(d: TrainingsDaten): TrainingsDaten {
    return this.schreiben(d);
  }

  /** Explicit reset after a load error (backup is kept). */
  neuBeginnen(): TrainingsDaten {
    this.gesperrt = false;
    return this.schreiben(leereTrainingsDaten());
  }

  private aktuell(): TrainingsDaten {
    const r = this.laden();
    if (!r.ok) throw new SpeicherFehler(r.meldung);
    return r.daten;
  }
}

/** Maps step names of older sessions to the current template names (see umbenennungen.ts). */
export function schritteUmbenennen(d: TrainingsDaten): TrainingsDaten {
  return {
    ...d,
    sitzungen: d.sitzungen.map((s) => ({
      ...s,
      schritte: s.schritte.map((x) => ({
        ...x,
        schritt: x.schritt,
      })),
    })),
  };
}
