# Richtlinie zur Strukturangleichung von Admin- und öffentlichem Bereich

## Problembeschreibung

Die aktuelle Struktur des Admin-Bereichs und des öffentlichen Bereichs weist erhebliche Unterschiede auf, was die Wartbarkeit und Konsistenz des Codes beeinträchtigt. Insbesondere wurden folgende Probleme identifiziert:

1. **Inkonsistente Komponenten-Platzierung**:
   - Admin-Komponenten sind teilweise in `src/components/admin/` und teilweise in `src/app/admin/`
   - Öffentliche Komponenten sind uneinheitlich auf `src/components/` und `src/app/` verteilt

2. **Unterschiedliche Seitenorganisation**:
   - Admin-Seiten haben ein konsistentes Layout durch `src/app/admin/layout.tsx`
   - Öffentliche Seiten haben keine konsistente Strukturierung

3. **Inkonsistente Komponentennamen**:
   - Im Admin-Bereich: Mischung aus PascalCase (`OrganizationTable.tsx`) und kebab-case (`user-table.tsx`)
   - Im öffentlichen Bereich: Verschiedene Benennungskonventionen

## Allgemeine Prinzipien

Für eine einheitliche Codestruktur sollen folgende Prinzipien angewendet werden:

1. **Klare Trennung von Komponenten und Seiten**:
   - Seiten (`page.tsx`) in `src/app/`-Verzeichnissen
   - Wiederverwendbare Komponenten in `src/components/`-Verzeichnissen

2. **Konsistente Verzeichnisstrukturen**:
   ```
   src/app/[bereich]/
   ├── page.tsx                    # Die Hauptseite
   ├── layout.tsx                  # Layout für den gesamten Bereich (optional)
   └── [unterbereich]/             # Unterseiten
       ├── page.tsx
       └── components/             # Seitenspezifische Komponenten
   
   src/components/[bereich]/       # Wiederverwendbare Komponenten
   ├── index.ts                    # Export aller Komponenten
   └── [KomponentenName].tsx       # Einzelne Komponenten
   ```

3. **Einheitliche Namenskonventionen**:
   - Komponenten: PascalCase (`OrganizationTable.tsx`)
   - Verzeichnisse: kebab-case (`user-management/`)
   - Dateien für Pages: kebab-case (`page.tsx`)

## Spezifische Richtlinien

### Admin-Bereich

1. **Verzeichnisstruktur**:
   ```
   src/app/admin/
   ├── layout.tsx                  # Gemeinsames Layout für den Admin-Bereich
   ├── page.tsx                    # Haupt-Dashboard
   ├── users/                      # Benutzerverzeichnis
   │   ├── page.tsx                # Benutzerübersicht-Seite
   │   └── [userId]/               # Benutzerdetails
   │       └── page.tsx
   ├── organizations/              # Organisationsverzeichnis
   │   ├── page.tsx                # Organisationsübersicht-Seite
   │   └── [orgId]/                # Organisationsdetails
   │       └── page.tsx
   └── config/                     # Konfigurationsbereich
       └── page.tsx                # Konfigurationsseite
   
   src/components/admin/
   ├── UserTable.tsx               # Komponente für Benutzerübersicht
   ├── OrganizationTable.tsx       # Komponente für Organisationsübersicht
   ├── UserForm.tsx                # Benutzerformular-Komponente
   └── config/                     # Konfigurationskomponenten
       ├── HabitatTypesConfig.tsx
       └── PromptConfig.tsx
   ```

2. **Layout**:
   - Gemeinsames Layout mit Adminbereich-Kopfzeile und Navigationsleiste
   - Konsistentes Styling für alle Admin-Seiten
   - Einheitliche Fehlermeldungen und Ladezustände

### Öffentlicher Bereich

1. **Verzeichnisstruktur**:
   ```
   src/app/
   ├── layout.tsx                  # Gemeinsames Layout für die gesamte App
   ├── page.tsx                    # Startseite
   ├── unsere-habitate/            # Öffentliches Habitat-Verzeichnis
   │   ├── page.tsx                # Habitat-Übersicht
   │   └── components/             # Seitenspezifische Komponenten
   │       └── MultiSelectFilter.tsx
   └── habitat/                    # Habitat-Anzeige
       ├── page.tsx                # Habitat-Liste für angemeldete Benutzer
       └── [jobId]/                # Einzelnes Habitat
           └── page.tsx
   
   src/components/
   ├── habitat/                    # Habitat-bezogene Komponenten
   │   ├── HabitatCard.tsx
   │   └── FilterPanel.tsx
   └── public/                     # Öffentliche Komponenten
       ├── HabitatGrid.tsx
       └── FilterBar.tsx
   ```

2. **Layout**:
   - Einheitliches Layout mit konsequentem Design
   - Gemeinsame Header- und Footer-Komponenten
   - Einheitliche Lade- und Fehlerkomponenten

## Implementierungsplan

1. **Phase 1: Komponenten umbenennen**
   - Admin-Komponenten in PascalCase umbenennen (z.B. `user-table.tsx` zu `UserTable.tsx`)
   - Öffentliche Komponenten einheitlich benennen

2. **Phase 2: Verzeichnisstruktur anpassen**
   - Admin-Komponenten in logische Gruppen organisieren
   - Seitenspezifische Komponenten in die entsprechenden `components/`-Unterverzeichnisse verschieben

3. **Phase 3: Layouts vereinheitlichen**
   - Layout-Komponenten für den öffentlichen Bereich erstellen
   - Admin-Layout konsistenter gestalten

4. **Phase 4: Gemeinsame Komponenten extrahieren**
   - Doppelte Funktionalität in wiederverwendbare Komponenten konsolidieren
   - Gemeinsame Hooks und Hilfsfunktionen erstellen

## Vorteile

1. **Bessere Wartbarkeit**: Durch klare Strukturierung wird die Wartung vereinfacht
2. **Effizienzsteigerung**: Weniger doppelter Code durch gemeinsame Komponenten
3. **Einheitliches Nutzererlebnis**: Konsistente Benutzeroberfläche in allen Bereichen
4. **Verbesserte Team-Zusammenarbeit**: Klare Richtlinien vereinfachen die Zusammenarbeit

## Fazit

Die vorgeschlagene Strukturangleichung wird die Codequalität erheblich verbessern und die Wartungskosten reduzieren. Der inkrementelle Ansatz ermöglicht es, die Änderungen schrittweise umzusetzen, ohne den laufenden Betrieb zu beeinträchtigen. 