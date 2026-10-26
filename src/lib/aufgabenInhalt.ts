/** Step texts (invented, fictional company Northwind Snacks). */
export interface AufgabenInhalt {
  beschreibung?: string;
  vorgehen?: string[];
  warum?: string;
  /** Reportable events that can be ticked on this step. */
  meldepflichtig?: string[];
}

export const INHALT_FOLGT = "Inhalt folgt.";

const INHALT: Record<string, AufgabenInhalt> = {
  "Übergabenotiz lesen": {
    beschreibung:
      "Notiz der Vorschicht öffnen, offene Punkte und Störungen lesen, Kenntnisnahme bestätigen.",
    warum: "Offene Probleme werden sonst doppelt gesucht oder vergessen.",
  },
  "Persönliche Hygiene prüfen": {
    beschreibung:
      "Haarnetz, saubere Kleidung, kein Schmuck, Hände gewaschen und desinfiziert.",
    warum: "Lebensmittelkontakt – Haare, Schmuck und Keime dürfen nicht ins Produkt.",
  },
  "Linie frei von Vorprodukt": {
    beschreibung:
      "Zuführung, Bänder, Ablagen und Ausschussbehälter auf Reste des letzten Produkts prüfen.",
    warum: "Verhindert Vermischung von Sorten und falsch verpackte Riegel.",
  },
  "Kartonierer frei von Vorprodukt": {
    beschreibung:
      "Kartonierer, Bänder und Ablagen auf Kartons und Packungen des letzten Auftrags prüfen.",
    warum: "Verhindert, dass alte Packungen in neue Kartons gelangen.",
  },
  "Arbeitsplatz sauber und ordentlich": {
    beschreibung:
      "Keine losen Werkzeuge, Messer oder Kleinteile auf der Anlage; Reinigungsstatus prüfen.",
    warum: "Lose Teile sind mögliche Fremdkörper.",
  },
  "Sicherheitseinrichtungen prüfen": {
    beschreibung: "Not-Halt testen, Schutztüren schließen, Lichtschranke kurz auslösen.",
    warum: "Schutz der Bediener vor bewegten Teilen.",
  },
  "Metalldetektor-Testkörper": {
    beschreibung:
      "Prüfkörper (Eisen, Nichteisen, Edelstahl) nacheinander durchlaufen lassen, Ausschleusung bestätigen.",
    warum: "Nur ein geprüfter Detektor schützt sicher vor Metallteilen.",
    meldepflichtig: ["Testkörper nicht ausgeschleust"],
  },
  "Kontrollwaage nullen": {
    beschreibung: "Waage tarieren, Referenzgewicht auflegen, Abweichung notieren.",
    warum: "Unter- oder Übergewicht wird sonst nicht erkannt.",
  },
  "Etikettendrucker Probedruck": {
    beschreibung: "Probeetikett drucken, Artikel, Charge und Strichcode prüfen.",
    warum: "Fehler am Drucker werden vor dem ersten Karton erkannt.",
  },
  "Stretchfolie und Paletten bereitstellen": {
    beschreibung:
      "Saubere, unbeschädigte Paletten und ausreichend Stretchfolie an den Palettierer stellen.",
    warum: "Beschädigte Paletten sind ein Hygiene- und Sicherheitsrisiko.",
  },
  "Erste Packungen prüfen": {
    beschreibung:
      "Drei Packungen entnehmen, Siegelnaht, Druckbild und Inhalt kontrollieren.",
    warum: "Fehler früh finden, bevor tausende Packungen betroffen sind.",
  },
  "Stündliche Gewichtskontrolle": {
    beschreibung: "10 Packungen wiegen, Mittelwert eintragen.",
    warum: "Füllmenge muss der Angabe auf der Packung entsprechen.",
    meldepflichtig: ["Mittelwert unter Sollgewicht"],
  },
  "MHD- und Chargendruck kontrollieren": {
    beschreibung: "Aufdruck mit Auftragsdaten vergleichen, Lesbarkeit prüfen.",
    warum: "Falsches MHD führt zu Rückruf.",
  },
  "Siegelnaht-Test": {
    beschreibung: "Eine Packung unter leichtem Druck auf Dichtheit prüfen.",
    warum: "Undichte Beutel lassen Feuchtigkeit rein, Riegel werden weich.",
    meldepflichtig: ["Folienriss", "Siegelnaht undicht"],
  },
  "Ausschuss zählen": {
    beschreibung: "Ausschussbehälter leeren, Anzahl und Grund eintragen.",
    warum: "Steigender Ausschuss zeigt Probleme frühzeitig.",
  },
  "Folienvorrat prüfen": {
    beschreibung: "Restlänge der Rolle prüfen, nächste Rolle bereitstellen.",
    warum: "Vermeidet ungeplanten Stillstand.",
  },
  "Störung erfassen": {
    beschreibung:
      "Bei Stopp Grund wählen (Stau, Folienriss, kein Material), Dauer eintragen.",
    warum: "Nur erfasste Störungen können verbessert werden.",
    meldepflichtig: ["Stau am Kartonierer", "Etikettendrucker ausgefallen"],
  },
  "Etikett am Karton scannen": {
    beschreibung: "Ein Kartonetikett pro Stunde scannen, Artikel und Charge vergleichen.",
    warum: "Falsche Etiketten führen zu Fehllieferungen.",
  },
  "Kartonverschluss prüfen": {
    beschreibung:
      "Stichprobe: Karton geschlossen, Klebung hält, keine Packung eingeklemmt.",
    warum: "Offene Kartons gefährden Produkt und Transport.",
  },
  "Packschema der Palette prüfen": {
    beschreibung: "Lagen und Anzahl Kartons pro Lage mit dem Packschema vergleichen.",
    warum: "Falsches Packschema führt zu instabilen Paletten und Mengenfehlern.",
  },
  "Palettenetikett anbringen": {
    beschreibung: "Etikett an zwei Seiten anbringen und scannen.",
    warum: "Nur gekennzeichnete Paletten sind rückverfolgbar.",
  },
  "Kartonvorrat prüfen": {
    beschreibung: "Kartonzuschnitte am Magazin prüfen, Nachschub anfordern.",
    warum: "Vermeidet Stillstand im Bereich B.",
  },
  "Letzte Packung markieren": {
    beschreibung:
      "Zuführung stoppen, letzte Packung entnehmen und als Rückstellmuster ablegen.",
    warum: "Muster belegen die Qualität bei späteren Reklamationen.",
  },
  "Mengen erfassen": {
    beschreibung: "Gutmenge, Ausschuss und Restriegel eintragen.",
    warum: "Mengenbilanz muss aufgehen.",
  },
  "Restmaterial zurückbuchen": {
    beschreibung: "Angebrochene Folienrollen beschriften und zurück ins Lager.",
    warum: "Verhindert Verwechslung mit dem nächsten Auftrag.",
  },
  "Auftragsdokumentation prüfen": {
    beschreibung: "Alle Kontrollen des Auftrags auf Vollständigkeit prüfen.",
    warum: "Lückenhafte Doku blockiert die Freigabe der Ware.",
  },
  "Auftrag abschließen": {
    beschreibung: "Auftrag im System beenden, Abschluss bestätigen.",
    warum: "Nächster Auftrag kann erst danach starten.",
  },
  "Letzte Palette abschließen": {
    beschreibung: "Palette wickeln, Palettenetikett anbringen und scannen.",
    warum: "Nur vollständig gekennzeichnete Paletten dürfen ins Lager.",
  },
  "Rückstellmuster ablegen": {
    beschreibung:
      "Einen Karton vom Auftragsende beschriften (Charge, Uhrzeit) und ablegen.",
    warum: "Belegt den Zustand der Ware bei Reklamationen.",
  },
  "Restkartons zurückbuchen": {
    beschreibung: "Unbenutzte Kartons und Etiketten beschriften und zurück ins Lager.",
    warum: "Alte Etiketten an der Linie sind eine Verwechslungsgefahr.",
  },
  "Mengen abgleichen": {
    beschreibung: "Kartonanzahl mit der Packungszahl aus Bereich A vergleichen.",
    warum: "Abweichungen deuten auf Verluste oder Zählfehler.",
  },
  "Übergabeprotokoll ergänzen": {
    beschreibung: "Kurz notieren: was lief, welche Störungen, was ist offen.",
    warum: "Die nächste Schicht startet ohne Suche.",
  },
  "Linie leerfahren": {
    beschreibung: "Alle Riegel und Packungen der alten Sorte aus der Anlage entfernen.",
    warum: "Keine Sortenvermischung (Allergene!).",
  },
  "Folienrolle wechseln": {
    beschreibung:
      "Alte Rolle entnehmen, neue Rolle laut Auftrag einlegen, Artikelnummer prüfen.",
    warum: "Falsche Folie bedeutet falsche Verpackung.",
  },
  Allergenreinigung: {
    beschreibung: "Kontaktflächen nach Reinigungsplan säubern, Sichtkontrolle.",
    warum: "Spuren z. B. von Nüssen können für Allergiker gefährlich sein.",
  },
  "Datumsdruck umstellen": {
    beschreibung: "Neue Charge und neues MHD am Drucker einstellen.",
    warum: "Alte Daten auf neuem Produkt sind ein Kennzeichnungsfehler.",
  },
  "Formatteile prüfen": {
    beschreibung: "Bei anderer Packungsgröße Formatteile tauschen, Einstellungen laden.",
    warum: "Falsches Format erzeugt Stau und Ausschuss.",
  },
  "Erstmusterfreigabe (Vier-Augen)": {
    beschreibung:
      "Bediener erstellt Erstmuster und prüft Druck, Siegelnaht, Gewicht, Etikett. Qualitätsprüfer bestätigt mit zweiter Unterschrift.",
    warum:
      "Eine Person allein kann sich irren – zwei unabhängige Prüfungen fangen Fehler ab. Ohne beide Unterschriften bleibt die Produktion gesperrt.",
  },
  "Kartonierer leerfahren": {
    beschreibung: "Alle Kartons des alten Auftrags aus dem Kartonierer entfernen.",
    warum: "Keine alten Kartons im neuen Auftrag.",
  },
  "Kartonetiketten tauschen": {
    beschreibung:
      "Alte Etiketten entfernen, neue Etiketten einlegen und Probedruck prüfen.",
    warum: "Verhindert falsch gekennzeichnete Kartons.",
  },
  "Kartonformat umstellen": {
    beschreibung: "Formatteile des Kartonierers für die neue Kartongröße einstellen.",
    warum: "Falsches Format beschädigt Kartons.",
  },
  "Palettenfreigabe (Vier-Augen)": {
    beschreibung:
      "Bediener prüft ersten Karton und erste Lage (Etikett, Verschluss, Packschema). Qualitätsprüfer bestätigt mit zweiter Unterschrift.",
    warum: "Zwei unabhängige Prüfungen verhindern falsch gekennzeichnete Paletten.",
  },
  "Auftrag auswählen": {
    beschreibung: "Nächsten Auftrag aus der Liste öffnen, Produkt und Menge prüfen.",
    warum: "Reihenfolge ist mit der Logistik abgestimmt.",
  },
  "Material bereitstellen": {
    beschreibung: "Riegel, Folie, Kartons und Etiketten anhand der Stückliste prüfen.",
    warum: "Fehlendes Material stoppt die Linie.",
  },
  "Allergenstatus abgleichen": {
    beschreibung: "Allergene des neuen Produkts mit dem vorherigen vergleichen.",
    warum: "Entscheidet, ob eine Allergenreinigung nötig ist.",
  },
  "Anlagenparameter laden": {
    beschreibung: "Rezept für das Produkt an der Schlauchbeutelmaschine laden.",
    warum: "Siegeltemperatur und Geschwindigkeit hängen vom Produkt ab.",
  },
  "Freigabe prüfen": {
    beschreibung: "Sicherstellen, dass die Erstmusterfreigabe beide Unterschriften hat.",
    warum: "Ohne Freigabe darf nicht produziert werden.",
  },
  "Produktion starten": {
    beschreibung: "Linie anfahren, erste Minuten beobachten.",
    warum: "Anlaufprobleme zeigen sich meist sofort.",
  },
  "Kartons und Etiketten bereitstellen": {
    beschreibung: "Kartons und Etiketten des neuen Auftrags an den Kartonierer stellen.",
    warum: "Material muss vor dem Start vollständig sein.",
  },
  "Packschema laden": {
    beschreibung: "Packschema des neuen Produkts am Palettierer laden.",
    warum: "Andere Kartongröße braucht anderes Lagenbild.",
  },
  "Freigabe aus Bereich A prüfen": {
    beschreibung: "Prüfen, dass Bereich A das Erstmuster freigegeben hat.",
    warum: "Bereich B packt nur freigegebene Ware.",
  },
  "Kartonierer starten": {
    beschreibung: "Kartonierer anfahren, ersten Karton prüfen.",
    warum: "Fehler beim Start sofort erkennen.",
  },
};

/** Short intro per area/section, keyed "root / section". */
export const BEREICH_INHALT: Record<string, string> = {
  "Primary / Schichtstart":
    "Sicher und sauber in die Schicht starten: Übergabe, Hygiene, Prüfmittel.",
  "Primary / Produktion": "Laufende Kontrollen während der Produktion.",
  "Primary / Auftragsende": "Auftrag sauber abschließen: Muster, Mengen, Restmaterial.",
  "Primary / Auftragswechsel":
    "Linie für den nächsten Auftrag vorbereiten – mit Vier-Augen-Freigabe.",
  "Primary / Nächster Auftrag":
    "Neuen Auftrag prüfen, Material bereitstellen, Produktion starten.",
  "Secondary / Schichtstart":
    "Sicher und sauber in die Schicht starten: Übergabe, Hygiene, Prüfmittel.",
  "Secondary / Produktion": "Laufende Kontrollen während der Produktion.",
  "Secondary / Auftragsende": "Auftrag sauber abschließen: Muster, Mengen, Restmaterial.",
  "Secondary / Auftragswechsel":
    "Linie für den nächsten Auftrag vorbereiten – mit Vier-Augen-Freigabe.",
  "Secondary / Nächster Auftrag":
    "Neuen Auftrag prüfen, Material bereitstellen, Produktion starten.",
};

export function inhaltFuer(
  _root: string,
  _bereich: string,
  name: string
): AufgabenInhalt {
  return INHALT[name] ?? {};
}
