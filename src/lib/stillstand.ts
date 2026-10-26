/** Standstills from this many minutes on count as "long". */
export const STILLSTAND_GRENZE_MIN = 30;

export function stillstandRegel(dauerMin: number): {
  art: "kurz" | "lang";
  hinweis: string;
} {
  return dauerMin >= STILLSTAND_GRENZE_MIN
    ? { art: "lang", hinweis: "Langer Stillstand – Linienleitung informieren." }
    : { art: "kurz", hinweis: "Kurzer Stillstand – Grund erfassen." };
}
