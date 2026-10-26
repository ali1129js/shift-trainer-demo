import { useMemo, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { useAuth, useSignieren } from "@/auth";
import { BereichBadge, Fortschritt, Kpi, StatusBadge } from "@/components/Bausteine";
import { useToast } from "@/components/ui/toast";
import { useAktion, useSchichten } from "@/data/hooks";
import {
  bereiche as berechneBereiche,
  standardBereich,
  statistik,
  type AufgabeAnsicht,
  type BereichAnsicht,
} from "@/lib/ablauf";
import { BEREICH_INHALT, INHALT_FOLGT, inhaltFuer } from "@/lib/aufgabenInhalt";
import { formatDauer, formatZeitstempel } from "@/lib/date";
import { darfSperreAufheben, darfWiedereroeffnen } from "@/lib/rechte";
import { VORSCHICHT_KENNUNG, schichtTitel } from "@/lib/schicht";
import {
  EINSTIEG_LABEL,
  WECHSELART_HILFE,
  WECHSELART_LABEL,
  NOTIZ_ARTEN,
  NOTIZ_LABEL,
  ROLLE_LABEL,
  STATUS_LABEL,
  type AufgabenStatus,
  type NotizArt,
  type Schicht,
  STILLSTAND_GRUENDE,
  STILLSTAND_GRUND_LABEL,
  type StillstandGrund,
  bereichKurz,
} from "@/lib/schema";
import { STILLSTAND_GRENZE_MIN, stillstandRegel } from "@/lib/stillstand";
import { NichtGefunden } from "./NichtGefunden";
import {
  istAbnahmeSchritt,
  prueferText,
  VIER_AUGEN_HINWEIS,
  vierAugenFehler,
} from "@/lib/vierAugen";
import {
  fehlendeUebergaben,
  uebergabeVorlage,
  uebergabenNachAufgabe,
  uebergabenZu,
} from "@/lib/uebergabe";

const ZUSTAND: Record<BereichAnsicht["zustand"], { klasse: string; text: string }> = {
  vorschicht: { klasse: "vorschicht", text: "↩ Durch Vorschicht erledigt" },
  abgeschlossen: { klasse: "done", text: "✓ Abgeschlossen" },
  in_arbeit: { klasse: "active", text: "▶ In Arbeit" },
  offen: { klasse: "offen", text: "○ Noch nicht begonnen" },
};
const bereichZustand = (b: BereichAnsicht) => ZUSTAND[b.zustand];

function sperrText(a: AufgabeAnsicht): string {
  return `Wartet auf »${a.gesperrtDurch ?? "vorherigen Schritt"}«. Innerhalb eines Abschnitts wird ein Schritt erst freigegeben, wenn alle vorherigen Schritte erledigt oder übersprungen sind – „Blockiert“ hält den Ablauf an. Die Abschnitte selbst (Schichtstart, Auftragsende, Nächster Auftrag) sind unabhängig, weil eine Schicht am Anfang, in der Mitte oder am Ende eines Auftrags einsteigen kann.`;
}

function Flow({
  liste,
  aktiv,
  waehlen,
}: {
  liste: BereichAnsicht[];
  aktiv: number | null;
  waehlen: (id: number) => void;
}) {
  return (
    <nav className="flow" aria-label="Abschnitte (unabhängig voneinander)">
      {liste.map((b) => {
        const z = bereichZustand(b);
        return (
          <div key={b.aktivitaet.id} style={{ display: "contents" }}>
            <button
              className={`flow__step flow__step--${z.klasse}`}
              aria-current={aktiv === b.aktivitaet.id ? "step" : undefined}
              onClick={() => waehlen(b.aktivitaet.id)}
            >
              <span className="flow__state">{z.text}</span>
              <span className="muted small">{bereichKurz(b.rootName)}</span>
              <strong>{b.name}</strong>
              <span className="small">
                {b.erledigt}/{b.gesamt} erledigt
                {b.blockiert > 0 && ` · ${b.blockiert} blockiert`}
              </span>
            </button>
          </div>
        );
      })}
    </nav>
  );
}

export interface Entwurf {
  aufgabeId: number;
  text: string;
}

function UebergabeFormular({
  schicht,
  entwurf,
  setEntwurf,
}: {
  schicht: Schicht;
  entwurf: Entwurf;
  setEntwurf: (e: Entwurf | null) => void;
}) {
  const signieren = useSignieren();
  const { toast } = useToast();
  const name = schicht.aktivitaeten.find((a) => a.id === entwurf.aufgabeId)?.name ?? "";
  const speichern = useAktion((repo) =>
    repo.notizErfassen(schicht.id, "handover", entwurf.text, signieren(), [
      entwurf.aufgabeId,
    ])
  );
  return (
    <div className="hinweis hinweis--lock stack" role="group" aria-label="Übergabe-Notiz">
      <strong>📝 Gehört das in die Übergabe? Notiz zu „{name}“</strong>
      <span className="small">
        Das System zeigt der nächsten Schicht nur, was erledigt wurde – nicht, was
        ausgelassen oder anders gemacht wurde. Bitte kurz beschreiben.
      </span>
      <textarea
        value={entwurf.text}
        onChange={(e) => setEntwurf({ ...entwurf, text: e.target.value })}
        rows={4}
        aria-label="Übergabe-Text"
      />
      <div className="row">
        <button
          className="btn btn--primary"
          disabled={speichern.isPending}
          onClick={() =>
            speichern.mutate(undefined, {
              onSuccess: () => {
                setEntwurf(null);
                toast({ title: "Übergabe-Notiz gespeichert" });
              },
              onError: (e) =>
                toast({
                  variant: "destructive",
                  title: "Nicht gespeichert",
                  description: e.message,
                }),
            })
          }
        >
          In Übergabe aufnehmen
        </button>
        <button className="btn" onClick={() => setEntwurf(null)}>
          Später
        </button>
      </div>
    </div>
  );
}

/** Record a line standstill (reason + duration); >= 30 min = long standstill. */
function StillstandKarte({ schicht }: { schicht: Schicht }) {
  const signieren = useSignieren();
  const { toast } = useToast();
  const [grund, setGrund] = useState<StillstandGrund>("pause");
  const [text, setText] = useState("");
  const [dauer, setDauer] = useState("");
  const erfassen = useAktion((repo) =>
    repo.stillstandErfassen(
      schicht.id,
      { grund, text, dauerMin: Number(dauer) },
      signieren()
    )
  );
  const min = Number(dauer);
  const regel = dauer && Number.isFinite(min) && min > 0 ? stillstandRegel(min) : null;
  const zu = schicht.abgeschlossen !== null;
  return (
    <section className="card stack" aria-labelledby="stillstand-titel">
      <h2 id="stillstand-titel">Stillstand erfassen</h2>
      <form
        className="row wrap"
        onSubmit={(e) => {
          e.preventDefault();
          erfassen.mutate(undefined, {
            onSuccess: () => {
              toast({ title: `Stillstand erfasst (${min} min)` });
              setText("");
              setDauer("");
            },
            onError: (err: Error) =>
              toast({
                variant: "destructive",
                title: "Nicht möglich",
                description: err.message,
              }),
          });
        }}
      >
        <label>
          Grund{" "}
          <select
            value={grund}
            disabled={zu}
            onChange={(e) => setGrund(e.target.value as StillstandGrund)}
          >
            {STILLSTAND_GRUENDE.map((g) => (
              <option key={g} value={g}>
                {STILLSTAND_GRUND_LABEL[g]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Freitext{" "}
          <input
            value={text}
            disabled={zu}
            placeholder={
              grund === "sonstiges" ? "Grund beschreiben (Pflicht)" : "optional"
            }
            onChange={(e) => setText(e.target.value)}
          />
        </label>
        <label>
          Dauer (min){" "}
          <input
            type="number"
            min={1}
            step={1}
            value={dauer}
            disabled={zu}
            onChange={(e) => setDauer(e.target.value)}
            style={{ width: "6rem" }}
          />
        </label>
        <button type="submit" className="btn" disabled={zu || erfassen.isPending}>
          Erfassen
        </button>
      </form>
      {regel && (
        <p
          role="status"
          className={regel.art === "lang" ? "hinweis hinweis--override" : "muted"}
        >
          {regel.art === "lang"
            ? `Langer Stillstand (ab ${STILLSTAND_GRENZE_MIN} min) – nach Arbeitsanweisung vorgehen.`
            : "Kurzer Stillstand – nach Arbeitsanweisung vorgehen."}
          {/* TODO(Ali): exaktes Vorgehen bei kurzem/langem Stillstand nachliefern. */}
        </p>
      )}
      {schicht.stillstaende.length > 0 && (
        <ul className="stack">
          {schicht.stillstaende.map((x) => (
            <li key={x.id}>
              {STILLSTAND_GRUND_LABEL[x.grund]}
              {x.text ? `: ${x.text}` : ""} – {x.dauerMin} min
              {x.lang ? " · langer Stillstand" : ""} · {x.signiert.name},{" "}
              {formatZeitstempel(x.signiert.zeit)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AufgabenDetail({
  schicht,
  bereich,
  a,
  entwurf,
  setEntwurf,
}: {
  schicht: Schicht;
  bereich: BereichAnsicht;
  a: AufgabeAnsicht;
  entwurf: Entwurf | null;
  setEntwurf: (e: Entwurf | null) => void;
}) {
  const signieren = useSignieren();
  const { toast } = useToast();
  const [notiz, setNotiz] = useState("");
  const { account } = useAuth();
  const abnahme = istAbnahmeSchritt(a.aktivitaet.name);
  const [erster, setErster] = useState(() => account?.kennung ?? "");
  const [zweiter, setZweiter] = useState("");
  const prueferFehler = abnahme ? vierAugenFehler({ erster, zweiter }) : null;
  const letztePruefer = abnahme
    ? schicht.ereignisse
        .filter((e) => e.schichtAktivitaetId === a.aktivitaet.id && e.pruefer)
        .at(-1)?.pruefer
    : undefined;
  const melden = useAktion((repo, status: AufgabenStatus) =>
    repo.statusMelden(
      schicht.id,
      a.aktivitaet.id,
      status,
      notiz,
      signieren(),
      abnahme && status === "done" ? { erster, zweiter } : undefined
    )
  );
  const ereignis = useAktion((repo, text: string) =>
    repo.ereignisMelden(schicht.id, a.aktivitaet.id, text, signieren())
  );
  const inhalt = inhaltFuer(bereich.rootName, bereich.name, a.aktivitaet.name);
  const gesperrt = a.gesperrt || schicht.abgeschlossen !== null;
  const naechster = bereich.aufgaben[a.schritt];
  const fehlend = fehlendeUebergaben(schicht).filter(
    (f) => f.schichtAktivitaetId === a.aktivitaet.id
  );
  const notizen = uebergabenZu(schicht, a.aktivitaet.id);
  const meldungen = schicht.meldungen.filter(
    (m) => m.schichtAktivitaetId === a.aktivitaet.id
  );
  const fehler = (e: Error) =>
    toast({ variant: "destructive", title: "Nicht möglich", description: e.message });

  const senden = (status: AufgabenStatus) =>
    melden.mutate(status, {
      onSuccess: () => {
        if (status !== "done")
          setEntwurf({
            aufgabeId: a.aktivitaet.id,
            text: uebergabeVorlage(
              a.aktivitaet.name,
              `${STATUS_LABEL[status]}${notiz.trim() ? ` (${notiz.trim()})` : ""}`
            ),
          });
        setNotiz("");
        toast({ title: `${a.aktivitaet.name}: ${STATUS_LABEL[status]}` });
      },
      onError: fehler,
    });

  return (
    <aside className="card stack detail" aria-live="polite">
      <span className="eyebrow">
        Schritt {a.schritt} von {bereich.gesamt} · {bereichKurz(bereich.rootName)} ·{" "}
        {bereich.name}
      </span>
      <div className="row">
        <h2 style={{ flex: 1 }}>{a.aktivitaet.name}</h2>
        <StatusBadge status={a.status} />
      </div>
      {a.kaskadenGesperrt && (
        <p className={`hinweis ${a.gesperrt ? "hinweis--lock" : "hinweis--override"}`}>
          {a.gesperrt
            ? "🔒 "
            : "⚠ Sperre durch Vorgesetzte aufgehoben. Normalerweise gilt: "}
          {sperrText(a)}
        </p>
      )}
      {fehlend.map((f) => (
        <p key={f.anlass + f.zeit} className="alert small" role="alert">
          ⚠ Dieses Ereignis fehlt in der Übergabe: <strong>{f.anlass}</strong>
          {!schicht.abgeschlossen && (
            <>
              {" "}
              <button
                className="btn"
                style={{ padding: "2px 8px" }}
                onClick={() =>
                  setEntwurf({
                    aufgabeId: a.aktivitaet.id,
                    text: uebergabeVorlage(a.aktivitaet.name, f.anlass),
                  })
                }
              >
                Übergabe schreiben
              </button>
            </>
          )}
        </p>
      ))}
      {entwurf?.aufgabeId === a.aktivitaet.id && (
        <UebergabeFormular schicht={schicht} entwurf={entwurf} setEntwurf={setEntwurf} />
      )}
      <div className="stack" style={{ gap: 4 }}>
        <h3>Worum geht es?</h3>
        <p className={inhalt.beschreibung ? "" : "placeholder"}>
          {inhalt.beschreibung ?? INHALT_FOLGT}
        </p>
      </div>
      {inhalt.vorgehen?.length ? (
        <div className="stack" style={{ gap: 4 }}>
          <h3>Was ist zu tun?</h3>
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            {inhalt.vorgehen.map((v) => (
              <li key={v}>{v}</li>
            ))}
          </ol>
        </div>
      ) : null}
      <div className="stack" style={{ gap: 4 }}>
        <h3>Warum ist das wichtig?</h3>
        <p className={inhalt.warum ? "" : "placeholder"}>
          {inhalt.warum ?? INHALT_FOLGT}
        </p>
        <p className="muted small">
          {naechster
            ? `Gibt frei: »${naechster.aktivitaet.name}« (Schritt ${naechster.schritt}).`
            : "Letzter Schritt dieses Bereichs – danach wird der nächste Bereich freigegeben."}
        </p>
      </div>
      {letztePruefer && (
        <p className="hinweis small">Abnahme geprüft von: {prueferText(letztePruefer)}</p>
      )}
      {schicht.abgeschlossen ? (
        <p className="hinweis">
          Simulation abgeschlossen. Statusmeldungen sind gesperrt; der Verlauf bleibt
          einsehbar.
        </p>
      ) : (
        <div className="stack">
          <label>
            Notiz zu „{a.aktivitaet.name}“
            <input
              value={notiz}
              onChange={(e) => setNotiz(e.target.value)}
              placeholder="Optionale Notiz zur Statusmeldung"
              disabled={gesperrt}
            />
          </label>
          {abnahme && a.status !== "done" && (
            <fieldset className="stack" style={{ gap: 6 }}>
              <legend>4-Augen-Prinzip</legend>
              <span className="muted small">{VIER_AUGEN_HINWEIS}</span>
              <div className="row">
                <label>
                  Erster Prüfer (Kennung/Name)
                  <input
                    value={erster}
                    onChange={(e) => setErster(e.target.value)}
                    disabled={gesperrt}
                  />
                </label>
                <label>
                  Zweiter Prüfer (Kennung/Name)
                  <input
                    value={zweiter}
                    onChange={(e) => setZweiter(e.target.value)}
                    disabled={gesperrt}
                  />
                </label>
              </div>
              {prueferFehler && (erster || zweiter) && (
                <span className="alert small" role="alert">
                  {prueferFehler}
                </span>
              )}
            </fieldset>
          )}
          <div className="row">
            <button
              className="btn btn--green"
              disabled={
                gesperrt ||
                melden.isPending ||
                a.status === "done" ||
                prueferFehler !== null
              }
              title={
                a.status === "done" ? "Bereits erledigt" : (prueferFehler ?? undefined)
              }
              onClick={() => senden("done")}
            >
              {a.status === "done" ? "✓ erledigt" : "✓ Erledigt"}
            </button>
            <button
              className="btn btn--danger"
              disabled={gesperrt || melden.isPending}
              onClick={() => senden("blocked")}
            >
              ⚠ Blockiert
            </button>
            <button
              className="btn"
              disabled={gesperrt || melden.isPending}
              onClick={() => senden("skipped")}
            >
              Übersprungen
            </button>
          </div>
        </div>
      )}
      <div className="stack" style={{ gap: 6 }}>
        <h3>Meldepflichtige Ereignisse / typische Abweichungen</h3>
        <span className="muted small">
          Ist eines davon passiert? Ankreuzen – es muss dann in die Übergabe.
        </span>
        {inhalt.meldepflichtig?.length ? (
          <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none" }} className="stack">
            {inhalt.meldepflichtig.map((m) => {
              const gemeldet = meldungen.some((x) => x.ereignis === m);
              return (
                <li key={m} className="row" style={{ gap: 8 }}>
                  <button
                    className="btn"
                    style={{ padding: "4px 10px" }}
                    disabled={gesperrt || ereignis.isPending}
                    aria-pressed={gemeldet}
                    onClick={() =>
                      ereignis.mutate(m, {
                        onSuccess: () =>
                          setEntwurf({
                            aufgabeId: a.aktivitaet.id,
                            text: uebergabeVorlage(a.aktivitaet.name, m),
                          }),
                        onError: fehler,
                      })
                    }
                  >
                    {gemeldet ? "☑" : "☐"} {m}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="placeholder">{INHALT_FOLGT}</p>
        )}
      </div>
      <div className="stack" style={{ gap: 4 }}>
        <h3>Übergabe-Notizen zu diesem Schritt ({notizen.length})</h3>
        {notizen.length === 0 ? (
          <p className="muted small">Keine.</p>
        ) : (
          notizen.map((n) => (
            <p key={n.id} className="small" style={{ whiteSpace: "pre-line" }}>
              {n.text}{" "}
              <span className="muted">
                – {n.signiert.name} ({n.signiert.kennung}),{" "}
                {formatZeitstempel(n.signiert.zeit)}
              </span>
            </p>
          ))
        )}
      </div>
      <details>
        <summary>Verlauf ({a.verlauf.length})</summary>
        {a.verlauf.length === 0 ? (
          <p className="muted small">Noch keine Statusmeldung erfasst.</p>
        ) : (
          <ul className="small">
            {a.verlauf.map((e) => (
              <li key={e.id}>
                {formatZeitstempel(e.signiert.zeit)} · <StatusBadge status={e.status} /> ·{" "}
                {e.signiert.name} ({e.signiert.kennung})
                {e.ueberSperre && " · über Freigabe"}
                {e.durchVorschicht && " · durch Vorschicht erledigt"}
                {e.notiz && ` – ${e.notiz}`}
              </li>
            ))}
          </ul>
        )}
      </details>
    </aside>
  );
}

function UebergabeCheck({
  schicht,
  oeffnen,
}: {
  schicht: Schicht;
  oeffnen: (aufgabeId: number, anlass: string) => void;
}) {
  const signieren = useSignieren();
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [art, setArt] = useState<NotizArt>("handover");
  const erfassen = useAktion((repo) =>
    repo.notizErfassen(schicht.id, art, text, signieren())
  );
  const fehlend = fehlendeUebergaben(schicht);

  const gruppen = uebergabenNachAufgabe(schicht);
  const sonstige = schicht.notizen.filter((n) => n.art !== "handover");
  return (
    <section className="card stack">
      <span className="eyebrow">Übergabe</span>
      <h2>Übergabe-Check &amp; Zusammenfassung</h2>
      {fehlend.length === 0 ? (
        <p className="hinweis">
          ✓ Alle Auffälligkeiten dieser Schicht sind in der Übergabe.
        </p>
      ) : (
        <div className="alert stack" role="alert">
          <strong>
            {fehlend.length === 1
              ? "1 Ereignis fehlt in der Übergabe:"
              : `${fehlend.length} Ereignisse fehlen in der Übergabe:`}
          </strong>
          <ul style={{ margin: 0 }}>
            {fehlend.map((f) => (
              <li key={f.schichtAktivitaetId + f.anlass + f.zeit}>
                {f.aufgabe}: {f.anlass}{" "}
                <button
                  className="btn"
                  style={{ padding: "2px 8px" }}
                  onClick={() => oeffnen(f.schichtAktivitaetId, f.anlass)}
                >
                  Übergabe schreiben
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {gruppen.length === 0 ? (
        <p className="muted">Noch keine Übergabe-Notizen.</p>
      ) : (
        gruppen.map((g) => (
          <div key={g.titel} className="stack" style={{ gap: 4 }}>
            <strong>{g.titel}</strong>
            {g.notizen.map((n) => (
              <p key={n.id} className="small" style={{ whiteSpace: "pre-line" }}>
                {n.text}{" "}
                <span className="muted">
                  – {n.signiert.name} ({n.signiert.kennung}),{" "}
                  {formatZeitstempel(n.signiert.zeit)}
                </span>
              </p>
            ))}
          </div>
        ))
      )}
      {sonstige.length > 0 && (
        <details>
          <summary>Weitere Notizen ({sonstige.length})</summary>
          {sonstige.map((n) => (
            <p key={n.id} className="small">
              <span className={`badge ${n.art === "issue" ? "badge--blocked" : ""}`}>
                {NOTIZ_LABEL[n.art]}
              </span>{" "}
              {n.text}{" "}
              <span className="muted">
                – {n.signiert.name} ({n.signiert.kennung}),{" "}
                {formatZeitstempel(n.signiert.zeit)}
              </span>
            </p>
          ))}
        </details>
      )}
      <div className="row" style={{ alignItems: "flex-end" }}>
        <label style={{ flex: 1, minWidth: 240 }}>
          Allgemeine Notiz (ohne Schrittbezug)
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Stand der Linie, offene Punkte, Hinweise für die nächste Schicht …"
          />
        </label>
        <label>
          Art
          <select value={art} onChange={(e) => setArt(e.target.value as NotizArt)}>
            {NOTIZ_ARTEN.map((x) => (
              <option key={x} value={x}>
                {NOTIZ_LABEL[x]}
              </option>
            ))}
          </select>
        </label>
        <button
          className="btn"
          onClick={() =>
            erfassen.mutate(undefined, {
              onSuccess: () => setText(""),
              onError: (e) =>
                toast({
                  variant: "destructive",
                  title: "Nicht gespeichert",
                  description: e.message,
                }),
            })
          }
        >
          Notiz speichern
        </button>
      </div>
    </section>
  );
}

export function Ablauf() {
  const { id } = useParams<{ id: string }>();
  const { data: schichten, isLoading } = useSchichten();
  const schicht = schichten?.find((s) => s.id === Number(id));
  if (isLoading) return <main className="page">Lädt …</main>;
  if (!schicht) return <NichtGefunden text="Simulation nicht gefunden." />;
  return <AblaufBoard key={schicht.id} schicht={schicht} />;
}

function AblaufBoard({ schicht }: { schicht: Schicht }) {
  const { rolle } = useAuth();
  const signieren = useSignieren();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const liste = useMemo(() => berechneBereiche(schicht), [schicht]);
  const st = statistik(schicht);
  const [gewaehlt, setGewaehlt] = useState<number | null>(() => standardBereich(liste));
  const bereich = liste.find((b) => b.aktivitaet.id === gewaehlt) ?? liste[0];
  const [aufgabeId, setAufgabeId] = useState<number | null>(null);
  const [entwurf, setEntwurf] = useState<Entwurf | null>(null);
  const fehlend = fehlendeUebergaben(schicht);
  const vorschichtUebergabe =
    schicht.einstieg !== "auftrag_beginn"
      ? (schicht.notizen.find(
          (n) => n.art === "handover" && n.signiert.kennung === VORSCHICHT_KENNUNG
        ) ?? null)
      : null;
  const aufgabe =
    bereich?.aufgaben.find((a) => a.aktivitaet.id === aufgabeId) ??
    bereich?.aufgaben.find((a) => a.istNaechste) ??
    bereich?.aufgaben.find((a) => a.status === "open" || a.status === "blocked") ??
    bereich?.aufgaben[0];

  const fehler = (e: Error) =>
    toast({ variant: "destructive", title: "Nicht möglich", description: e.message });
  const freigabe = useAktion((repo, a: { aktiv: boolean; grund: string }) =>
    repo.freigabeSetzen(schicht.id, a.aktiv, signieren(), a.grund)
  );
  const abschliessen = useAktion((repo) => repo.abschliessen(schicht.id, signieren()));
  const oeffnen = useAktion((repo, grund: string) =>
    repo.wiedereroeffnen(schicht.id, signieren(), grund)
  );
  const neuStart = useAktion((repo) =>
    repo.schichtStarten(
      {
        datum: schicht.datum,
        schichtTyp: schicht.schichtTyp,
        linie: schicht.linie,
        arbeitsbereich: schicht.arbeitsbereich,
        einstieg: schicht.einstieg,
        wechselart: schicht.wechselart,
        umbau: schicht.umbau,
      },
      signieren()
    )
  );
  const vorgesetzt = rolle !== null && darfSperreAufheben(rolle);
  const ende = schicht.abgeschlossen
    ? Date.parse(schicht.abgeschlossen.zeit)
    : Date.now();

  return (
    <main
      className="page"
      data-shift={schicht.schichtTyp}
      data-bereich={schicht.arbeitsbereich}
    >
      <div className="stack" style={{ gap: 6 }}>
        <Link href="/schichten">← Simulationen</Link>
        <span className="eyebrow">Ablauf-Simulation</span>
        <div className="row">
          <h1 style={{ flex: 1 }}>{schichtTitel(schicht)}</h1>
          <span className={`badge ${schicht.abgeschlossen ? "" : "badge--open"}`}>
            {schicht.abgeschlossen
              ? `Abgeschlossen ${formatZeitstempel(schicht.abgeschlossen.zeit)}`
              : "Läuft"}
          </span>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <BereichBadge bereich={schicht.arbeitsbereich} />
          <span className="badge">Einstieg: {EINSTIEG_LABEL[schicht.einstieg]}</span>
          <span className="badge" title={WECHSELART_HILFE[schicht.wechselart]}>
            Wechselart: {WECHSELART_LABEL[schicht.wechselart]}
            {schicht.umbau ? " + Formatwechsel" : ""}
          </span>
        </div>
        <span className="muted small">
          Gestartet von {schicht.gestartet.name} ({schicht.gestartet.kennung}) · Laufzeit{" "}
          {formatDauer(ende - Date.parse(schicht.gestartet.zeit))}
        </span>
      </div>

      <div className="row no-print">
        {!schicht.abgeschlossen && vorgesetzt && (
          <button
            className="btn"
            aria-pressed={schicht.freigabe !== null}
            onClick={() => {
              if (schicht.freigabe)
                freigabe.mutate({ aktiv: false, grund: "" }, { onError: fehler });
              else {
                const grund = window.prompt(
                  "Begründung für die Freigabe der Linienleitung (wird im Verlauf signiert):"
                );
                if (grund !== null)
                  freigabe.mutate({ aktiv: true, grund }, { onError: fehler });
              }
            }}
          >
            {schicht.freigabe
              ? "Sperre wieder aktivieren"
              : "Sperre aufheben (Linienleitung)"}
          </button>
        )}
        {!schicht.abgeschlossen ? (
          <button
            className="btn"
            onClick={() => {
              if (
                window.confirm(
                  `${fehlend.length > 0 ? `Achtung: ${fehlend.length} Ereignis(se) fehlen in der Übergabe.\n\n` : ""}Simulation ${schichtTitel(schicht)} jetzt abschließen? Danach sind keine Statusmeldungen mehr möglich.`
                )
              )
                abschliessen.mutate(undefined, { onError: fehler });
            }}
          >
            Simulation abschließen
          </button>
        ) : (
          rolle !== null &&
          darfWiedereroeffnen(rolle) && (
            <button
              className="btn"
              onClick={() => {
                const grund = window.prompt("Begründung für das Wiedereröffnen:");
                if (grund !== null) oeffnen.mutate(grund, { onError: fehler });
              }}
            >
              Wieder öffnen (Linienleitung)
            </button>
          )
        )}
        <button
          className="btn btn--green"
          onClick={() => {
            if (
              window.confirm(
                "Neue Simulation mit gleicher Linie und Schicht starten? Diese bleibt im Verlauf erhalten."
              )
            )
              neuStart.mutate(undefined, {
                onSuccess: (s) => navigate(`/schichten/${s.id}`),
                onError: fehler,
              });
          }}
        >
          ↺ Simulation neu starten
        </button>
      </div>

      {!schicht.abgeschlossen && st.gesamt > 0 && st.offen === 0 && (
        <section
          className="card stack mo-fertig"
          role="status"
          aria-label="Auftrag abgeschlossen"
        >
          <h2>✓ Auftrag abgeschlossen</h2>
          <p>
            Alle {st.gesamt} Schritte sind gemeldet. Schließen Sie die Simulation ab oder
            starten Sie eine neuen Auftrag.
          </p>
          <div className="row">
            <button
              className="btn btn--green"
              onClick={() => abschliessen.mutate(undefined, { onError: fehler })}
            >
              Simulation abschließen
            </button>
            <button className="btn" onClick={() => navigate("/schichten")}>
              Neuen Auftrag starten
            </button>
          </div>
        </section>
      )}

      {vorschichtUebergabe && (
        <section
          className="card stack uebergabe-zuerst"
          aria-label="Übergabe der Vorschicht"
        >
          <span className="eyebrow">Zuerst lesen · Übergabe der Vorschicht</span>
          <p style={{ whiteSpace: "pre-line" }}>{vorschichtUebergabe.text}</p>
          <span className="muted small">
            {vorschichtUebergabe.signiert.name} ·{" "}
            {formatZeitstempel(vorschichtUebergabe.signiert.zeit)}
          </span>
        </section>
      )}

      {schicht.freigabe && (
        <p role="status" className="hinweis hinweis--override">
          ⚠ Sperre aufgehoben durch {schicht.freigabe.name} ({schicht.freigabe.kennung},
          Freigabe der Linienleitung) am {formatZeitstempel(schicht.freigabe.zeit)}. Der
          kaskadierende Ablauf ist deaktiviert; Meldungen werden als „über Freigabe“
          markiert.
        </p>
      )}

      <section className="kpis">
        <Kpi label="Schritte" wert={st.gesamt} />
        <Kpi label="Erledigt" wert={st.erledigt} akzent="green" />
        <Kpi label="Offen" wert={st.offen} akzent="blue" />
        <Kpi label="Blockiert" wert={st.blockiert} akzent="red" />
        <Kpi label="Übersprungen" wert={st.uebersprungen} />
      </section>
      <Fortschritt st={st} label="Gesamtfortschritt" />
      <StillstandKarte schicht={schicht} />

      {liste.length === 0 || !bereich ? (
        <p className="muted">Keine Aktivitäten in dieser Simulation.</p>
      ) : (
        <>
          <Flow
            liste={liste}
            aktiv={bereich.aktivitaet.id}
            waehlen={(i) => {
              setGewaehlt(i);
              setAufgabeId(null);
            }}
          />
          <div className="board">
            <section className="card stack">
              <span className="eyebrow">{bereichKurz(bereich.rootName)}</span>
              <h2>{bereich.name}</h2>
              <p
                className={
                  BEREICH_INHALT[`${bereich.rootName} / ${bereich.name}`]
                    ? "muted"
                    : "placeholder"
                }
              >
                {BEREICH_INHALT[`${bereich.rootName} / ${bereich.name}`] ?? INHALT_FOLGT}
              </p>
              {bereich.zustand === "vorschicht" && (
                <p className="hinweis">
                  ↩ Dieser Abschnitt wurde von der Vorschicht erledigt (Einstieg:{" "}
                  {EINSTIEG_LABEL[schicht.einstieg]}). Zum Nachvollziehen sichtbar.
                </p>
              )}
              <ol className="rail">
                {bereich.aufgaben.map((a) => {
                  const klasse = a.vonVorschicht
                    ? "vorschicht"
                    : a.istNaechste
                      ? `next ${a.status}`
                      : a.gesperrt
                        ? "locked"
                        : a.status;
                  return (
                    <li key={a.aktivitaet.id} className={klasse}>
                      <span className="rail__dot" aria-hidden>
                        {a.vonVorschicht
                          ? "↩"
                          : a.status === "done"
                            ? "✓"
                            : a.status === "blocked"
                              ? "!"
                              : a.gesperrt
                                ? "🔒"
                                : a.schritt}
                      </span>
                      <button
                        className="task"
                        aria-pressed={aufgabe?.aktivitaet.id === a.aktivitaet.id}
                        onClick={() => setAufgabeId(a.aktivitaet.id)}
                      >
                        <span className="row" style={{ gap: 8 }}>
                          <strong style={{ flex: 1 }}>{a.aktivitaet.name}</strong>
                          {a.istNaechste && (
                            <span className="badge badge--open">◆ Nächster Schritt</span>
                          )}
                          {fehlend.some(
                            (f) => f.schichtAktivitaetId === a.aktivitaet.id
                          ) && (
                            <span className="badge badge--blocked">
                              📝 Übergabe fehlt
                            </span>
                          )}
                          {a.vonVorschicht ? (
                            <span className="badge badge--vorschicht">↩ Vorschicht</span>
                          ) : a.gesperrt ? (
                            <span className="badge badge--lock">🔒 Gesperrt</span>
                          ) : (
                            <StatusBadge status={a.status} />
                          )}
                        </span>
                        {a.gesperrt && (
                          <span className="small">
                            wartet auf »{a.gesperrtDurch ?? "vorherigen Bereich"}«
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </section>
            {aufgabe && (
              <AufgabenDetail
                key={aufgabe.aktivitaet.id}
                schicht={schicht}
                bereich={bereich}
                a={aufgabe}
                entwurf={entwurf}
                setEntwurf={setEntwurf}
              />
            )}
          </div>
        </>
      )}

      <UebergabeCheck
        schicht={schicht}
        oeffnen={(id, anlass) => {
          const b = liste.find((x) => x.aufgaben.some((t) => t.aktivitaet.id === id));
          const t = b?.aufgaben.find((x) => x.aktivitaet.id === id);
          if (!b || !t) return;
          setGewaehlt(b.aktivitaet.id);
          setAufgabeId(id);
          setEntwurf({
            aufgabeId: id,
            text: uebergabeVorlage(t.aktivitaet.name, anlass),
          });
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
      <details className="card">
        <summary>Signierter Verlauf ({schicht.verlauf.length})</summary>
        <table style={{ marginTop: 8 }}>
          <thead>
            <tr>
              <th>Zeit</th>
              <th>Kennung</th>
              <th>Name / Rolle</th>
              <th>Eintrag</th>
            </tr>
          </thead>
          <tbody>
            {[...schicht.verlauf].reverse().map((v) => (
              <tr key={v.id}>
                <td>{formatZeitstempel(v.signiert.zeit)}</td>
                <td>
                  <code>{v.signiert.kennung}</code>
                </td>
                <td>
                  {v.signiert.name} · {ROLLE_LABEL[v.signiert.rolle]}
                </td>
                <td>{v.text}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </main>
  );
}
