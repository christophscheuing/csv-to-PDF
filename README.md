# RVG Rechnungsgenerator

Ein automatisiertes Tool zur Generierung von Kostennoten (Rechnungen) nach RVG (Rechtsanwaltsvergütungsgesetz) aus CSV-Daten.

## 📋 Features

- ✅ Automatische PDF-Generierung aus CSV-Daten
- ✅ Unterstützung für deutsche Zahlenformate (1.234,56)
- ✅ Optionales Stempeln auf Briefkopf-PDF
- ✅ Flexible RVG-Gebührenberechnung
- ✅ TypeScript für Typsicherheit
- ✅ Modulare Architektur für einfache Anpassungen
- ✅ Handlebars-Templates für individuelle Layouts
- ✅ Batch-Verarbeitung mehrerer Rechnungen

## 🚀 Installation

```bash
# Repository klonen oder Dateien herunterladen
cd rvg-rechnungsgenerator

# Dependencies installieren
npm install

# TypeScript kompilieren (optional, wenn Sie TypeScript verwenden)
npm run build
```

## 📁 Projektstruktur

```
rvg-rechnungsgenerator/
├── src/
│   ├── index.ts              # Hauptprogramm
│   ├── types.ts              # TypeScript Interfaces
│   ├── config.ts             # Konfiguration
│   ├── csvParser.ts          # CSV Parsing & Hilfsfunktionen
│   ├── calculator.ts         # RVG Berechnungen
│   └── pdfGenerator.ts       # PDF Generierung
├── beispieldaten.csv         # Input CSV-Datei
├── invoice_template.html     # HTML Template
├── briefkopf.pdf            # (Optional) Briefkopf-PDF
├── output/                   # Generierte PDFs
├── package.json
├── tsconfig.json
└── README.md
```

## 🔧 Verwendung

### CSV-Datei vorbereiten

Ihre CSV-Datei (`beispieldaten.csv`) sollte folgende Spalten enthalten:

```csv
Lf. Nr.;Az. TILP;Anrede;Vorname1;Nachname1;Anrede2;Vorname2;Nachname2;Anrede3;Vorname3;Nachname3;Strasse;PLZ;Ort;Land;Streitwert Klage;Rechnungsnummer
1;14;Herrn;Dr. Fritz;Mustermann;Frau;Heidi;Musterfrau;Musterstr. 66;12345;Musterstadt;D;26.264,34;123/25
```

### Konfiguration anpassen

Bearbeiten Sie `src/config.ts` um Ihre Kanzleidaten anzupassen:

```typescript
export const senderInfo: SenderInfo = {
    senderName: 'Rechtsanwalt Max Mustermann',
    senderStreet: 'Musterstraße 1',
    senderZipCity: '76131 Karlsruhe',
    ustId: 'DE123456789',
    iban: 'DE89 3704 0044 0532 0130 00',
    unterschrift: 'Max Mustermann'
};
```

### Rechnungen generieren

#### Alle Rechnungen verarbeiten
```bash
npm run process:all
```

#### Einzelne Rechnung verarbeiten
```bash
npm run process:single --id=123/25
```

#### Ohne Briefkopf generieren
```bash
npm run process:all --no-stamp
```

## ⚙️ Konfigurationsmöglichkeiten

### Gebührenberechnung anpassen

In `src/calculator.ts` können Sie die RVG-Gebührenberechnung anpassen:

```typescript
const calculateFees = (einzelStreitwert: number): Fees => {
    // Hier Ihre eigene RVG-Logik implementieren
    // Beispiel: RVG-Tabellen verwenden
    return {
        verfahrensgebuehr: berechneVerfahrensgebuehr(einzelStreitwert),
        terminsgebuehr: berechneTerminsgebuehr(einzelStreitwert),
        einigungsgebuehr: berechneEinigungsgebuehr(einzelStreitwert)
    };
};
```

### Template anpassen

Das HTML-Template (`invoice_template.html`) nutzt Handlebars-Syntax:

```html
<p>Rechnungsnummer: {{rechnungsNummer}}</p>
<p>Betrag: {{formatCurrency gesamtbetragBrutto}} EUR</p>
```

Verfügbare Variablen:
- `{{rechnungsNummer}}` - Rechnungsnummer
- `{{name}}` - Empfängername
- `{{datum}}` - Rechnungsdatum
- `{{gesamtbetragBrutto}}` - Bruttobetrag
- `{{formatCurrency amount}}` - Formatiert Zahlen (1234.56 → 1.234,56)

## 🏗️ Architektur

### Module

1. **types.ts**: TypeScript Interfaces für Typsicherheit
2. **config.ts**: Zentrale Konfiguration (Kanzleidaten, Pfade, etc.)
3. **csvParser.ts**: CSV-Parsing und Datenaufbereitung
4. **calculator.ts**: RVG-Berechnungen und Geschäftslogik
5. **pdfGenerator.ts**: PDF-Generierung mit Puppeteer und pdf-lib
6. **index.ts**: Hauptprogramm und CLI

### Datenfluss

```
CSV → Parser → Calculator → Template → PDF → (Optional) Briefkopf → Output
```

## 🔍 Beispiel-Workflow

1. CSV-Datei mit Mandantendaten erstellen
2. Konfiguration in `config.ts` anpassen
3. Optional: Briefkopf-PDF (`briefkopf.pdf`) bereitstellen
4. HTML-Template nach Bedarf anpassen
5. Rechnungen generieren: `npm run process:all`
6. PDFs im `output/` Verzeichnis finden

## 📝 CSV-Format Details

### Pflichtfelder
- `Rechnungsnummer`: Eindeutige ID
- `Vorname1`, `Nachname1`: Mindestens ein Empfänger
- `Strasse`, `PLZ`, `Ort`: Adresse
- `Streitwert Klage`: In deutschem Format (z.B. "26.264,34")

### Optionale Felder
- `Vorname2`, `Nachname2`: Zweiter Empfänger (für Eheleute)
- `Anrede`, `Anrede2`: Anrede (Herrn/Frau)
- `Vorname3`, `Nachname3`: Dritter Empfänger
- `Anrede`, `Anrede3`: Anrede (Herrn/Frau)
- `Az. TILP`: Aktenzeichen

### Deutsche Zahlenformate

Das Tool verarbeitet automatisch deutsche Zahlenformate:
- `1.234,56` → 1234.56
- `26.264,34` → 26264.34

## 🛠️ Erweiterte Anpassungen

### Eigene Berechnungslogik

Fügen Sie in `calculator.ts` eigene Funktionen hinzu:

```typescript
export const calculateCustomFee = (streitwert: number): number => {
    // Ihre Logik hier
    return streitwert * 0.15;
};
```

### Zusätzliche CSV-Felder

1. Interface in `types.ts` erweitern:
```typescript
export interface CSVRawData {
    // ... bestehende Felder
    'Neues Feld': string;
}
```

2. In `calculator.ts` verarbeiten:
```typescript
const invoiceData: InvoiceData = {
    // ...
    customField: csvData['Neues Feld']
};
```

3. Im Template verwenden:
```html
<p>{{customField}}</p>
```

## 🐛 Troubleshooting

### Problem: "CSV file not found"
**Lösung**: Überprüfen Sie, ob `beispieldaten.csv` im Projektverzeichnis existiert.

### Problem: "Briefkopf PDF nicht gefunden"
**Lösung**: Entweder `briefkopf.pdf` bereitstellen oder mit `--no-stamp` arbeiten.

### Problem: "Missing required field"
**Lösung**: Überprüfen Sie, ob alle Pflichtfelder in der CSV vorhanden sind.

### Problem: Puppeteer-Fehler
**Lösung**: Stellen Sie sicher, dass alle System-Dependencies installiert sind:
```bash
# Ubuntu/Debian
sudo apt-get install -y chromium-browser

# macOS
brew install chromium
```

## 📄 Lizenz

MIT

## 🤝 Contributing

Verbesserungen und Anpassungen sind willkommen! Bitte beachten Sie:
- Code sollte TypeScript-konform sein
- Änderungen sollten dokumentiert werden
- Tests für neue Features hinzufügen

## 📞 Support

Bei Fragen oder Problemen:
1. README durchlesen
2. Code-Kommentare prüfen
3. Beispieldaten testen
4. TypeScript-Errors beachten

---

**Hinweis**: Dieses Tool dient als Grundlage. Die RVG-Berechnungen müssen entsprechend Ihrer spezifischen Anforderungen angepasst werden.