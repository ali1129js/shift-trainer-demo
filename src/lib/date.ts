import type { SchichtTyp } from "./schema";

/** All "today"/"now" values are computed in Europe/Berlin local time (not UTC). */
export const ZEITZONE = "Europe/Berlin";

function teile(d: Date): Record<string, string> {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZEITZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const out: Record<string, string> = {};
  for (const p of fmt.formatToParts(d)) out[p.type] = p.value;
  return out;
}

/** ISO date YYYY-MM-DD in Europe/Berlin. */
export function heuteBerlin(d: Date = new Date()): string {
  const t = teile(d);
  return `${t.year}-${t.month}-${t.day}`;
}

/** Hour 0–23 in Europe/Berlin. */
export function stundeBerlin(d: Date = new Date()): number {
  return Number(teile(d).hour);
}

/** Shift type suggested from the clock: 06–13 Früh, 14–21 Spät, otherwise Nacht. */
export function schichtAusUhrzeit(d: Date = new Date()): SchichtTyp {
  const h = stundeBerlin(d);
  if (h >= 6 && h <= 13) return "Frueh";
  if (h >= 14 && h <= 21) return "Spaet";
  return "Nacht";
}

/** Add days to an ISO date (calendar arithmetic, timezone-free). */
export function tageAddieren(iso: string, tage: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + tage));
  return dt.toISOString().slice(0, 10);
}

/** Instant for a Berlin wall-clock time on an ISO date (DST-aware). */
export function zeitpunktBerlin(iso: string, stunde: number, minute = 0): Date {
  const [y, m, d] = iso.split("-").map(Number);
  const naiv = Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1, stunde, minute);
  // offset of Berlin at that instant (try twice to settle around DST switches)
  let t = naiv;
  for (let i = 0; i < 2; i++) {
    const p = teile(new Date(t));
    const alsUtc = Date.UTC(
      Number(p.year),
      Number(p.month) - 1,
      Number(p.day),
      Number(p.hour),
      Number(p.minute),
      Number(p.second)
    );
    t = naiv - (alsUtc - t);
  }
  return new Date(t);
}

/** "2026-10-11" -> "11.10.2026"; empty -> "—" */
export function isoZuDeutsch(iso: string): string {
  return iso ? iso.split("-").reverse().join(".") : "—";
}

/** "2026-10-11" -> "11.10." */
export function isoZuKurz(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}.${m}.`;
}

/** ISO timestamp -> "dd.mm.yyyy, HH:MM" in Europe/Berlin. */
export function formatZeitstempel(ts: string): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("de-DE", {
    timeZone: ZEITZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Duration in ms -> "{m} Min." or "{h} Std. {mm} Min." */
export function formatDauer(ms: number): string {
  const min = Math.max(0, Math.floor(ms / 60000));
  if (min < 60) return `${min} Min.`;
  return `${Math.floor(min / 60)} Std. ${String(min % 60).padStart(2, "0")} Min.`;
}
