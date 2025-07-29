# Docker Deployment für NatureScout

## Übersicht

Das Projekt verwendet ein Multi-Stage Docker-Build mit Next.js und Next Auth.js. Das GitHub Actions Workflow baut automatisch ein Docker-Image und pusht es zur GitHub Container Registry.

## Dockerfile

Das Dockerfile ist für Next Auth.js optimiert und enthält alle notwendigen Umgebungsvariablen für das NatureScout-Projekt.

### Build-Stage
- Node.js 20 Alpine
- pnpm als Package Manager
- Alle Umgebungsvariablen als Build-Args definiert
- Dummy-Werte für Build-Zeit

### Runtime-Stage
- Optimiert für Produktion
- Echte Umgebungsvariablen zur Runtime
- pnpm start als CMD

## GitHub Secrets

Folgende Secrets müssen in den GitHub Repository-Einstellungen konfiguriert werden:

### NextAuth.js
- `NEXTAUTH_SECRET`: Geheimer Schlüssel für NextAuth.js Sessions
- `NEXTAUTH_URL`: URL der Anwendung (z.B. https://naturescout.example.com)

### Datenbank
- `MONGODB_URI`: MongoDB Connection String
- `MONGODB_DATABASE_NAME`: Name der Datenbank
- `MONGODB_COLLECTION_NAME`: Name der Collection für Analyse-Jobs

### E-Mail (Mailjet)
- `MAILJET_API_KEY`: Mailjet API Key
- `MAILJET_API_SECRET`: Mailjet API Secret
- `MAILJET_FROM_EMAIL`: Absender-E-Mail-Adresse
- `MAILJET_FROM_NAME`: Absender-Name

### OpenAI
- `OPENAI_API_KEY`: OpenAI API Key
- `OPENAI_CHAT_MODEL`: Chat-Modell (z.B. gpt-4)
- `OPENAI_VISION_MODEL`: Vision-Modell (z.B. gpt-4-vision-preview)
- `OPENAI_TRANSCRIPTION_MODEL`: Transkriptions-Modell (z.B. whisper-1)

### Azure Storage
- `AZURE_STORAGE_CONNECTION_STRING`: Azure Storage Connection String
- `AZURE_STORAGE_CONTAINER_NAME`: Container-Name für Bilder

### Externe APIs
- `GOOGLE_MAPS_API_KEY`: Google Maps API Key
- `PLANTNET_API_KEY`: PlantNet API Key

### Bildverarbeitung
- `NEXT_PUBLIC_MAX_IMAGE_WIDTH`: Maximale Bildbreite (Standard: 2000)
- `NEXT_PUBLIC_MAX_IMAGE_HEIGHT`: Maximale Bildhöhe (Standard: 2000)
- `NEXT_PUBLIC_MAX_IMAGE_QUALITY`: Bildqualität (Standard: 0.8)

### Anwendung
- `NEXT_PUBLIC_BASE_URL`: Basis-URL der Anwendung
- `HABITAT_TEST_IMAGES_PATH`: Pfad zu Test-Bildern

## Workflow

### Automatischer Build
1. Push auf `master`-Branch triggert Workflow
2. Version wird aus `package.json` gelesen
3. Version wird automatisch gebumpt (patch-level)
4. Next.js-Anwendung wird gebaut
5. Docker-Image wird erstellt und gepusht
6. Git-Tag und Release werden erstellt

### Manueller Build
- Workflow kann auch manuell über GitHub Actions UI getriggert werden

## Registry

Das Image wird zur GitHub Container Registry gepusht:
- `ghcr.io/[username]/nextjs-nature-scout:latest`
- `ghcr.io/[username]/nextjs-nature-scout:[version]`

## Deployment

Das Image kann auf verschiedenen Plattformen deployed werden:

### Docker Compose
```yaml
version: '3.8'
services:
  naturescout:
    image: ghcr.io/[username]/nextjs-nature-scout:latest
    ports:
      - "3000:3000"
    environment:
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
      # ... weitere Umgebungsvariablen
```

### Kubernetes
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: naturescout
spec:
  replicas: 1
  selector:
    matchLabels:
      app: naturescout
  template:
    metadata:
      labels:
        app: naturescout
    spec:
      containers:
      - name: naturescout
        image: ghcr.io/[username]/nextjs-nature-scout:latest
        ports:
        - containerPort: 3000
        env:
        - name: NEXTAUTH_SECRET
          valueFrom:
            secretKeyRef:
              name: naturescout-secrets
              key: NEXTAUTH_SECRET
        # ... weitere Umgebungsvariablen
```

## Troubleshooting

### Build-Fehler
- Überprüfen Sie, ob alle GitHub Secrets konfiguriert sind
- Prüfen Sie die Build-Logs in GitHub Actions

### Runtime-Fehler
- Überprüfen Sie die Umgebungsvariablen im Container
- Prüfen Sie die Anwendungs-Logs

### Performance
- Das Image verwendet Multi-Stage-Build für optimale Größe
- Nur notwendige Dateien werden kopiert
- pnpm wird für schnellere Installation verwendet 