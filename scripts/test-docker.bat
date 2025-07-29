@echo off
chcp 65001 >nul
echo 🐳 NatureScout Docker Test-Skript
echo ==================================

REM Prüfe ob Docker läuft
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker ist nicht gestartet. Bitte starten Sie Docker Desktop.
    pause
    exit /b 1
)

echo ✅ Docker ist verfügbar

echo 🔨 Starte Docker Build...
echo Dies kann einige Minuten dauern...

REM Docker Build ausführen
docker buildx build --platform linux/amd64 --build-arg VERSION=0.1.0-test --build-arg NEXTAUTH_SECRET=test-secret-for-local-build --build-arg NEXTAUTH_URL=http://localhost:3000 --build-arg MONGODB_URI=mongodb://localhost:27017 --build-arg MONGODB_DATABASE_NAME=naturescout-test --build-arg MONGODB_COLLECTION_NAME=analyseJobs --build-arg MAILJET_API_KEY=test-key --build-arg MAILJET_API_SECRET=test-secret --build-arg MAILJET_FROM_EMAIL=test@example.com --build-arg MAILJET_FROM_NAME=NatureScout Test --build-arg OPENAI_API_KEY=test-key --build-arg OPENAI_CHAT_MODEL=gpt-4 --build-arg OPENAI_VISION_MODEL=gpt-4-vision-preview --build-arg OPENAI_TRANSCRIPTION_MODEL=whisper-1 --build-arg AZURE_STORAGE_CONNECTION_STRING=test-connection --build-arg AZURE_STORAGE_CONTAINER_NAME=naturescout-test --build-arg GOOGLE_MAPS_API_KEY=test-key --build-arg PLANTNET_API_KEY=test-key --build-arg NEXT_PUBLIC_MAX_IMAGE_WIDTH=2000 --build-arg NEXT_PUBLIC_MAX_IMAGE_HEIGHT=2000 --build-arg NEXT_PUBLIC_MAX_IMAGE_QUALITY=0.8 --build-arg NEXT_PUBLIC_BASE_URL=http://localhost:3000 --build-arg HABITAT_TEST_IMAGES_PATH=/app/public/test-images -t naturescout:local --load .

if %errorlevel% equ 0 (
    echo ✅ Docker Build erfolgreich!
    echo.
    echo 🚀 Starte Container für Test...
    
    REM Container starten
    docker run -d --name naturescout-test -p 3000:3000 -e NEXTAUTH_SECRET=test-secret -e NEXTAUTH_URL=http://localhost:3000 -e MONGODB_URI=mongodb://localhost:27017 -e MONGODB_DATABASE_NAME=naturescout-test -e MONGODB_COLLECTION_NAME=analyseJobs -e MAILJET_API_KEY=test-key -e MAILJET_API_SECRET=test-secret -e MAILJET_FROM_EMAIL=test@example.com -e MAILJET_FROM_NAME=NatureScout Test -e OPENAI_API_KEY=test-key -e OPENAI_CHAT_MODEL=gpt-4 -e OPENAI_VISION_MODEL=gpt-4-vision-preview -e OPENAI_TRANSCRIPTION_MODEL=whisper-1 -e AZURE_STORAGE_CONNECTION_STRING=test-connection -e AZURE_STORAGE_CONTAINER_NAME=naturescout-test -e GOOGLE_MAPS_API_KEY=test-key -e PLANTNET_API_KEY=test-key -e NEXT_PUBLIC_MAX_IMAGE_WIDTH=2000 -e NEXT_PUBLIC_MAX_IMAGE_HEIGHT=2000 -e NEXT_PUBLIC_MAX_IMAGE_QUALITY=0.8 -e NEXT_PUBLIC_BASE_URL=http://localhost:3000 -e HABITAT_TEST_IMAGES_PATH=/app/public/test-images naturescout:local
    
    if %errorlevel% equ 0 (
        echo ✅ Container gestartet!
        echo.
        echo 📋 Container-Status:
        docker ps --filter "name=naturescout-test"
        echo.
        echo 🌐 Anwendung verfügbar unter: http://localhost:3000
        echo.
        echo 📝 Nützliche Befehle:
        echo   Container-Logs anzeigen: docker logs naturescout-test
        echo   Container stoppen: docker stop naturescout-test
        echo   Container entfernen: docker rm naturescout-test
        echo   Container neu starten: docker restart naturescout-test
    ) else (
        echo ❌ Fehler beim Starten des Containers
    )
) else (
    echo ❌ Docker Build fehlgeschlagen
    pause
    exit /b 1
)

echo.
echo 🎉 Test abgeschlossen! Drücken Sie eine beliebige Taste zum Beenden...
pause >nul 