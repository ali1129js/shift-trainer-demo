import { SpeicherFehler } from "./fehler";
import type { Pruefer } from "./vierAugen";
import * as ops from "./schicht";
import { demoDatenbank, leereDatenbank, vorlageAktualisieren } from "./seed";
import {
  datenbankSchema,
  type Aktivitaet,
  type AufgabenStatus,
  type Datenbank,
  type NotizArt,
  type Schicht,
  type Signatur,
} from "./schema";

/** localStorage key (versioned). */
export const STORAGE_KEY = "shift-trainer-demo:v1";
export const BACKUP_PREFIX = `${STORAGE_KEY}:backup:`;

export type LadeFehlerArt = "json" | "schema" | "nicht_lesbar";
export interface LadeFehler {
  art: LadeFehlerArt;
  meldung: string;
  /** Key under which the raw, unreadable value was preserved (null if backup failed). */
  backupKey: string | null;
}
export type LadeErgebnis = { ok: true } | { ok: false; fehler: LadeFehler };

/**
 * Data-source independent repository contract (async, so a backend API can be added
 * later as HttpSchichtRepository). Every write takes the signer's identity.
 */
export interface SchichtRepository {
  /** Load/initialise. Never throws for corrupt data – resolves with the load status. */
  laden(): Promise<LadeErgebnis>;
  liste(): Promise<Schicht[]>;
  holen(id: number): Promise<Schicht | null>;
  vorlage(): Promise<Aktivitaet[]>;
  schichtStarten(e: ops.StartEingabe, sig: Signatur): Promise<Schicht>;
  statusMelden(
    schichtId: number,
    aufgabeId: number,
    status: AufgabenStatus,
    notiz: string,
    sig: Signatur,
    pruefer?: Pruefer
  ): Promise<Schicht>;
  notizErfassen(
    schichtId: number,
    art: NotizArt,
    text: string,
    sig: Signatur,
    aufgabenIds?: readonly number[]
  ): Promise<Schicht>;
  stillstandErfassen(
    schichtId: number,
    e: ops.StillstandEingabe,
    sig: Signatur
  ): Promise<Schicht>;
  ereignisMelden(
    schichtId: number,
    aufgabeId: number,
    ereignis: string,
    sig: Signatur
  ): Promise<Schicht>;
  freigabeSetzen(
    schichtId: number,
    aktiv: boolean,
    sig: Signatur,
    begruendung?: string
  ): Promise<Schicht>;
  abschliessen(schichtId: number, sig: Signatur): Promise<Schicht>;
  wiedereroeffnen(
    schichtId: number,
    sig: Signatur,
    begruendung: string
  ): Promise<Schicht>;
  /** Replace all data with the fictitious demo data set. */
  demoLaden(jetzt?: Date): Promise<void>;
  /** Explicit recovery after a load error (the backup is kept). */
  neuBeginnen(): Promise<void>;
}

const fehlerText = (e: unknown) => (e instanceof Error ? e.message : String(e));

export interface RepositoryOptionen {
  jetzt?: () => Date;
}

/**
 * localStorage implementation.
 * - Loads and zod-validates the versioned key; an empty store starts with the template.
 * - Invalid data is copied to a timestamped backup key and writing is locked (never
 *   silently overwritten) until `neuBeginnen()` is called explicitly.
 * - Write failures throw SpeicherFehler and leave the in-memory state unchanged.
 */
export class LocalStorageSchichtRepository implements SchichtRepository {
  private db: Datenbank = leereDatenbank();
  private ladeFehler: LadeFehler | null = null;
  private readonly jetzt: () => Date;

  constructor(
    private readonly storage: Storage,
    optionen: RepositoryOptionen = {}
  ) {
    this.jetzt = optionen.jetzt ?? (() => new Date());
  }

  get fehler(): LadeFehler | null {
    return this.ladeFehler;
  }

  async laden(): Promise<LadeErgebnis> {
    let roh: string | null;
    try {
      roh = this.storage.getItem(STORAGE_KEY);
    } catch (e) {
      return this.fehlschlag({
        art: "nicht_lesbar",
        meldung: `Der Browserspeicher ist nicht verfügbar: ${fehlerText(e)}`,
        backupKey: null,
      });
    }
    if (roh === null) {
      this.db = leereDatenbank();
      this.ladeFehler = null;
      return { ok: true };
    }
    let json: unknown;
    try {
      json = JSON.parse(roh);
    } catch (e) {
      return this.fehlschlag({
        art: "json",
        meldung: `Gespeicherte Daten sind kein gültiges JSON (${fehlerText(e)}).`,
        backupKey: this.sichern(roh),
      });
    }
    const res = datenbankSchema.safeParse(json);
    if (!res.success) {
      const erste = res.error.issues[0];
      const pfad = erste ? erste.path.join(".") || "(Wurzel)" : "";
      return this.fehlschlag({
        art: "schema",
        meldung: `Gespeicherte Daten entsprechen nicht dem erwarteten Format (${pfad}: ${erste?.message ?? "ungültig"}).`,
        backupKey: this.sichern(roh),
      });
    }
    this.db = vorlageAktualisieren(res.data);
    this.ladeFehler = null;
    return { ok: true };
  }

  async liste(): Promise<Schicht[]> {
    return structuredClone(this.db.schichten);
  }

  async holen(id: number): Promise<Schicht | null> {
    const s = this.db.schichten.find((x) => x.id === id);
    return s ? structuredClone(s) : null;
  }

  async vorlage(): Promise<Aktivitaet[]> {
    return structuredClone(this.db.aktivitaeten);
  }

  async schichtStarten(e: ops.StartEingabe, sig: Signatur): Promise<Schicht> {
    let id = 0;
    this.aendern((db) => {
      const r = ops.schichtStarten(db, e, sig);
      id = r.id;
      return r.db;
    });
    return this.ergebnis(id);
  }

  async statusMelden(
    schichtId: number,
    aufgabeId: number,
    status: AufgabenStatus,
    notiz: string,
    sig: Signatur,
    pruefer?: Pruefer
  ): Promise<Schicht> {
    this.aendern((db) =>
      ops.statusMelden(db, schichtId, aufgabeId, status, notiz, sig, pruefer)
    );
    return this.ergebnis(schichtId);
  }

  async notizErfassen(
    schichtId: number,
    art: NotizArt,
    text: string,
    sig: Signatur,
    aufgabenIds: readonly number[] = []
  ): Promise<Schicht> {
    this.aendern((db) => ops.notizErfassen(db, schichtId, art, text, sig, aufgabenIds));
    return this.ergebnis(schichtId);
  }

  async stillstandErfassen(
    schichtId: number,
    e: ops.StillstandEingabe,
    sig: Signatur
  ): Promise<Schicht> {
    this.aendern((db) => ops.stillstandErfassen(db, schichtId, e, sig));
    return this.ergebnis(schichtId);
  }

  async ereignisMelden(
    schichtId: number,
    aufgabeId: number,
    ereignis: string,
    sig: Signatur
  ): Promise<Schicht> {
    this.aendern((db) => ops.ereignisMelden(db, schichtId, aufgabeId, ereignis, sig));
    return this.ergebnis(schichtId);
  }

  async freigabeSetzen(
    schichtId: number,
    aktiv: boolean,
    sig: Signatur,
    begruendung = ""
  ): Promise<Schicht> {
    this.aendern((db) => ops.freigabeSetzen(db, schichtId, aktiv, sig, begruendung));
    return this.ergebnis(schichtId);
  }

  async abschliessen(schichtId: number, sig: Signatur): Promise<Schicht> {
    this.aendern((db) => ops.schichtAbschliessen(db, schichtId, sig));
    return this.ergebnis(schichtId);
  }

  async wiedereroeffnen(
    schichtId: number,
    sig: Signatur,
    begruendung: string
  ): Promise<Schicht> {
    this.aendern((db) => ops.schichtWiedereroeffnen(db, schichtId, sig, begruendung));
    return this.ergebnis(schichtId);
  }

  async demoLaden(jetzt: Date = this.jetzt()): Promise<void> {
    this.aendern(() => demoDatenbank(jetzt));
  }

  async neuBeginnen(): Promise<void> {
    const leer = leereDatenbank();
    this.schreiben(leer);
    this.db = leer;
    this.ladeFehler = null;
  }

  private aendern(fn: (db: Datenbank) => Datenbank): void {
    if (this.ladeFehler)
      throw new SpeicherFehler(
        "Speichern gesperrt: Die vorhandenen Daten konnten nicht gelesen werden. Bitte zuerst den Hinweis oben auf der Seite beachten."
      );
    const naechste = fn(this.db);
    if (naechste === this.db) return;
    this.schreiben(naechste);
    this.db = naechste;
  }

  private ergebnis(id: number): Schicht {
    const s = this.db.schichten.find((x) => x.id === id);
    if (!s) throw new SpeicherFehler(`Schicht ${id} nicht gefunden.`);
    return structuredClone(s);
  }

  private schreiben(db: Datenbank): void {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch (e) {
      throw new SpeicherFehler(
        `Speichern fehlgeschlagen: Der Browserspeicher ist voll oder nicht verfügbar (${fehlerText(e)}).`,
        e
      );
    }
  }

  private sichern(roh: string): string | null {
    const key = `${BACKUP_PREFIX}${this.jetzt().toISOString().replace(/[:.]/g, "-")}`;
    try {
      this.storage.setItem(key, roh);
      return key;
    } catch {
      return null;
    }
  }

  private fehlschlag(fehler: LadeFehler): LadeErgebnis {
    this.db = leereDatenbank();
    this.ladeFehler = fehler;
    return { ok: false, fehler };
  }
}
