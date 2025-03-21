# Testfälle für Nature Scout

Die Testfälle werden in diesem Verzeichnis als JSON-Dateien gespeichert.
Jede Kategorie hat ihr eigenes Unterverzeichnis.

## Verzeichnisstruktur

```
public/test-cases/
  ├── grasland/
  │   ├── test1.json
  │   └── test2.json
  ├── wald/
  │   ├── test1.json
  │   └── test2.json
  └── README.md
```

## Format der Testfälle

Jeder Testfall ist eine JSON-Datei mit folgender Struktur:

```json
{
  "id": "grasland-test1",
  "imageUrls": [
    "/test-images/grasland/beispiel1/bild1.jpg",
    "/test-images/grasland/beispiel1/bild2.jpg"
  ],
  "plants": [
    "Arrhenatherum elatius (Glatthafer)",
    "Trifolium pratense (Rot-Klee)"
  ],
  "expectedHabitat": "Fettwiese",
  "category": "grasland",
  "subCategory": "fettwiese",
  "example": "Beispiel 1",
  "description": "Fettwiese - Beispiel 1"
}
```

## Wichtig

1. Der `expectedHabitat` muss exakt einem der folgenden Habitattypen entsprechen:
   - Verlandungsbereich
   - Schilf
   - Röhricht
   - Großsegge
   - Moor
   - Auwald
   - Sumpfwald
   - Bruchwald
   - Quellbereich
   - Naturnaher Bachlauf
   - Wassergraben
   - Trockenrasen
   - Felsensteppe
   - Magerwiese
   - Magerweide
   - Fettwiese
   - Fettweide
   - Kunstrasen
   - Parkanlage
   - Ruderalfläche

2. Die `imageUrls` müssen auf existierende Bilder im `/public/test-images` Verzeichnis verweisen.

3. Die `plants` Liste enthält die bereits identifizierten Pflanzenarten im Format "Wissenschaftlicher Name (Deutscher Name)". 