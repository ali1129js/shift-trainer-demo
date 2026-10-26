import { Link } from "wouter";

export function NichtGefunden({ text = "Seite nicht gefunden." }: { text?: string }) {
  return (
    <main className="page">
      <div className="card stack">
        <h1>{text}</h1>
        <Link href="/">Zur Übersicht</Link>
      </div>
    </main>
  );
}
