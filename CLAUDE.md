# CLAUDE.md – Leitfaden für Claude Code (NatureScout)

Diese Datei ist der Einstiegspunkt für KI-Assistenten und neue Mitwirkende. Sie fasst zusammen,
*wie* an diesem Projekt gearbeitet wird. Die **fachliche Wahrheit** (Entitäten, Regeln) steht in
`specs/` – immer dort beginnen, wenn es um Datenmodell oder Geschäftslogik geht.

## Was ist NatureScout?

Webbasierte **Citizen-Science-Anwendung** zur Erfassung und KI-gestützten Analyse von
Naturhabitaten in Südtirol. Nutzer:innen dokumentieren in 5 Phasen (Willkommen → Standort →
Bilder → KI-Analyse → Verifizierung) Naturräume; Expert:innen verifizieren die Ergebnisse;
verifizierte, schützenswerte Habitate erscheinen auf einer öffentlichen Karte.

## Tech-Stack

- **Framework:** Next.js 15 (App Router), React 18, TypeScript (strict, `noUncheckedIndexedAccess`)
- **UI:** Tailwind CSS, Shadcn/UI + Radix, Leaflet (+ leaflet-draw) für Karten
- **Auth:** NextAuth v4 (Credentials: Passwort, 6-stelliger Code, Einladungs-Token), JWT-Session
- **DB:** MongoDB (nativer Treiber + Mongoose), MongoDB Atlas
- **Storage:** Azure Blob Storage (Bilder), Bildverarbeitung mit `sharp`
- **KI:** OpenAI Vision (Habitat-Analyse), PlantNet (Pflanzenbestimmung)
- **E-Mail:** Mailjet (Einladungen, Login-Codes; Webhooks für Zustellstatus)

## Befehle

```bash
npm run dev          # Entwicklungsserver (http://localhost:3000)
npm run build        # Produktions-Build
npm run start        # Produktionsserver
npm run lint         # ESLint (next lint)
npm run test:mongodb # MongoDB-Verbindung testen (scripts/test-mongodb-connection.js)
npm run test:api     # Habitat-API-Performance testen
```

> ⚠️ **Kein Unit-Test-Runner konfiguriert.** Unter `src/__tests__/` liegen Tests in Jest-Syntax,
> aber Jest/Vitest sind nicht in `package.json`. Verifizierung erfolgt aktuell über `lint`,
> `build` und die o. g. Skripte. Vor „erledigt" mindestens `npm run lint` und `npm run build`.

## Projektstruktur (Kurzform)

```
src/
├── app/            # App Router: Seiten + API-Routen (src/app/api/*)
├── components/     # UI-Komponenten (ui = Shadcn, + admin, map, natureScout, …)
├── lib/
│   ├── services/   # Geschäftslogik & DB-Zugriff (Quelle der Entitäts-Schemas!)
│   ├── models/     # Mongoose-Modelle (organization.ts)
│   ├── utils/      # Hilfsfunktionen (z. B. data-validation.ts: Schutzstatus-Mapping)
│   ├── auth.ts     # NextAuth-Konfiguration
│   ├── server-auth.ts # requireAuth/requireAdmin/requireExpert (Berechtigungen)
│   └── config.ts   # serverConfig/publicConfig (Env)
└── types/          # TypeScript-Typen (nature-scout.ts = Kern-Domänentypen)
docs/               # Umfangreiche (deutsche) Dokumentation + Anwenderhandbuch (mkdocs)
specs/              # ← Spezifikationen: Entitäten + Geschäftsregeln (Spec-Driven)
```

## Datenmodell (Entitäten → Specs)

Vollständige Spezifikationen in `specs/entitaeten/`:

| Entität | Collection | Spec |
|---|---|---|
| Habitat (`AnalysisJob`) | `analyseJobs` | `specs/entitaeten/habitat.md` |
| Benutzer (`IUser`) | `users` | `specs/entitaeten/benutzer.md` |
| Einladung (`IInvitation`) | `invitations` | `specs/entitaeten/einladung.md` |
| Organisation (`IOrganization`) | `organizations` | `specs/entitaeten/organisation.md` |
| Habitattyp (`HabitatType`) | `habitatTypes` | `specs/entitaeten/habitattyp.md` |
| Habitatgruppe (`HabitatGroup`) | `habitatGroups` | `specs/entitaeten/habitatgruppe.md` |
| Login-Code (`ILoginCode`) | `loginCodes` | `specs/entitaeten/login-code.md` |
| Analyse-Konfiguration | `habitatAnalysisSchemas`, `prompts` | `specs/entitaeten/analyse-konfiguration.md` |

**Geschäftsregeln** in `specs/regeln/`: Rollen & Rechte, Verifizierungs-Workflow, Schutzstatus
(Ampel), Datenschutz/Consent, KI-Analyse-Pipeline. Glossar: `specs/glossar.md`.

## Arbeitsweise: Spec-Driven

1. **Erst Spec lesen/aktualisieren** (`specs/`), dann Code ändern.
2. **Konsistenz wahren:** Datenmodell-/Regeländerungen in der passenden Spec nachziehen.
3. **Abweichungen ehrlich dokumentieren** im Abschnitt „Offene Punkte / Abweichungen" der Spec.
4. **Quellen verlinken:** Specs nennen die maßgeblichen Quelldateien – beidseitig navigierbar.

## Coding-Konventionen

(Aus `.cursorrules` übernommen – dort steht die ausführliche Fassung.)

- **TypeScript überall**, Interfaces vor Types; **keine Enums** → stattdessen Maps/Union-Types.
- **Funktional & deklarativ**, keine Klassen für UI; `function`-Keyword für reine Funktionen.
- **React Server Components bevorzugen**, `'use client'`/`useEffect`/`setState` minimieren.
- **Benennung:** Verzeichnisse `kebab-case`; Komponenten `PascalCase`; Hilfsfunktionen
  `camelCase`; beschreibende Namen mit Hilfsverben (`isLoading`, `hasError`).
- **Imports:** Alias `@/*` → `src/*`.
- **UI:** Shadcn/Radix + Tailwind, mobile-first, responsiv. Bilder optimieren (WebP, Lazy-Load).
- **Sprache:** Domänenbegriffe/Feldnamen **deutsch** (z. B. `gemeinde`, `schutzstatus`).

## Wichtige Hinweise & Stolpersteine

- ⚠️ **`AnalysisJob`-Typ ist unvollständig:** Das DB-Dokument enthält zusätzlich `verified`,
  `verifiedResult`, `verifiedBy`, `verifiedAt`, `protectionStatus`, `deleted`, `deletedAt`,
  `deletedBy`, `history` und den Status `analyzing`. Details: `specs/entitaeten/habitat.md`.
- ⚠️ **Env-Variablen:** Code nutzt `MONGODB_DATABASE_NAME` und `MONGODB_COLLECTION_NAME`
  (`src/lib/services/db.ts`), nicht `MONGODB_DB_NAME` (so in alter Doku).
- ⚠️ **Auth = NextAuth** (nicht Clerk; ältere Doku ist überholt).
- **E-Mail ist der Identitätsschlüssel:** Lookups stets `email.toLowerCase().trim()`.
- **Öffentlichkeit:** Habitat öffentlich ⇔ `verified === true && protectionStatus ∈ {red, yellow}`.
- **Soft-Delete:** Habitate werden nie hart gelöscht, sondern `deleted: true` markiert.
- **Berechtigungen** immer über `src/lib/server-auth.ts` prüfen (`requireAuth/Admin/Expert`).

## Wichtige Umgebungsvariablen

`MONGODB_URI`, `MONGODB_DATABASE_NAME`, `MONGODB_COLLECTION_NAME`, `NEXTAUTH_SECRET`,
`OPENAI_API_KEY`, `OPENAI_VISION_MODEL`, `PLANTNET_API_KEY`,
`AZURE_STORAGE_CONNECTION_STRING`, `AZURE_STORAGE_CONTAINER_NAME`, `UPLOAD_DIR`,
`NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_MAX_IMAGE_WIDTH/HEIGHT/QUALITY` sowie Mailjet-Variablen.

## Git / Beiträge

- Entwicklungsbranch dieser Sitzung: `claude/german-language-fH4Q8`.
- CI: `.github/workflows/ci-main.yml`. Vor dem Pushen `npm run lint` und `npm run build` grün halten.
- Commit nur auf ausdrücklichen Wunsch; PRs nur, wenn explizit gewünscht.
</content>
