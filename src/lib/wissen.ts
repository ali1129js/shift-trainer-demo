/** Knowledge cards (invented, generic food-packaging topics). */
export interface WissensKarte {
  id: string;
  titel: string;
  text: string;
  stichworte: string[];
}

export const WISSENSKARTEN: readonly WissensKarte[] = [
  {
    id: "hygiene",
    titel: "Hygiene am Band",
    text: "Haarnetz, kein Schmuck, Hände waschen nach jeder Pause. Essen und Trinken nur im Pausenraum.",
    stichworte: ["Haarnetz", "Hände", "Schmuck"],
  },
  {
    id: "etikett",
    titel: "Etikettenkontrolle",
    text: "Artikel, Charge, MHD und Strichcode stimmen mit dem Auftrag überein? Im Zweifel: Linie anhalten, Linienleitung rufen.",
    stichworte: ["Etikett", "Strichcode", "Karton"],
  },
  {
    id: "mhd",
    titel: "MHD-Druck lesen",
    text: "Format TT.MM.JJJJ plus Charge NW-JJMMTT-L3x. Beispiel: 26.04.2027 NW-261026-L3A. Unleserlich = Ausschuss.",
    stichworte: ["MHD", "Charge", "Datumsdruck"],
  },
  {
    id: "fremdkoerper",
    titel: "Fremdkörper",
    text: "Glas, Metall, Hartplastik, Holz. Fund melden, betroffene Ware sperren, Fundstück aufbewahren.",
    stichworte: ["Glas", "Metall", "Sperren"],
  },
  {
    id: "metalldetektor",
    titel: "Metalldetektor",
    text: "Test zu Schichtbeginn, nach Auftragswechsel und alle 2 Stunden. Fällt ein Test durch: Ware seit dem letzten guten Test sperren.",
    stichworte: ["Testkörper", "Ausschleusung"],
  },
  {
    id: "waage",
    titel: "Kontrollwaage-Ausschuss",
    text: "Mehr als 3 Ausschleusungen in 5 Minuten: anhalten, Folienzug und Zuführung prüfen, Linienleitung informieren.",
    stichworte: ["Gewicht", "Waage", "Ausschuss"],
  },
  {
    id: "allergene",
    titel: "Allergenmanagement",
    text: "Reihenfolge „ohne vor mit“ planen. Nach Nuss-Produkten immer Allergenreinigung mit Sichtkontrolle.",
    stichworte: ["Allergene", "Nüsse", "Reinigung"],
  },
  {
    id: "vier-augen",
    titel: "Warum Vier-Augen bei der Freigabe",
    text: "Einer erstellt, einer bestätigt. So rutscht ein einzelner Fehler nicht durch.",
    stichworte: ["Freigabe", "Erstmuster", "Qualitätsprüfer"],
  },
  {
    id: "uebergabe",
    titel: "Gute Übergabe",
    text: "Kurz und konkret: Was lief, welche Störungen, was ist offen, wer kümmert sich.",
    stichworte: ["Übergabe", "Schichtwechsel"],
  },
  {
    id: "rueckstellmuster",
    titel: "Rückstellmuster",
    text: "Pro Auftrag Anfang und Ende aufbewahren, beschriftet mit Charge und Uhrzeit.",
    stichworte: ["Muster", "Reklamation"],
  },
];

export function wissenSuchen(q: string): WissensKarte[] {
  const n = q.trim().toLowerCase();
  if (!n) return [...WISSENSKARTEN];
  return WISSENSKARTEN.filter((k) =>
    [k.titel, k.text, ...k.stichworte].some((x) => x.toLowerCase().includes(n))
  );
}
