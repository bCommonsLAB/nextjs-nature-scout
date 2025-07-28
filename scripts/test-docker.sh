#!/bin/bash

# Docker Test-Skript für NatureScout
echo "🐳 NatureScout Docker Test-Skript"
echo "=================================="

# Farben für bessere Lesbarkeit
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Prüfe ob Docker läuft
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker ist nicht gestartet. Bitte starten Sie Docker Desktop.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker ist verfügbar${NC}"

# Build-Argumente definieren (Dummy-Werte für lokalen Test)
BUILD_ARGS="
--build-arg VERSION=0.1.0-test
--build-arg NEXTAUTH_SECRET=test-secret-for-local-build
--build-arg NEXTAUTH_URL=http://localhost:3000
--build-arg MONGODB_URI=mongodb://localhost:27017
--build-arg MONGODB_DATABASE_NAME=naturescout-test
--build-arg MONGODB_COLLECTION_NAME=analyseJobs
--build-arg MAILJET_API_KEY=test-key
--build-arg MAILJET_API_SECRET=test-secret
--build-arg MAILJET_FROM_EMAIL=test@example.com
--build-arg MAILJET_FROM_NAME=NatureScout Test
--build-arg OPENAI_API_KEY=test-key
--build-arg OPENAI_CHAT_MODEL=gpt-4
--build-arg OPENAI_VISION_MODEL=gpt-4-vision-preview
--build-arg OPENAI_TRANSCRIPTION_MODEL=whisper-1
--build-arg AZURE_STORAGE_CONNECTION_STRING=test-connection
--build-arg AZURE_STORAGE_CONTAINER_NAME=naturescout-test
--build-arg GOOGLE_MAPS_API_KEY=test-key
--build-arg PLANTNET_API_KEY=test-key
--build-arg NEXT_PUBLIC_MAX_IMAGE_WIDTH=2000
--build-arg NEXT_PUBLIC_MAX_IMAGE_HEIGHT=2000
--build-arg NEXT_PUBLIC_MAX_IMAGE_QUALITY=0.8
--build-arg NEXT_PUBLIC_BASE_URL=http://localhost:3000
--build-arg HABITAT_TEST_IMAGES_PATH=/app/public/test-images
"

echo -e "${YELLOW}🔨 Starte Docker Build...${NC}"
echo "Dies kann einige Minuten dauern..."

# Docker Build ausführen
docker build $BUILD_ARGS -t naturescout:local .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Docker Build erfolgreich!${NC}"
    echo ""
    echo -e "${YELLOW}🚀 Starte Container für Test...${NC}"
    
    # Container starten
    docker run -d \
        --name naturescout-test \
        -p 3000:3000 \
        -e NEXTAUTH_SECRET=test-secret \
        -e NEXTAUTH_URL=http://localhost:3000 \
        -e MONGODB_URI=mongodb://localhost:27017 \
        -e MONGODB_DATABASE_NAME=naturescout-test \
        -e MONGODB_COLLECTION_NAME=analyseJobs \
        -e MAILJET_API_KEY=test-key \
        -e MAILJET_API_SECRET=test-secret \
        -e MAILJET_FROM_EMAIL=test@example.com \
        -e MAILJET_FROM_NAME=NatureScout Test \
        -e OPENAI_API_KEY=test-key \
        -e OPENAI_CHAT_MODEL=gpt-4 \
        -e OPENAI_VISION_MODEL=gpt-4-vision-preview \
        -e OPENAI_TRANSCRIPTION_MODEL=whisper-1 \
        -e AZURE_STORAGE_CONNECTION_STRING=test-connection \
        -e AZURE_STORAGE_CONTAINER_NAME=naturescout-test \
        -e GOOGLE_MAPS_API_KEY=test-key \
        -e PLANTNET_API_KEY=test-key \
        -e NEXT_PUBLIC_MAX_IMAGE_WIDTH=2000 \
        -e NEXT_PUBLIC_MAX_IMAGE_HEIGHT=2000 \
        -e NEXT_PUBLIC_MAX_IMAGE_QUALITY=0.8 \
        -e NEXT_PUBLIC_BASE_URL=http://localhost:3000 \
        -e HABITAT_TEST_IMAGES_PATH=/app/public/test-images \
        naturescout:local
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Container gestartet!${NC}"
        echo ""
        echo -e "${YELLOW}📋 Container-Status:${NC}"
        docker ps --filter "name=naturescout-test"
        echo ""
        echo -e "${GREEN}🌐 Anwendung verfügbar unter: http://localhost:3000${NC}"
        echo ""
        echo -e "${YELLOW}📝 Nützliche Befehle:${NC}"
        echo "  Container-Logs anzeigen: docker logs naturescout-test"
        echo "  Container stoppen: docker stop naturescout-test"
        echo "  Container entfernen: docker rm naturescout-test"
        echo "  Container neu starten: docker restart naturescout-test"
    else
        echo -e "${RED}❌ Fehler beim Starten des Containers${NC}"
    fi
else
    echo -e "${RED}❌ Docker Build fehlgeschlagen${NC}"
    exit 1
fi 