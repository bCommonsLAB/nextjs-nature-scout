# Regel: Verifizierungs-Workflow

Beschreibt, wie ein KI-analysiertes Habitat durch Expert:innen/Admins fachlich bestätigt
(„verifiziert") und damit ggf. öffentlich wird.

- **Quellen im Code:**
  - `src/app/api/habitat/[auftragsId]/effective-habitat/route.ts` (Verifizieren, `PATCH`)
  - `src/app/api/habitat/[auftragsId]/unverify/route.ts` (Zurücknehmen, `POST`)
  - `src/app/api/habitat/[auftragsId]/route.ts` (Reanalyse, `POST`)

## Ablauf

1. **Ausgangslage:** Habitat mit `status: 'completed'` und KI-`result` (noch `verified` ungesetzt).
2. **Verifizieren** (Experte/Admin) via `PATCH .../effective-habitat` mit `{ effectiveHabitat,
   kommentar }`:
   - Der gewählte `effectiveHabitat` (Habitattyp-Name) wird in `habitatTypes` nachgeschlagen;
     `habitatFamilie` und `schutzstatus` werden von dort übernommen.
   - Es wird gesetzt: `verifiedResult { habitattyp, habitatfamilie, schutzstatus, kommentar }`,
     `verified: true`, `verifiedAt`, `verifiedBy { userId, userName, role }`.
   - `protectionStatus` wird aus `verifiedResult.schutzstatus` abgeleitet (s. `schutzstatus.md`).
   - Ein `history`-Eintrag (Modul „Habitat-Verifizierung") mit `previousResult`/`changes` wird angehängt.
3. **Öffentlich-Werden:** Ist `protectionStatus ∈ {red, yellow}`, ist das Habitat ab jetzt
   öffentlich sichtbar.
4. **Zurücknehmen** (Experte/Admin) via `POST .../unverify`: entfernt `verified`, `verifiedAt`,
   `verifiedBy`, `verifiedResult` (Unset). Das Habitat ist danach wieder nicht-öffentlich.

## Reanalyse (verwandt)

`POST /api/habitat/[auftragsId]` löst eine erneute KI-Analyse aus (optional mit neuen Bildern /
Kommentar). Status durchläuft `analyzing` → `completed`/`failed`; Ergebnis aktualisiert `result`
und schreibt einen `history`-Eintrag. Berechtigt: Eigentümer:in, Experte, Admin.

## Invarianten

- **Effektives Ergebnis:** Nach Verifizierung gilt `verifiedResult` fachlich vor `result`.
- **Nur Experten/Admins** dürfen verifizieren / zurücknehmen (`403` sonst).
- **Nachvollziehbarkeit:** Jede Verifizierung/Reanalyse erzeugt einen `history`-Eintrag mit
  handelnder Person, Modul, vorigem und neuem Ergebnis.
- **Konsistenz:** `protectionStatus` muss immer zur aktuell gültigen (`verifiedResult` bzw.
  `result`) `schutzstatus`-Angabe passen.

## Offene Punkte / Abweichungen

- Es gibt keinen expliziten Zwischenstatus „in Prüfung"; ein Habitat ist entweder verifiziert
  oder nicht. Falls ein Review-Workflow mit mehreren Stufen gewünscht ist, hier spezifizieren.
- `history` ist nicht typisiert (`AnalysisJob` kennt das Feld nicht) – siehe
  `entitaeten/habitat.md`, Abschnitt „Offene Punkte".
</content>
