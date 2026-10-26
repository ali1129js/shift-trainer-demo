import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/auth";
import { ROLLE_LABEL } from "@/lib/schema";
import { useLadeStatus, useAktion } from "@/data/hooks";
import { useToast } from "@/components/ui/toast";

/** Plain text wordmark (no logo). */
export function Logo() {
  return <span className="brand__wordmark">Shift Trainer Demo</span>;
}

function LadeFehlerBanner() {
  const { data } = useLadeStatus();
  const neu = useAktion((repo) => repo.neuBeginnen());
  const { toast } = useToast();
  if (!data || data.ok) return null;
  const f = data.fehler;
  return (
    <div role="alert" className="alert no-print" style={{ margin: 16 }}>
      <strong>Gespeicherte Daten konnten nicht geladen werden.</strong>
      <p>{f.meldung}</p>
      <p>
        {f.backupKey
          ? `Die Originaldaten wurden unverändert unter ${f.backupKey} im Browserspeicher gesichert. `
          : ""}
        Speichern ist gesperrt, damit nichts überschrieben wird.
      </p>
      {f.backupKey && (
        <button
          className="btn"
          onClick={() => {
            if (
              window.confirm(
                "Mit leerem Datenbestand neu beginnen? Die Sicherung bleibt erhalten."
              )
            )
              neu.mutate(undefined, {
                onError: (e) =>
                  toast({
                    variant: "destructive",
                    title: "Fehler",
                    description: e.message,
                  }),
              });
          }}
        >
          Neu beginnen
        </button>
      )}
    </div>
  );
}

const NAV = [
  { href: "/", label: "Übersicht" },
  { href: "/schichten", label: "Simulationen" },
  { href: "/berichte", label: "Berichte" },
  { href: "/training", label: "Training" },
  { href: "/wissen", label: "Wissen" },
  { href: "/aggregation", label: "Aggregation" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [pfad] = useLocation();
  const { account, rolle, logout } = useAuth();
  return (
    <div>
      <header className="topbar no-print">
        <div className="topbar__inner">
          <Link href="/" className="brand">
            <Logo />
            <span>
              <small>Northwind Snacks · Linie 3 · Ablauf-Simulation</small>
            </span>
          </Link>
          <nav className="nav" aria-label="Hauptnavigation">
            {NAV.map((n) => {
              const aktiv = n.href === "/" ? pfad === "/" : pfad.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={aktiv ? "page" : undefined}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <span className="spacer" />
          {account && (
            <div className="user">
              <span>
                {account.name} · <code>{account.kennung}</code>
              </span>
              {rolle && <span className="rolle">{ROLLE_LABEL[rolle]}</span>}
              <button
                className="btn"
                style={{ padding: "4px 10px" }}
                onClick={() => void logout()}
              >
                Abmelden
              </button>
            </div>
          )}
        </div>
        <div className="accent-rule" />
      </header>
      <div className="sim-banner no-print" role="note">
        Demo mit erfundenen Daten. Kein echtes System.
      </div>
      <LadeFehlerBanner />
      {children}
      <footer className="demo-footer no-print">Fiktive Demo. Alle Daten erfunden.</footer>
    </div>
  );
}
