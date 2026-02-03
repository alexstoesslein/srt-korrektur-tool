# SRT Korrektur-Tool

Ein kostenloses Web-Tool zur Rechtschreib- und Grammatikprüfung von SRT-Untertiteldateien.

**[Direkt im Browser nutzen](https://alexstoesslein.github.io/srt-korrektur-tool/)**

![Screenshot](screenshot.png)

## Features

- **Kostenlose Rechtschreibprüfung** - Powered by [LanguageTool](https://languagetool.org), kein API-Key erforderlich
- **Video-Vorschau** - Lade optional ein Video hoch, um Untertitel synchron zu sehen
- **Mehrere Korrekturvorschläge** - Wähle aus verschiedenen Alternativen per Dropdown
- **Direktes Bearbeiten** - Klicke auf jeden Untertitel, um ihn manuell zu bearbeiten
- **Export** - Speichere die korrigierte SRT-Datei mit einem Klick
- **Datenschutz** - Alles läuft im Browser, keine Daten werden gespeichert

## Anleitung

### 1. Tool öffnen
Öffne das Tool im Browser: **[https://alexstoesslein.github.io/srt-korrektur-tool/](https://alexstoesslein.github.io/srt-korrektur-tool/)**

### 2. SRT-Datei hochladen
- Klicke auf "SRT-Datei hochladen" oder ziehe die Datei per Drag & Drop
- Optional: Lade auch das zugehörige Video hoch, um die Untertitel synchron zu sehen

### 3. Rechtschreibung prüfen
- Klicke auf **"Rechtschreibung prüfen"**
- Das Tool analysiert jeden Untertitel und zeigt gefundene Fehler an

### 4. Korrekturen bearbeiten

Du hast drei Möglichkeiten, Fehler zu korrigieren:

**A) Vorschlag übernehmen**
- Bei jedem Fehler siehst du einen Korrekturvorschlag
- Klicke auf **"Übernehmen"**, um den Vorschlag anzunehmen
- Oder **"Ablehnen"**, um den Originaltext zu behalten

**B) Aus mehreren Vorschlägen wählen**
- Wenn es mehrere Korrekturmöglichkeiten gibt, siehst du ein Dropdown-Menü
- Wähle die passende Korrektur aus
- Die Vorschau wird sofort aktualisiert

**C) Manuell bearbeiten**
- Klicke direkt auf den Untertitel-Text
- Bearbeite den Text wie gewünscht
- **Enter** = Speichern
- **Shift+Enter** = Neue Zeile einfügen

### 5. Exportieren
- Klicke auf **"Korrigierte SRT exportieren"**
- Die Datei wird mit dem Suffix `_korrigiert.srt` heruntergeladen

## Tipps

- **Filter nutzen**: Aktiviere "Nur Einträge mit Korrekturen anzeigen", um schneller zu arbeiten
- **Alle übernehmen**: Mit "Alle Korrekturen übernehmen" kannst du alle Vorschläge auf einmal akzeptieren
- **Video-Sync**: Mit dem Play-Button neben jedem Untertitel springst du zur entsprechenden Stelle im Video

## Lokal nutzen

Falls du das Tool offline nutzen möchtest:

1. Repository klonen:
   ```bash
   git clone https://github.com/alexstoesslein/srt-korrektur-tool.git
   ```

2. `index.html` im Browser öffnen

**Hinweis**: Die Rechtschreibprüfung benötigt eine Internetverbindung (LanguageTool API).

## Technologie

- Vanilla JavaScript (keine Frameworks)
- [LanguageTool API](https://languagetool.org/http-api/) für Rechtschreibprüfung
- Komplett clientseitig - keine Server-Komponente nötig

## Lizenz

MIT License - Frei nutzbar und modifizierbar.

---

Erstellt mit Unterstützung von [Claude](https://claude.ai)
