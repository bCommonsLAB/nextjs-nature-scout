# Export: Ein einziges PDF oder Word (DOCX) aus dem Handbuch

## Ausgangslage (kurz)

- Das Online-Handbuch wird mit **MkDocs** aus `docs/anwenderhandbuch/*.md` gebaut.
- Die Kapitelreihenfolge ist in `mkdocs.yml` unter `nav:` definiert.
- Bilder liegen relativ unter `docs/anwenderhandbuch/images/…` und werden im Export korrekt eingebettet, wenn der Export-Toolchain der **Resource-Pfad** bekannt ist.

Wichtig: Ob PDF/Word “schön” aussieht, hängt stark von der **Export-Methode** und den lokal installierten Tools ab. Ohne lokale Tests kann ich nur die Mechanik liefern; das Layout muss ggf. iterativ angepasst werden.

## Drei praktikable Varianten

### Variante A (empfohlen): Pandoc → DOCX + PDF

**Vorteile**
- DOCX ist “nativ” für Word/LibreOffice (inkl. eingebetteter Bilder).
- PDF kann aus denselben Quellen entstehen.
- Wiederholbar per Script (CI-fähig).

**Nachteile / Voraussetzungen**
- Für DOCX braucht es “nur” `pandoc`.
- Für PDF braucht es zusätzlich eine PDF-Engine (meist **LaTeX** wie MiKTeX/TeX Live), sonst schlägt der PDF-Export fehl.

**Repo-Umsetzung**
- Script `scripts/export-handbuch.ps1` erzeugt `dist/handbuch/NatureScout-Handbuch.docx` und optional `…pdf`.

### Variante B: MkDocs → HTML → “Print to PDF”

**Vorteile**
- Sehr schnell, kaum Tooling.
- Layout entspricht eher der Web-Ansicht.

**Nachteile**
- Weniger reproduzierbar (Browser-abhängig).
- Word-Export ist umständlich (HTML → DOCX ist meist schlechter als Pandoc).

**Ablauf**
- `mkdocs build …` (habt ihr schon) → `public/handbuch/`
- Im Browser öffnen → Drucken → “Als PDF speichern”.

### Variante C: “Pandoc via MkDocs-HTML”

**Vorteile**
- Kann Web-Design/Struktur besser übernehmen als reiner Markdown-Export.

**Nachteile**
- Aufwendiger (HTML zusammenführen, CSS, Print-Styles).
- Mehr Fehlerquellen (interne Links, Pfade, Assets).

## Entscheidung (für NatureScout sinnvoll)

Für euren Use-Case (ein einziges **Word** oder **PDF** zum Versenden/Archivieren) ist **Variante A** am robustesten: ein klarer Script-Entry-Point, definierte Reihenfolge, eingebettete Bilder.


