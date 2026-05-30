# Glossar (Domänenbegriffe)

Fachbegriffe der NatureScout-Domäne. Diese Begriffe werden im Code, in den Specs und in der
Datenbank bewusst **auf Deutsch** geführt (die Domäne ist Südtirol/Naturschutz).

| Begriff | Bedeutung |
|---|---|
| **Habitat** | Erfasster Naturraum. Technisch als `AnalysisJob` in der Collection `analyseJobs` gespeichert. |
| **Erfassung** | Vorgang, bei dem ein:e Nutzer:in ein Habitat über den 5-Phasen-Workflow dokumentiert. |
| **Erfassungsperson** | Name der Person, die das Habitat aufgenommen hat (`metadata.erfassungsperson`). |
| **Standort** | Geografische Verortung des Habitats (Koordinaten, Polygon, Gemeinde, Flurname). |
| **Gemeinde** | Politische Gemeinde in Südtirol, in der das Habitat liegt. |
| **Flurname** | Lokaler Flur-/Ortsname des Standorts. |
| **Kataster** | Katasterdaten der Parzelle (Parzellennummer, Katastralgemeinde, ISTAT-Kodex). |
| **Polygon** | Vom Nutzer auf der Karte gezeichnete Umrissfläche des Habitats (`polygonPoints`). |
| **Habitattyp** | Klassifizierung des Habitats (z. B. Magerwiese, Schilf, Auwald). Siehe `HabitatType`. |
| **Habitatfamilie / Habitatgruppe** | Übergeordnete Gruppierung von Habitattypen (Wälder, Gewässer, Wiesen und Weiden, Sonderbiotope). |
| **Schutzstatus** | Fachliche Schutz-Klassifizierung: *gesetzlich geschützt*, *ökologisch hochwertig*, *ökologisch niederwertig*. |
| **protectionStatus** | Technische Ableitung des Schutzstatus als Ampel: `red`/`yellow`/`green`. Siehe `specs/regeln/schutzstatus.md`. |
| **Analyse** | KI-gestützte Auswertung der Bilder/Metadaten zur Bestimmung von Habitattyp & Schutzstatus. |
| **Analyseergebnis** | Strukturiertes Resultat der KI-Analyse (`AnalyseErgebnis`, gespeichert in `result`). |
| **Verifizierung** | Prüfung & Bestätigung eines Habitats durch Expert:in/Admin; erzeugt `verifiedResult`. |
| **Effektiver Habitat** | Der nach Verifizierung gültige Habitattyp (`verifiedResult` überschreibt `result` fachlich). |
| **Zeigerart (istzeiger)** | Pflanzenart mit besonderer Indikatorfunktion für einen Habitattyp. |
| **PlantNet** | Externer Dienst zur Bestimmung von Pflanzenarten aus Detailbildern. |
| **Erfasser-Sicht / Öffentliche Sicht** | Normale Nutzer:innen sehen nur eigene Habitate; öffentlich sind nur verifizierte Habitate mit `protectionStatus` red/yellow. |
| **Organisation** | Einrichtung/Verein, dem Nutzer:innen zugeordnet sein können (`organizationId`). |
| **Login-Code** | 6-stelliger Einmalcode für passwortlose Anmeldung (15 Min. gültig). |
| **Einladung** | Token-basierte Einladung, die einen Account ohne Passwort aktivierbar macht. |
</content>
</invoke>
