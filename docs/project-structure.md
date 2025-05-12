# Projektstruktur Dokumentation

## Übersicht

NatureScout ist eine Next.js-Anwendung zur Erfassung und Analyse von Habitaten. Die Anwendung besteht aus folgenden Hauptkomponenten:

1. **Öffentlicher Bereich**: Landingpage, Habitat-Browser
2. **Authentifizierungsbereich**: Anmeldung und Registrierung
3. **Hauptanwendung**: NatureScout-Tool zum Erfassen von Habitaten
4. **Admin-Bereich**: Verwaltung von Nutzern, Organisationen und Konfiguration

## Verzeichnisstruktur

```
src/
├── app/                      # Enthält Routen, API-Endpunkte und Seitenkomponenten
│   ├── admin/                # Admin-Bereich (geschützt)
│   ├── anmelden/             # Anmeldeseiten
│   ├── api/                  # API-Routen
│   ├── habitat/              # Habitat-Detailseiten
│   ├── naturescout/          # Hauptanwendung für die Erfassung
│   ├── profile/              # Nutzerprofil
│   ├── registrieren/         # Registrierungsseiten
│   └── unsere-habitate/      # Öffentlicher Habitat-Browser
├── components/               # Wiederverwendbare Komponenten
│   ├── admin/                # Admin-Komponenten
│   ├── auth/                 # Authentifizierungskomponenten
│   ├── dashboard/            # Dashboard-Komponenten
│   ├── habitat/              # Habitat-bezogene Komponenten
│   ├── landing/              # (empfohlen) Landing-Page-Komponenten
│   ├── layout/               # Layout-Komponenten (Header, Footer, Navbar)
│   ├── map/                  # Kartenkomponenten
│   ├── nature-scout/         # NatureScout-Komponenten
│   └── ui/                   # UI-Basiskomponenten (Shadcn/UI)
├── context/                  # React Context Provider
├── hooks/                    # Wiederverwendbare Hooks
├── lib/                      # Hilfsfunktionen und Services
│   ├── models/               # Datenmodelle und Schemas
│   ├── services/             # Backend-Services
│   └── utils/                # Utility-Funktionen
├── styles/                   # Globale Stile
└── types/                    # TypeScript-Typdefinitionen
```

## Hauptkomponenten

### Landingpage

Die Landingpage ist der öffentliche Einstiegspunkt für die Anwendung und stellt die Hauptfunktionen vor.

**Hauptdateien:**
- `src/components/landing/LandingPage.tsx`
- `src/components/landing/FeatureCard.tsx`
- `src/components/landing/ProcessStep.tsx`
- `src/components/landing/HabitatCard.tsx`

### Authentifizierung

Die Authentifizierung wird über Clerk abgewickelt und umfasst Anmeldung, Registrierung und Nutzerprofil.

**Hauptdateien:**
- `src/app/anmelden/[[...sign-in]]/page.tsx`
- `src/app/registrieren/page.tsx`
- `src/components/auth/`

### Hauptanwendung: NatureScout

Das Kernstück der Anwendung ist das NatureScout-Tool, mit dem Benutzer Habitate erfassen und analysieren können.

**Hauptdateien:**
- `src/app/naturescout/page.tsx`
- `src/components/nature-scout/ClientNatureScout.tsx`
- `src/components/nature-scout/LocationDetermination.tsx`
- `src/components/nature-scout/habitat-analysis.tsx`

### Kartenintegration

Die Kartenkomponente ist ein zentraler Teil der Anwendung und ermöglicht die Auswahl von Standorten und die Zeichnung von Habitatpolygonen.

**Hauptdateien:**
- `src/components/map/MapNoSSR.tsx`
- `src/components/map/maps.tsx`

### Admin-Bereich

Der Admin-Bereich bietet Verwaltungsfunktionen für Administratoren.

**Hauptdateien:**
- `src/app/admin/`
- `src/components/admin/ConfigurationDashboard.tsx`
- `src/components/admin/organization-table.tsx`
- `src/components/admin/user-table.tsx`

### API-Routen

Die API-Routen bilden das Backend der Anwendung und stellen Daten und Funktionen für die Frontend-Komponenten bereit.

**Hauptdateien:**
- `src/app/api/habitat/`
- `src/app/api/analyze/`
- `src/app/api/users/`
- `src/app/api/organizations/`

## Datenfluss

1. **Habitat-Erfassung**:
   - Benutzer gibt Standortdaten ein
   - Benutzer lädt Bilder hoch
   - KI analysiert die Bilder und erstellt einen Habitatvorschlag
   - Benutzer bestätigt oder modifiziert den Vorschlag
   - Habitat wird in der Datenbank gespeichert

2. **Habitat-Anzeige**:
   - Habitate werden aus der Datenbank geladen
   - Filterung und Sortierung nach verschiedenen Kriterien
   - Detailansicht mit allen erfassten Daten

3. **Admin-Funktionen**:
   - Verwaltung von Nutzern und deren Rechten
   - Konfiguration von Habitat-Typen und Analyseoptionen
   - Verwaltung von Organisationen

## Technologien

- **Framework**: Next.js mit App Router
- **UI-Bibliothek**: React mit Shadcn UI und Tailwind CSS
- **Authentifizierung**: Clerk
- **Karten**: Leaflet
- **Bildanalyse**: OpenAI API
- **Datenbank**: MongoDB mit Mongoose
- **Speicher**: Azure Blob Storage für Bilder

## Codierungsrichtlinien

Um die Konsistenz im Projekt zu wahren, sollten folgende Richtlinien eingehalten werden:

1. **Komponenten**: PascalCase (z.B. `MapComponent.tsx`)
2. **Verzeichnisse**: kebab-case (z.B. `map-components/`)
3. **Hilfsfunktionen**: camelCase (z.B. `calculateArea.ts`)
4. **Importe**: Absolute Pfade mit Alias verwenden (z.B. `@/components/...`)
5. **Komponenten-Struktur**:
   - Exportierte Komponente
   - Unterkomponenten
   - Hilfsfunktionen
   - Statischer Inhalt
   - TypeScript-Typen

## Bekannte technische Schulden

1. **Große Komponenten**:
   - `MapNoSSR.tsx` sollte in kleinere Module aufgeteilt werden
   - `LandingPage.tsx` sollte in kleinere Module aufgeteilt werden

2. **Inkonsistente Namenskonventionen**:
   - Einige Komponenten verwenden kebab-case statt PascalCase
   - Einige Verzeichnisse verwenden PascalCase statt kebab-case

3. **Debug-Code**:
   - Debug-API-Endpunkte sollten in der Produktion entfernt werden
   - Debug-Logger sollten hinter Feature-Flags versteckt werden 