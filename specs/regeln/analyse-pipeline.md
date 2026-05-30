# Regel: KI-Analyse-Pipeline

Beschreibt, wie aus Bildern + Metadaten ein strukturiertes `AnalyseErgebnis` entsteht.

- **Quellen im Code:**
  - `src/lib/services/openai-service.ts` (`analyzeImageStructured`, `performHabitatAnalysis`)
  - `src/lib/services/analysis-config-service.ts` (`getAnalysisSchema`, `getPrompt`)
  - `src/lib/services/habitat-service.ts` (`getHabitatTypeDescription`)
  - `src/app/api/analyze/start|status|plants/route.ts`
  - `src/lib/config.ts` (`serverConfig.OPENAI_VISION_MODEL`, API-Key)

## Ablauf

1. **Pflanzenbestimmung (optional, vorgelagert):** Detailbilder werden über PlantNet bestimmt
   (`POST /api/analyze/plants`). Ergebnisse landen in `Bild.plantnetResult` und fließen als
   Artenliste in die Habitat-Analyse ein.
2. **Analyse starten:** `POST /api/analyze/start` legt/aktualisiert einen `AnalysisJob`
   (`status: 'pending'`) und stößt `analyzeImageStructured(metadata)` an.
3. **Prompt-/Schema-Aufbau:**
   - Lädt aktives Schema (`getAnalysisSchema('habitat-analysis')`) und Prompt
     (`getPrompt('habitat-analysis')`).
   - Bindet die Habitattypen-Beschreibung (`getHabitatTypeDescription()`) als kontrollierte
     Klassifizierungsliste ein.
   - Baut ein Zod-Schema für **strukturierte Ausgabe** (`zodResponseFormat(...)`).
4. **Vision-Aufruf:** OpenAI-Vision-Modell (`serverConfig.OPENAI_VISION_MODEL`) erhält Bilder
   (als Base64), System-Instruktion und Analyse-Frage; liefert strukturiertes JSON.
5. **Ergebnis speichern:** Bei Erfolg `status: 'completed'`, `result = AnalyseErgebnis`,
   `llmInfo` (Modellnamen, System-Instruktion, Schema-Fragen). Bei Fehler `status: 'failed'`,
   `error` gesetzt.
6. **Statusabfrage:** Das Frontend pollt `GET /api/analyze/status`.

## Invarianten & Regeln

- **Konfiguration aus DB, nicht hartkodiert:** Schema und Prompt kommen aus den Collections
  `habitatAnalysisSchemas`/`prompts` (versioniert) – Änderungen ohne Deployment möglich.
- **Kontrollierte Klassifizierung:** Der Habitattyp wird gegen den `habitatTypes`-Katalog
  klassifiziert; außerhalb des Katalogs ⇒ `sonstiges`.
- **Schutzstatus:** Wird vom Modell gemäß Schema-Logik vergeben; die Ampel-Ableitung erfolgt
  spätestens bei der Verifizierung (s. `schutzstatus.md`).
- **Nachvollziehbarkeit:** `llmInfo` dokumentiert verwendete Modelle und Prompt/Schema je Lauf.
- **Provider:** Integration erfolgt über das OpenAI-SDK (`OPENAI_VISION_MODEL`,
  `OPENAI_API_KEY`). Pflanzen-Erkennung ist separat (PlantNet, `modelPflanzenErkennung: "PLANTNET"`).

## Konfiguration (Env)

| Variable | Zweck |
|---|---|
| `OPENAI_API_KEY` | Pflicht (Server validiert beim Start) |
| `OPENAI_VISION_MODEL` | Modell für die Habitat-Bildanalyse |
| `OPENAI_CHAT_MODEL`, `OPENAI_TRANSCRIPTION_MODEL` | weitere Modelle (falls genutzt) |
| `PLANTNET_API_KEY` | Pflanzenbestimmung |

## Offene Punkte / Abweichungen

- Robustheit gegen unvollständige Modell-Antworten (Schema-Validierungsfehler) und Retry-Strategie
  sind nicht formal spezifiziert.
- ⚠️ Falls hier perspektivisch **Claude** (Anthropic) statt/zusätzlich zu OpenAI genutzt werden
  soll: Modellwahl, Prompt-Caching und strukturierte Ausgabe entsprechend spezifizieren.
</content>
