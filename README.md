# Roots Roleplay Website

Interne Dokumentation für das Entwickler-Team von Roots Roleplay.

## 📋 Inhaltsverzeichnis

- [Schnellstart](#schnellstart)
- [Inhalte aktualisieren](#inhalte-aktualisieren)
- [Bilder hinzufügen/aktualisieren](#bilder-hinzufügenaktualisieren)
- [Lokale Entwicklung](#lokale-entwicklung)
- [Build & Deployment](#build--deployment)
- [Projektstruktur](#projektstruktur)
- [Technische Details](#technische-details)

## 🚀 Schnellstart

### Voraussetzungen

- Node.js (v14 oder höher) - optional, nur für Build-Tools
- Git (für Versionskontrolle)

### Lokale Entwicklung starten

**Option 1: Mit npm**
```bash
npm install  # Optional: Dependencies installieren
npm start    # Server startet auf http://localhost:3000
```

**Option 2: Mit den Scripts**
- **Windows:** `START_SERVER.bat` doppelklicken
- **Linux/Mac:** `./START_SERVER.sh` ausführen

## 📝 Inhalte aktualisieren

Alle Inhalte werden über JSON-Dateien im `content/` Verzeichnis verwaltet.

### Kategorien

- **`companies.json`** - Legale Unternehmen (Polizei, Rettungsdienst, etc.)
- **`crime-factions.json`** - Illegale Fraktionen (Gangs, etc.)
- **`nogos.json`** - Regelwerk-Inhalte
- **`whitelist.json`** - Whitelist-Informationen
- **`seo.json`** - SEO-Metadaten (Meta-Tags, Open Graph, Twitter Cards, Structured Data)

### JSON-Struktur Beispiel

#### Unternehmen (companies.json)
```json
{
  "id": "police",
  "title": "Los Santos Police Department | Deine Karriere beginnt hier",
  "displayName": "Polizei",
  "description": "<p>Beschreibungstext hier...</p>",
  "media": {
    "type": "video",
    "youtubeId": "VIDEO_ID_HIER"
  }
}
```

#### Illegale Fraktionen (crime-factions.json)
```json
{
  "id": "ballas",
  "title": "Ballas",
  "tagline": "Schlagzeile hier",
  "content": "<p>Inhaltstext hier...</p>",
  "media": {
    "type": "image",
    "src": "public/crime/crime_ballas.png",
    "alt": "Ballas"
  }
}
```

#### Regelwerk/Whitelist (nogos.json / whitelist.json)
```json
{
  "id": "rules_1",
  "title": "Titel",
  "tagline": "Untertitel",
  "content": "<p>Inhalt hier...</p>",
  "media": {
    "type": "image",
    "src": "public/guidelines/4.png",
    "alt": "Regelwerk Bild"
  }
}
```

### Wichtige Hinweise

- **HTML erlaubt:** In `description` und `content` Feldern kann HTML verwendet werden
- **Paragraphen:** Nutze `<p>...</p>` für Absätze
- **IDs:** Müssen eindeutig sein und sollten nur Kleinbuchstaben, Zahlen und Unterstriche enthalten
- **Medien:** YouTube-Videos werden mit `youtubeId` referenziert, Bilder mit `src` Pfad

## 🖼️ Bilder hinzufügen/aktualisieren

### Bildverzeichnisse

```
public/
├── company/              # Firmenlogos (PNG)
├── company_characters/   # Charakterbilder für legale Unternehmen
├── crime/                # Gang-Bilder
├── crime_characters/     # Charakterbilder für illegale Fraktionen
├── crime_shuffle/        # Bilder für illegale Platzhalter-Animation
├── random_characters/    # Zufallscharakter-Pool (1.png bis 100.png)
├── guidelines/           # Regelwerk-Bilder
├── whitelist/            # Whitelist-Bilder
└── ...                   # Weitere Assets
```

### Bild-Namenskonventionen

#### Unternehmen
- **Logo:** `public/company/{id}.png`
  - Beispiel: `public/company/police.png`
- **Charakter:** `public/company_characters/{id}_character.png`
  - Beispiel: `public/company_characters/police_character.png`

#### Illegale Fraktionen
- **Bild:** `public/crime/crime_{id}.png`
  - Beispiel: `public/crime/crime_ballas.png`
- **Charakter:** `public/crime_characters/{id}_character.png`
  - Beispiel: `public/crime_characters/ballas_character.png`

#### Zufallscharaktere
- **Nummeriert:** `public/random_characters/1.png` bis `100.png`
- **Named:** Dateien wie `addad.png`, `kitt.png`, etc.

### Neue Bilder hinzufügen

1. **Bild an den richtigen Ort kopieren:**
   ```bash
   # Beispiel: Neues Firmenlogo
   cp neues-logo.png public/company/polizei.png
   ```

2. **In JSON-Datei referenzieren:**
   ```json
   {
     "id": "polizei",
     "media": {
       "type": "image",
       "src": "public/company/polizei.png",
       "alt": "Polizei Logo"
     }
   }
   ```

3. **Charakterbild hinzufügen (falls nötig):**
   - Legale Unternehmen: `public/company_characters/polizei_character.png`
   - Illegale Fraktionen: `public/crime_characters/ballas_character.png`

### Bildoptimierung

- **Format:** PNG für Logos, PNG für Charaktere
- **Größe:** Bilder sollten bereits optimiert sein (nicht zu groß)
- **Namen:** Keine Leerzeichen, am besten Kleinbuchstaben und Unterstriche
- **Fallback:** Bei fehlenden Bildern wird automatisch ein Fallback geladen

## 🏗️ Build & Deployment

### Build-Prozess (Optional)

Minifizierung für Produktion:
```bash
npm run build
```

Erstellt:
- `css/main.min.css` - Minifiziertes CSS
- `js/main.min.js` - Minifiziertes JavaScript

**Hinweis:** Die Seite funktioniert auch ohne Minifizierung. Diese ist optional für weitere Optimierung.

### GitHub Pages Deployment

1. **Änderungen committen:**
   ```bash
   git add .
   git commit -m "Beschreibung der Änderungen"
   git push origin main
   ```

2. **Automatisches Deployment:**
   - GitHub Pages deployt automatisch nach jedem Push
   - Website ist nach ca. 1-2 Minuten live

3. **Manuelles Deployment prüfen:**
   - Repository → Settings → Pages
   - Branch: `main`
   - Folder: `/ (root)`

### Deployment-Checkliste

- [ ] Inhalte in JSON-Dateien aktualisiert
- [ ] Neue Bilder hinzugefügt (falls nötig)
- [ ] Lokal getestet (`npm start`)
- [ ] Alle Bilder laden korrekt
- [ ] Videos funktionieren (falls vorhanden)
- [ ] Änderungen committed und gepusht

## 📁 Projektstruktur

```
Roots Website/
├── index.html              # Haupt-HTML-Datei
├── css/
│   ├── main.css           # Haupt-Stylesheet (EDITIEREN)
│   └── main.min.css       # Minifiziert (automatisch generiert)
├── js/
│   ├── main.js            # Haupt-JavaScript (EDITIEREN)
│   └── main.min.js        # Minifiziert (automatisch generiert)
├── content/               # INHALTE HIER EDITIEREN
│   ├── companies.json     # Legale Unternehmen
│   ├── crime-factions.json # Illegale Fraktionen
│   ├── nogos.json         # Regelwerk
│   └── whitelist.json     # Whitelist
├── public/                # BILDER HIER HINZUFÜGEN
│   ├── company/           # Firmenlogos
│   ├── company_characters/ # Firmencharaktere
│   ├── crime/             # Gang-Bilder
│   ├── crime_characters/  # Gang-Charaktere
│   └── ...
├── fonts/                 # Custom Fonts
└── package.json           # Build-Konfiguration
```

## 🔧 Technische Details

### YouTube-Videos einbinden

```json
{
  "media": {
    "type": "video",
    "youtubeId": "VIDEO_ID_HIER",
    "buyUrl": "https://optional-link.com",  // Optional
    "allVideos": ["video1", "video2"],      // Optional
    "videoIndex": 0                         // Optional
  }
}
```

**Video-ID finden:**
- YouTube-URL: `https://www.youtube.com/watch?v=VIDEO_ID`
- Nur die ID nach `v=` verwenden

### Pfade und GitHub Pages

- Die Seite funktioniert automatisch auf GitHub Pages
- Pfade werden automatisch normalisiert
- Funktioniert sowohl im Root als auch in Unterordnern

### Kategorien im Detail

#### Legale Unternehmen (`legal`)
- Nutzen `companies.json`
- Zeigen Logo oben links in Detailansicht
- Haben Charakterbilder
- Unterstützen Videos und Bilder

#### Illegale Fraktionen (`illegal`)
- Nutzen `crime-factions.json`
- Zeigen KEIN Logo
- Haben Gang-Charakterbilder
- Spezielle visuelle Effekte (Fog, Cracks)

#### Regelwerk (`regelwerk`)
- Nutzen `nogos.json`
- Zeigen Guidelines-Grid
- Spezielle Card-Flip-Funktionalität

#### Whitelist (`whitelist`)
- Nutzen `whitelist.json`
- Zeigen Whitelist-Bilder
- Spezielle Card-Animationen

## ⚙️ Häufige Aufgaben

### Neues Unternehmen hinzufügen

1. Logo nach `public/company/{id}.png` kopieren
2. Charakterbild nach `public/company_characters/{id}_character.png` kopieren
3. Eintrag in `content/companies.json` hinzufügen
4. Optional: Video-ID hinzufügen

### Neue Gang hinzufügen

1. Gang-Bild nach `public/crime/crime_{id}.png` kopieren
2. Charakterbild nach `public/crime_characters/{id}_character.png` kopieren
3. Eintrag in `content/crime-factions.json` hinzufügen

### Regelwerk-Bild hinzufügen

1. Bild nach `public/guidelines/{nummer}.png` kopieren (nummeriert)
2. In `content/nogos.json` referenzieren:
   ```json
   {
     "media": {
       "src": "public/guidelines/10.png",
       "alt": "Beschreibung"
     }
   }
   ```

### SEO-Metadaten aktualisieren

Alle SEO-relevanten Daten werden in `content/seo.json` verwaltet:

```json
{
  "site": {
    "name": "Roots Roleplay",
    "title": "Roots Roleplay | Alles beginnt mit einer Entscheidung",
    "description": "Beschreibung hier...",
    "keywords": "Keyword1, Keyword2, ...",
    "author": "Roots Roleplay",
    "language": "German",
    "locale": "de_DE"
  },
  "meta": {
    "robots": "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
    "googlebot": "index, follow",
    "revisitAfter": "7 days",
    "themeColor": "#1f2127",
    "msapplicationTileColor": "#1f2127"
  },
  "openGraph": {
    "type": "website",
    "title": "Titel für Facebook/Open Graph",
    "description": "Beschreibung für Facebook/Open Graph",
    "image": "public/roots-roleplay.svg",
    "imageWidth": "1200",
    "imageHeight": "630",
    "imageType": "image/svg+xml",
    "siteName": "Roots Roleplay",
    "locale": "de_DE"
  },
  "twitter": {
    "card": "summary_large_image",
    "title": "Titel für Twitter",
    "description": "Beschreibung für Twitter",
    "image": "public/roots_R.png",
    "imageAlt": "Roots Roleplay Logo"
  },
  "icons": {
    "favicon": "public/roots_R.png",
    "appleTouchIcon": "public/roots_R.png",
    "shortcutIcon": "public/roots_R.png"
  },
  "structuredData": {
    "website": {
      "name": "Roots Roleplay",
      "description": "Beschreibung für Structured Data",
      "inLanguage": "de-DE",
      "publisher": {
        "name": "Roots Roleplay",
        "logo": "public/roots-roleplay.svg"
      }
    },
    "organization": {
      "name": "Roots Roleplay",
      "description": "Organisations-Beschreibung",
      "logo": "public/roots-roleplay.svg",
      "sameAs": [
        "https://discord.gg/rootsroleplay"
      ],
      "contactPoint": {
        "contactType": "customer service",
        "availableLanguage": ["German"]
      }
    }
  }
}
```

**Wichtige Hinweise:**
- Änderungen an `seo.json` werden automatisch beim Laden der Seite angewendet
- URLs werden automatisch dynamisch gesetzt (funktioniert mit GitHub Pages)
- Bilder sollten relative Pfade verwenden (z.B. `public/roots-roleplay.svg`)
- Absolute URLs werden automatisch aus relativen Pfaden generiert

## 🐛 Fehlerbehebung

### Bilder laden nicht

- **Pfad prüfen:** Stimmt der Pfad in der JSON-Datei?
- **Dateiname prüfen:** Groß-/Kleinschreibung beachten!
- **Format prüfen:** PNG-Datei vorhanden?
- **Browser-Cache:** Hard Refresh (Ctrl+Shift+R) ausführen

### YouTube-Video funktioniert nicht

- **Video-ID prüfen:** Nur die ID, nicht die ganze URL
- **Video-Status:** Video muss öffentlich sein
- **YouTube API:** Lädt automatisch beim ersten Video

### Inhalte werden nicht angezeigt

- **JSON-Syntax:** Valides JSON? (Kommas, Klammern prüfen)
- **Browser-Console:** Fehler in der Console prüfen (F12)
- **Cache leeren:** Browser-Cache leeren

## 📞 Support

Bei Fragen oder Problemen:
- Issue auf GitHub erstellen
- Team-Chat (Discord/Slack) nutzen
- Dokumentation nochmals prüfen

## 🔐 Lizenz

Copyright © 2024 Roots Roleplay. Alle Rechte vorbehalten.

Dieses Projekt ist proprietär und nur für interne Nutzung bestimmt.

---

**Letzte Aktualisierung:** 2024
