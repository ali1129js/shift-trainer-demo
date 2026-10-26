import { useState, type FormEvent } from "react";
import { useAuth } from "@/auth";
import { DEMO_VERZEICHNIS } from "@/lib/identitaet";
import { ROLLE_LABEL } from "@/lib/schema";

/** Demo sign-in with a fictional Kennung. */
export function Anmelden() {
  const { login } = useAuth();
  const [kennung, setKennung] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const absenden = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setFehler(null);
      await login(kennung);
    } catch (err) {
      setFehler(err instanceof Error ? err.message : String(err));
    }
  };
  return (
    <main className="login stack">
      <div className="row">
        <div>
          <h1>Shift Trainer Demo</h1>
          <p className="muted">
            Northwind Snacks · Linie 3 · Demo mit erfundenen Daten. Kein echtes System.
          </p>
        </div>
      </div>
      <form className="card stack" onSubmit={absenden} noValidate>
        <label>
          Kennung
          <input
            value={kennung}
            onChange={(e) => setKennung(e.target.value)}
            placeholder="z. B. QXZTW"
            maxLength={5}
            autoComplete="username"
            autoFocus
            aria-describedby="kennung-hinweis"
          />
        </label>
        <span id="kennung-hinweis" className="muted small">
          Genau fünf Buchstaben. Name und Rolle kommen aus dem fiktiven Demo-Verzeichnis.
        </span>
        {fehler && (
          <p role="alert" className="alert">
            {fehler}
          </p>
        )}
        <button className="btn btn--primary btn--lg" type="submit">
          Anmelden
        </button>
      </form>
      <details className="card">
        <summary>Demo-Verzeichnis (fiktive Personen)</summary>
        <table>
          <tbody>
            {DEMO_VERZEICHNIS.map((p) => (
              <tr key={p.kennung}>
                <td>
                  <button
                    className="btn"
                    type="button"
                    onClick={() => setKennung(p.kennung)}
                  >
                    {p.kennung}
                  </button>
                </td>
                <td>{p.name}</td>
                <td>{ROLLE_LABEL[p.rolle]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </main>
  );
}
