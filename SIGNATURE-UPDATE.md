# Unterschrift aktualisieren

## Übersicht

Die Unterschrift ist als Base64-kodiertes Bild direkt im `invoice_template.html` eingebettet. Dies ermöglicht eine effiziente PDF-Generierung ohne Dateizugriffe zur Laufzeit.

## Unterschrift ändern

### Methode 1: npm-Skript (empfohlen)

```bash
npm run update-signature [Bildpfad] [Höhe in px]
```

**Beispiele:**

```bash
# Standard: Siegmann.png mit 120px Höhe
npm run update-signature

# Eigene Datei mit Standardhöhe (120px)
npm run update-signature meine-unterschrift.png

# Eigene Datei mit bestimmter Höhe
npm run update-signature meine-unterschrift.png 150

# Datei in Unterordner
npm run update-signature secret-data/neue-unterschrift.png 100
```

### Methode 2: Direkter Aufruf

```bash
node update-signature.cjs [Bildpfad] [Höhe in px]
```

## Größe anpassen

Die Höhe der Unterschrift wird in Pixeln angegeben. Empfohlene Werte:

- **60px**: Klein (ursprünglich)
- **120px**: Mittel (aktuell)
- **150px**: Groß
- **180px**: Sehr groß

Die Breite passt sich automatisch proportional an.

## Unterstützte Bildformate

- PNG (empfohlen)
- JPG/JPEG

## Hinweise

- Die Änderung erfolgt **sofort** im Template
- **Kein Rebuild** des TypeScript-Codes erforderlich
- Die Originaldatei (z.B. `Siegmann.png`) wird nicht verändert
- Das Base64-kodierte Bild wird direkt im HTML gespeichert

## Was passiert im Hintergrund?

1. Das Skript liest die angegebene Bilddatei
2. Konvertiert das Bild in Base64-Format
3. Sucht das bestehende `<img>`-Tag im Template
4. Ersetzt den Base64-String und die Höhe
5. Speichert das aktualisierte Template

## Fehlerbehebung

**Fehler: "Image file not found"**
- Prüfen Sie, ob der Bildpfad korrekt ist
- Der Pfad ist relativ zum Projekt-Root-Verzeichnis

**Fehler: "Could not find signature image tag"**
- Das Template wurde möglicherweise manuell verändert
- Stellen Sie sicher, dass ein `<img>`-Tag mit `alt="Unterschrift"` existiert
