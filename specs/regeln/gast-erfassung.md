# Regel: Gast-Erfassung & Online-Fokus

> **Status:** Konzept/Plan (genehmigt – Entscheidungen siehe unten). Umsetzung in Phasen A→B→C.
> **Kontext:** Feedback aus dem Smartphone-Test (PWA). Die Offline-Erfassung wird zurückgebaut
> (ohne Netz keine Karte → keine echte Erfassung), die Anmelde-Hürde gesenkt: Gäste – oft
> **ältere Personen** oder Einmal-Erfasser:innen – sollen ein Habitat erfassen können, **ohne sich
> vorab anzumelden**, aber mit **Name + E-Mail**, damit Biolog:innen die Herkunft kennen.

Maßgebliche Quellen im Code: `src/middleware.ts` (Auth-Gate), `src/app/api/habitat/draft/route.ts`
(Ownership aus Session), `src/lib/services/login-code-service.ts` (6-stellige Codes + Rate-Limit),
`src/lib/services/analysis-service.ts` (`createDraftJob`/`createAnalysisJob`), `src/lib/server-auth.ts`
(`requireAuth/Expert/Admin`), `src/types/nature-scout.ts` (`NatureScoutData`/`AnalysisJob`).

---

## 1. Ziel

- **Niedrigschwellige Erfassung ohne Login** („Gastmodus"): erfassen, dann Name + E-Mail.
- **Online-Fokus:** Offline-Erfassung entfällt; bei fehlendem Netz ein freundlicher Hinweis.
- **Missbrauchsschutz** vor der (kostenpflichtigen) KI-Analyse, niederschwellig (E-Mail-Code).
- **Wiederfinden & Zuordnung:** Gast findet sein Habitat nach Account-Anlage wieder; Biolog:innen
  können ein Habitat einer Person zuordnen.

## 2. Getroffene Entscheidungen (2026-05-31)

| # | Thema | Entscheidung |
|---|---|---|
| 1 | Identität beim Absenden | **Name + E-Mail Pflicht** |
| 2 | Account-Anlage | **Passwortlose Registrierung über den E-Mail-Code** (Revision 2026-05-31). Nach Code-Eingabe ist die Person registriert **und** angemeldet (kein Passwort). Keine separate Einladung mehr nötig. |
| 3 | KI-Kosten/Abuse | **Identität (Name+E-Mail) vor der KI-Analyse** abfragen |
| 4 | Offline-Code | **Ganz entfernen** (Phase-2-Offline-Capture); Phase 1 (Entwurf/Auto-Save online) & Phase 3 (PWA-Shell) bleiben |
| 5 | E-Mail-Code = Login? | **Ja – passwortlose Registrierung + Anmeldung** (Revision 2026-05-31: „passwortlose Anmeldung ⇒ ist dann auch registriert"). Ersetzt die frühere „nur Human-Check"-Variante. |
| 6 | Bot-Check (Schicht 1) | **Nur E-Mail-Code** (kein Drittanbieter-CAPTCHA) + serverseitiges Rate-Limit |

> **Revision 2026-05-31 — Architektur-Vereinfachung:** Da der E-Mail-Code passwortlos **registriert
> + anmeldet**, entfällt das frühere Gast-Token auf jeder Capture-API. Stattdessen: **anonyme
> Erfassung läuft client-seitig** (Schritte 1–7 ohne Server), der Code **registriert + meldet an**
> (Schritt 8), und ab da läuft **alles über die bestehenden authentifizierten APIs** (Ownership wie
> gehabt aus der Session). Das macht §4/§5 deutlich schlanker (siehe Hinweise dort).

## 3. Gast-Erfassungs-Flow

Schritte wie bisher (`schritte` in `NatureScout.tsx`), aber ohne Login-Pflicht und mit einem
Identitäts-Gate **vor** der KI-Analyse:

0. **Willkommen** (öffentlich erreichbar, ohne Login)
1. Standort finden · 2. Umriss zeichnen · 3. Standortdaten ermitteln (alles **online**, Karte braucht Netz)
4.–7. Bilder (Panorama, Detail, optional 2× Pflanze)
8. **Registrierungs-Gate (nur Gäste, nur einmal):**
   - Name + E-Mail eingeben (Pflicht).
   - „Code anfordern" → 6-stelliger Code per E-Mail (Rate-Limit, s. §5).
   - Code eingeben → **passwortlose Registrierung + Anmeldung**: Konto mit dieser E-Mail wird angelegt
     (falls noch nicht vorhanden) und eine Session gesetzt. **Ab hier ist die Person ein normal
     angemeldeter Nutzer.** Erst jetzt werden die client-seitig erfassten Daten (Schritte 1–7)
     serverseitig angelegt (Entwurf + Bild-Uploads über die bestehenden APIs).
   - Bereits eingeloggte Nutzer:innen überspringen dieses Gate (Identität aus Session; Server-Auto-Save ab Schritt 1).
9. **KI-Analyse** (startet erst nach Registrierung/Identität → bremst anonymen Massen-Missbrauch).
10. **Verifizierung/Absenden** → Habitat `status: 'pending'`, `erfassungsperson`=Name, `email`=E-Mail.
11. **Danke-Screen.** **Keine separate Einladung nötig** – die Person ist bereits (passwortlos)
    registriert und findet ihr Habitat sofort unter „Meine Habitate". Hinweis: künftige Anmeldung per E-Mail-Code.

## 4. Identität, Ownership & Datenmodell

- **Heute:** `POST/PATCH /api/habitat/draft` setzen `email`/`erfassungsperson`/`organization*`
  serverseitig aus der **Session** und entfernen Client-Werte (kein Hijack).
- **Neu (Gäste, Revision 2026-05-31):** Während der anonymen Erfassung (Schritte 1–7) wird **nichts**
  serverseitig angelegt – Metadaten + Bild-Blobs liegen client-seitig. Mit der **passwortlosen
  Registrierung** (Schritt 8) ist die Person angemeldet; Entwurf-Anlage, Bild-Upload, Analyse und
  Absenden laufen danach über die **bestehenden authentifizierten APIs**, Ownership wie gehabt aus der
  Session. `organizationId`/`organizationName` bleiben bei Gast-Registrierungen leer.
- **Kein Gast-Token / kein `requireCaptureIdentity()` nötig:** Die Capture-APIs bleiben
  auth-pflichtig (`requireAuth`), weil Gäste sie erst **nach** der Registrierung aufrufen – das spart
  die ursprünglich geplante Token-Durchreichung auf jeder API.
- **Eigentums-/Statusinvarianten unverändert:** Entwürfe `status: 'draft'`, nach Analyse `pending`;
  öffentlich erst nach Verifizierung (`verified && protectionStatus ∈ {red,yellow}`).
- **Wiederfinden „gratis":** Lookups laufen über `email.toLowerCase().trim()`. Legt der Gast später
  einen Account mit derselben E-Mail an, erscheinen seine `pending`-Habitate automatisch in
  „Meine Habitate" – **kein** zusätzlicher Verknüpfungscode nötig.
- **Biologen-Zuordnung:** Experten/Admins können `erfassungsperson` und `email` eines Habitats
  nachträglich ändern (Tippfehler/Falschangabe). Änderung wird in `history` protokolliert.

## 5. Human-Check & Anti-Abuse (ohne Drittanbieter)

- **Eigene Gast-Endpunkte** (kein existierender User nötig – im Unterschied zu `/api/auth/request-code`,
  das einen vorhandenen User verlangt):
  - `POST /api/guest/request-code` `{ email, name }` → `LoginCodeService.checkRateLimit` (max. 3/5 Min/E-Mail)
    **+ Rate-Limit pro IP** (gegen E-Mail-Bombing über viele Adressen) → `createLoginCode` + `sendLoginCodeEmail`.
- **Registrierung + Anmeldung statt Gast-Token (Revision 2026-05-31):** Code-Eingabe läuft über einen
  NextAuth-Credentials-Pfad **analog zum bestehenden `loginType: 'invite'`** (der Nutzer bei Bedarf
  anlegt): `validateCode` → `markCodeAsUsed` → **User anlegen, falls nicht vorhanden** (passwortlos,
  Rolle `user`, Name) → **NextAuth-Session** setzen. Danach ist die Person normal angemeldet; die
  Capture-APIs bleiben unverändert `requireAuth`.
- **Kein Token, kein neues Secret nötig** (NextAuth-Session deckt die Autorisierung ab).
- **Bewusst NICHT:** kein Cloudflare/hCaptcha (Entscheidung #6). Managed-CAPTCHA bei Spam nachrüstbar.

## 6. Online-Fokus statt Offline (Phase B)

- **Entfernen:** `src/lib/offline/{db,sync,images,storage,capabilities,use-capabilities,use-sync,types}.ts`
  (IndexedDB-Sessions, Sync-Engine, Capability-Matrix, Offline-Bild-Ablage), die Offline-Zweige in
  `NatureScout.tsx`/`GetImage.tsx`/`SingleImageUpload.tsx` sowie die Offline-UI in
  `app/habitat/page.tsx` und `OfflineDataManager` (Profil).
- **Behalten:** Phase 1 (Entwurf/`status:'draft'`, Auto-Save online, Resume über `?editJobId=`,
  ehrliche Speicher-Bestätigung) und Phase 3 (Manifest + Service Worker = Installierbarkeit/Schnellstart).
- **Neu „kein Netz":** Statt halber Erfassung ein freundlicher Screen „Zum Erfassen brauchst du
  Internet" + Tipp „Mach die Fotos jetzt mit der Handy-Kamera und lade sie später aus der **Galerie**
  hoch". Erkennung über einen schlanken Online-Check (`navigator.onLine` + `/api/health`; der bisherige
  `checkOnline` kann als einzelne Hilfsfunktion erhalten bleiben).
- **Spec-Pflege:** `offline-erfassung-und-sync.md` und `…-umsetzungsplan.md` als **zurückgebaut**
  markieren (Abschnitt „Offene Punkte / Abweichungen"), nicht löschen (Historie).

## 7. Kamera/Galerie (Phase A, Quick Win)

- **Bug:** `GetImage.tsx` Z. ~876 setzt `capture="environment"` → mobile Browser öffnen **immer** die
  Kamera, Galerie-Auswahl ist unterdrückt.
- **Fix:** zwei Aktionen statt einer – **„📷 Kamera"** (verstecktes Input mit `capture`) und
  **„🖼️ Galerie"** (verstecktes Input **ohne** `capture`). Desktop unverändert. Ermöglicht direkt den
  „Foto jetzt, Upload später"-Ablauf aus §6.

## 8. Betroffene Dateien (Überblick)

- **Auth/Gate:** `src/middleware.ts` (`/naturescout` öffentlich); `src/lib/auth.ts` – NextAuth-Credentials
  um einen **Gast-Code-Pfad** erweitern (analog `loginType: 'invite'`: User passwortlos anlegen + Session).
  Kein `guest-auth.ts`/`requireCaptureIdentity()`.
- **Gast-API:** `src/app/api/guest/request-code/route.ts` (Code an beliebige E-Mail + Rate-Limit). Die
  Verifizierung läuft über `signIn('credentials', { loginType: 'guest-code', … })`.
- **Capture-APIs:** **bleiben `requireAuth`** (keine Anpassung) – Gäste rufen sie erst nach der Anmeldung.
- **Wizard:** `NatureScout.tsx` – anonyme Erfassung (Schritte 1–7) **client-seitig**, danach
  `GuestRegistrationGate.tsx` vor der Analyse (nur Gäste); nach Anmeldung Entwurf + Bilder serverseitig
  anlegen. `GetImage.tsx`/`SingleImageUpload.tsx`: Kamera/Galerie + Offline-Ausbau.
- **Biologen-Zuordnung:** Habitat-Detail/Admin-UI um Felder `erfassungsperson`/`email` editierbar (`history`).
- **Entfernen:** `src/lib/offline/*`, `OfflineDataManager`, Offline-Abschnitte in `app/habitat/page.tsx`.
- **Entfällt:** separate Post-Submit-Einladung (Person ist bereits registriert).

## 9. Umsetzungsplan (Phasen)

**Phase A – Quick Wins (sofort am Handy nutzbar)**
- A1: Kamera/Galerie – zwei Buttons (§7).
- A2: „Kein Netz"-Hinweis-Screen + Foto-Tipp (§6, nur UI; Offline-Logik wird in B entfernt).
- DoD je Schritt: `tsc` ≤ Baseline, `lint` unverändert, `build` grün; je ein Commit.

**Phase B – Offline-Erfassung entfernen (Online-Fokus)**
- `src/lib/offline/*` ausbauen, Offline-Zweige & -UI entfernen, Phase-1/Phase-3 erhalten.
- Online-Check auf eine Hilfsfunktion reduzieren; `blockieren`-Strategie → Hinweis-Screen aus A2.
- Specs nachziehen.

**Phase C – Gastmodus**
- C1: NextAuth-Credentials um Gast-Code-Pfad erweitern (`src/lib/auth.ts`): `validateCode` → User
  passwortlos anlegen (falls neu) → Session. Analog zum bestehenden `loginType: 'invite'`.
- C2: `POST /api/guest/request-code` (Rate-Limit E-Mail **und** IP).
- C3: `middleware.ts`: `/naturescout` öffentlich. Capture-APIs bleiben `requireAuth` (keine Änderung).
- C4: Wizard – anonyme Erfassung Schritte 1–7 **client-seitig** halten; `GuestRegistrationGate` vor der
  Analyse (nur Gäste); nach Anmeldung Entwurf + Bild-Uploads serverseitig ausführen, dann Analyse/Submit.
- C5: Biologen-Zuordnung (`erfassungsperson`/`email` editierbar, `history`).

## 10. Offene Punkte / Abweichungen

- **IP-Rate-Limit:** Mechanismus (In-Memory vs. DB/Redis) noch zu wählen; In-Memory genügt anfangs.
- **Anonyme Erfassung client-seitig:** Schritte 1–7 liegen vor der Registrierung nur im Browser →
  Reload-Risiko (Datenverlust). Optional in `sessionStorage` zwischenspeichern; bewusst **ohne**
  IndexedDB/Offline-Sync (wird entfernt). Eingeloggte Nutzer:innen haben weiterhin Server-Auto-Save.
- **Org-Zuordnung von Gast-Habitaten:** vorerst ohne Organisation; ggf. System-„Gäste"-Org später.
- **DSGVO/Consent:** Gast gibt Name+E-Mail aktiv an; Consent-Text beim Absenden anpassen
  (vgl. `datenschutz-und-consent.md`).
- **Managed-CAPTCHA** als optionale Schicht 1 nachrüstbar, falls Spam auftritt.

## 11. Logbuch (je Schritt ausfüllen)

| Schritt | Datum | Commit | Notizen / Abweichungen |
|---|---|---|---|
| (Konzept) | 2026-05-31 | _(dieser Commit)_ | Spec/Plan erstellt; Produktentscheidungen #1–#6 festgehalten. |
