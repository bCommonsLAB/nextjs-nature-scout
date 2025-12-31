# Build-Skript für das NatureScout Anwenderhandbuch
# Erstellt die statischen HTML-Seiten mit MkDocs und kopiert sie nach public/handbuch/

Write-Host "Building Anwenderhandbuch mit MkDocs..." -ForegroundColor Green

# Prüfe ob mkdocs verfügbar ist
$mkdocsCheck = Get-Command mkdocs -ErrorAction SilentlyContinue
if (-not $mkdocsCheck) {
    Write-Host "FEHLER: mkdocs ist nicht installiert." -ForegroundColor Red
    Write-Host "Bitte installieren Sie MkDocs mit: pip install -r docs/requirements-mkdocs.txt" -ForegroundColor Yellow
    exit 1
}

# Wechsle ins Projektverzeichnis (falls Skript von woanders aufgerufen wird)
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptPath
Set-Location $projectRoot

# Baue die Dokumentation nach public/handbuch/
Write-Host "Baue Dokumentation..." -ForegroundColor Cyan
mkdocs build --clean --site-dir public/handbuch

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nErfolgreich! Das Handbuch ist jetzt unter public/handbuch/ verfügbar." -ForegroundColor Green
    Write-Host "Lokal testen: npm run dev und dann http://localhost:3000/handbuch/ öffnen" -ForegroundColor Yellow
} else {
    Write-Host "`nFEHLER beim Build. Bitte prüfen Sie die Ausgabe oben." -ForegroundColor Red
    exit 1
}

