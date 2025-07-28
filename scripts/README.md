# Docker Testing Scripts

Diese Skripte helfen beim lokalen Testen des Docker-Builds für NatureScout.

## Voraussetzungen

- Docker Desktop installiert und gestartet
- Mindestens 4GB freier RAM für den Build
- Internetverbindung für das Herunterladen der Base-Images

## Schnellstart

### Windows
```cmd
# Im Projektverzeichnis ausführen:
scripts\test-docker.bat
```

### Linux/macOS
```bash
# Im Projektverzeichnis ausführen:
chmod +x scripts/test-docker.sh
./scripts/test-docker.sh
```

## Was passiert beim Test?

1. **Docker-Verfügbarkeit prüfen**
2. **Docker-Build starten** mit allen notwendigen Build-Args
3. **Container starten** mit Test-Umgebungsvariablen
4. **Anwendung testen** unter http://localhost:3000

## Build-Argumente

Das Skript verwendet Dummy-Werte für alle Umgebungsvariablen:

- **NextAuth.js**: Test-Secrets
- **Datenbank**: Lokale MongoDB-Instanz
- **APIs**: Test-Keys (funktionieren nicht für echte API-Calls)
- **Storage**: Test-Connection-Strings

## Nützliche Befehle

### Container verwalten
```bash
# Container-Logs anzeigen
docker logs naturescout-test

# Container stoppen
docker stop naturescout-test

# Container entfernen
docker rm naturescout-test

# Container neu starten
docker restart naturescout-test
```

### Image verwalten
```bash
# Alle Images anzeigen
docker images | grep naturescout

# Image entfernen
docker rmi naturescout:local

# Image-Details anzeigen
docker inspect naturescout:local
```

### Troubleshooting

#### Build schlägt fehl
- Prüfen Sie, ob Docker Desktop läuft
- Stellen Sie sicher, dass genügend Speicher verfügbar ist
- Prüfen Sie die Internetverbindung

#### Container startet nicht
```bash
# Container-Logs anzeigen
docker logs naturescout-test

# Container im interaktiven Modus starten
docker run -it --rm naturescout:local /bin/sh
```

#### Port bereits belegt
```bash
# Prüfen, was auf Port 3000 läuft
netstat -ano | findstr :3000

# Anderen Port verwenden
docker run -p 3001:3000 naturescout:local
```

## Cleanup

Nach dem Test können Sie alle Test-Ressourcen entfernen:

```bash
# Container stoppen und entfernen
docker stop naturescout-test
docker rm naturescout-test

# Test-Image entfernen
docker rmi naturescout:local

# Alle ungenutzten Images entfernen
docker image prune -f
``` 