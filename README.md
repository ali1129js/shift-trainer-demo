# Shift Trainer Demo

Schichtablauf-Simulation für eine **fiktive** Verpackungslinie (Northwind Snacks, Linie 3 –
Müsliriegel). Deutsche Oberfläche.

> Demo mit erfundenen Daten. Kein echtes System. Alle Firmen, Personen, Aufträge und Chargen sind ausgedacht.

## Funktionen

- Zwei Bereiche: **Bereich A – Schlauchbeutel**, **Bereich B – Karton/Palette**
- Schrittweise Freischaltung (Sperrlogik), Entsperren durch die Linienleitung mit Begründung
- Vier-Augen-Freigabe (Erstmuster / Palette)
- Übergabenotizen, Störungen, Stillstände, A4-Berichte, CSV-Export
- Trainingsakte je Kennung (Trainer-Ansicht)
- Wissenskarten

## Entwicklung

```bash
npm ci
npm run dev
npm test        # führt vorher den Leak-Guard aus
npm run build   # führt vorher den Leak-Guard aus
npm run guard:history
```

Daten liegen nur im `localStorage` des Browsers.
