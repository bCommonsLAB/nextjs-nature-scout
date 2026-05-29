# NatureScout – Spezifikationen (Specs-Driven Development)

Dieses Verzeichnis ist die **fachliche Single Source of Truth** für NatureScout. Die Specs
beschreiben, *was* die Anwendung tun soll und *welche Regeln* gelten – unabhängig von der
konkreten Implementierung. Der Code soll den Specs folgen, nicht umgekehrt.

> Für KI-Assistenten (Claude Code) und neue Mitwirkende ist `../CLAUDE.md` der Einstiegspunkt.
> Diese Specs werden von dort referenziert.

## Aufbau

```
specs/
├── README.md                  # Dieses Dokument: Arbeitsweise & Konventionen
├── glossar.md                 # Domänenbegriffe (deutsch)
├── _TEMPLATE.md               # Vorlage für neue Entitäts-Specs
├── entitaeten/                # Eine Spec je Datenentität (das "Was")
│   ├── habitat.md             # AnalysisJob (Kern-Entität)
│   ├── benutzer.md            # User
│   ├── einladung.md           # Invitation
│   ├── organisation.md        # Organization
│   ├── habitattyp.md          # HabitatType
│   ├── habitatgruppe.md       # HabitatGroup
│   ├── login-code.md          # LoginCode
│   └── analyse-konfiguration.md  # AnalysisSchema + Prompt
└── regeln/                    # Querschnittliche Geschäftsregeln (das "Wie/Warum")
    ├── rollen-und-rechte.md   # Rollen, Berechtigungen (RBAC)
    ├── verifizierungs-workflow.md
    ├── schutzstatus.md        # Schutzstatus ↔ protectionStatus (Ampel)
    ├── datenschutz-und-consent.md
    └── analyse-pipeline.md    # Ablauf der KI-Analyse
```

## Arbeitsweise (Spec-Driven)

1. **Spec zuerst.** Neue Features/Felder/Regeln werden zuerst hier beschrieben oder geändert.
2. **Dann Implementierung.** Code, Typen und DB-Schema werden an die Spec angeglichen.
3. **Abweichungen dokumentieren.** Wo Code und Spec (noch) auseinanderlaufen, wird das im
   Abschnitt **„Offene Punkte / Abweichungen"** der jeweiligen Spec festgehalten – ehrlich,
   damit der Ist-Zustand sichtbar bleibt.
4. **Quelle verlinken.** Jede Spec nennt die maßgeblichen Quelldateien (`Quellen im Code`),
   damit man von Spec → Code und zurück navigieren kann.

## Konventionen für Specs

- **Sprache:** Deutsch. Fachbegriffe und Feldnamen wie im Code/DB (deutsch, z. B. `schutzstatus`).
- **Format:** Markdown, eine Datei je Entität bzw. Regel, Vorlage siehe `_TEMPLATE.md`.
- **Feldtabellen:** Pro Feld `Name | Typ | Pflicht | Beschreibung | Validierung/Invariante`.
- **Status der Felder:** `gespeichert` (in DB), `abgeleitet` (berechnet), `nur Laufzeit`.
- **Diskrepanzen markieren:** Mit ⚠️, wenn der TypeScript-Typ / die Doku vom Ist-Zustand abweicht.

## Wichtige bekannte Diskrepanzen (Stand: Erstellung)

Diese sind in den jeweiligen Specs detailliert; hier als Überblick:

- ✅ **`AnalysisJob`-Interface vollständig (erledigt):** Der TypeScript-Typ in
  `src/types/nature-scout.ts` bildet inzwischen alle persistierten Felder ab (`verified`,
  `verifiedResult`, `verifiedBy`, `verifiedAt`, `protectionStatus`, `deleted`, `deletedAt`,
  `deletedBy`, `history`, Status `analyzing`). Siehe `entitaeten/habitat.md`.
- ⚠️ **Env-Variablen-Namen:** Der Code (`src/lib/services/db.ts`) nutzt `MONGODB_DATABASE_NAME`
  und `MONGODB_COLLECTION_NAME`; ältere Doku (`docs/0-uebersicht.md`) nennt `MONGODB_DB_NAME`.
- ⚠️ **Auth-System:** Aktiv ist **NextAuth** (`next-auth`), nicht Clerk – ältere Doku
  (`docs/project-structure.md`) erwähnt noch Clerk.
- ⚠️ **Kein Test-Runner konfiguriert:** Es existieren Testdateien unter `src/__tests__/`, aber
  kein Jest/Vitest in `package.json`.
</content>
