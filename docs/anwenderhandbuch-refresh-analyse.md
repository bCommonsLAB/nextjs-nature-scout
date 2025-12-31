# Analyse: Refresh des NatureScout-Anwenderhandbuchs (Ist-Stand)

Stand: 2025-12-31

## Ausgangslage (Quellen im Repo)

- `[docs/NatureScout Anwenderhandbuch  - v0.9.txt](docs/NatureScout Anwenderhandbuch  - v0.9.txt)`
  - Inhaltlich anwendernah, aber **Kodierung/Zeichen** teils beschädigt (Umlaute).
  - Struktur ist grundsätzlich gut (Rollen, 5 Schritte, Probleme), wirkt aber stellenweise wie Rohfassung
    (z.B. doppelte Nummerierung, uneinheitliche Groß-/Kleinschreibung, kleine Tippfehler).
- `[docs/Anwenderhandbuch.md](docs/Anwenderhandbuch.md)`
  - Inhaltlich sehr ähnlich, **bereits in Markdown** und besser lesbar als die TXT-Version.
  - Enthält viele gute Abschnitte (Login, 5‑Schritte‑Workflow, Rollen, Troubleshooting),
    aber noch **ohne eigenständige Kapitel-Dateien** und **ohne Bildkonzept**.
- `[docs/0-uebersicht.md](docs/0-uebersicht.md)` und `[docs/1-willkommen.md](docs/1-willkommen.md)` etc.
  - Das ist überwiegend **technische Entwickler-Dokumentation** (Tech-Stack, Komponenten, Code-Snippets).
  - Für die Zielgruppe (ältere, naturwissenschaftliche Personen) ist das zu technisch und zu lang.

## Zielgruppe & Tonalität (Anforderung)

- Zielgruppe: eher ältere Nutzer*innen, naturwissenschaftlicher Hintergrund.
- Daraus folgt: **kurze Sätze**, **wenig Fachjargon aus IT**, klare Schrittfolgen, viele visuelle Hinweise.
- Wichtig: UI-Begriffe **exakt** wie in der Anwendung (z.B. „Weiter“, „Speichern“), damit es eindeutig ist.

## Größte Lücken / Risiken

- **Keine verlässliche Screenshot-Landkarte**: Es fehlt eine Liste, welche Screenshots in welcher Reihenfolge
  gebraucht werden (Mobil vs Desktop).
- **Fehlende „Schnellstart“-Seite**: Viele Nutzer*innen wollen sofort wissen: „Wie mache ich die Erfassung?“
- **Zu viel Technik in bestehender Doku**: Die bestehenden `docs/1-...` Seiten sind für Devs geschrieben.
- **PDF-Export** ist noch nicht reproduzierbar festgelegt (Pandoc vs Browser-Print).

## Entscheidung / Vorgehen

- Wir erstellen eine **neue Anwender-Doku als Single-Source** in `docs/anwenderhandbuch/` (Markdown).
  - Vorteil: kurze Kapitel, gut pflegbar, gut verlinkbar.
  - Die technische Doku unter `docs/0-uebersicht.md` etc. bleibt bestehen (für Entwickler*innen).
- Dazu kommt eine **Screenshot-Checkliste** (damit Bilder systematisch und konsistent entstehen).
- Danach ein **wiederholbarer PDF-Build** aus derselben Quelle (mindestens als Prototyp),
  plus kurze Anleitung für Windows.


