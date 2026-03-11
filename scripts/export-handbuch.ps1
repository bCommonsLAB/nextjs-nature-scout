param(
  # "docx" ist am robustesten. "pdf" benoetigt zusaetzlich eine PDF-Engine (z.B. MiKTeX/TeX Live).
  [ValidateSet("docx", "pdf", "both")]
  [string]$Format = "docx"
)

$ErrorActionPreference = "Stop"

function Assert-CommandExists {
  param([Parameter(Mandatory)][string]$Command)

  if (Get-Command $Command -ErrorAction SilentlyContinue) { return }

  throw "Benoetigtes Tool fehlt: '$Command'. Bitte installieren und erneut ausfuehren."
}

function Resolve-PandocExe {
  # Warum: Auf Windows ist pandoc oft installiert, aber nicht im PATH.
  # Dieses Script soll trotzdem ohne manuelles PATH-Setup funktionieren.
  $cmd = Get-Command "pandoc" -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }

  $candidates = @(
    (Join-Path $env:ProgramFiles "Pandoc\pandoc.exe"),
    (Join-Path ${env:ProgramFiles(x86)} "Pandoc\pandoc.exe"),
    "C:\Program Files\Pandoc\pandoc.exe",
    "C:\Program Files (x86)\Pandoc\pandoc.exe"
  ) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -Unique

  # Wichtig: In Windows PowerShell kann ein einzelner Pipeline-Treffer als String statt Array enden.
  # Dann waere $candidates[0] nur das erste Zeichen ("C"). Deshalb hier explizit als Array wrappen.
  $candidates = @($candidates)
  if ($candidates.Length -gt 0) { return $candidates[0] }

  throw "Benoetigtes Tool fehlt: 'pandoc'. Installationspfad nicht gefunden. Bitte Pandoc installieren oder PATH setzen."
}

function Ensure-Dir {
  param([Parameter(Mandatory)][string]$Path)

  if (Test-Path $Path) { return }
  New-Item -ItemType Directory -Path $Path | Out-Null
}

function New-ExportFrontmatterFile {
  param([Parameter(Mandatory)][string]$OutDir)

  $file = Join-Path $OutDir "_handbuch-frontmatter.md"
  @"
---
title: "NatureScout - Handbuch"
lang: de
---

# NatureScout - Handbuch

Dieses Dokument ist ein Export des Online-Handbuchs.

"@ | Set-Content -Path $file -Encoding UTF8

  return $file
}

$pandocExe = Resolve-PandocExe

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$docsRoot = Join-Path $projectRoot "docs\anwenderhandbuch"
$distDir = Join-Path $projectRoot "dist\handbuch"

Ensure-Dir -Path $distDir

# Wichtig: Reihenfolge entspricht mkdocs.yml -> nav
$chapterFiles = @(
  "00-start-hier.md",
  "01-ueber-naturescout.md",
  "04-unsere-habitate.md",
  "02-anmelden-und-profil.md",
  "03-habitat-erfassen-uebersicht.md",
  "05-standort-bestimmen.md",
  "06-bilder-erfassen.md",
  "07-habitat-analysieren.md",
  "08-verifizieren-experten.md",
  "09-meine-habitate.md",
  "10-habitatverwaltung-experten.md",
  "11-admin.md",
  "12-haeufige-probleme.md",
  "13-glossar.md",
  "14-integration-geo-browser.md"
) | ForEach-Object { Join-Path $docsRoot $_ }

foreach ($f in $chapterFiles) {
  if (Test-Path $f) { continue }
  throw "Kapitel-Datei fehlt: $f"
}

$frontmatter = New-ExportFrontmatterFile -OutDir $distDir

$commonArgs = @(
  "--from=markdown",
  "--toc",
  "--resource-path=$docsRoot",
  "--metadata=title:NatureScout - Handbuch"
)

if ($Format -eq "docx" -or $Format -eq "both") {
  $outDocx = Join-Path $distDir "NatureScout-Handbuch.docx"

  & $pandocExe @commonArgs `
    $frontmatter `
    @chapterFiles `
    "-o" $outDocx

  Write-Host "DOCX erstellt: $outDocx"
}

if ($Format -eq "pdf" -or $Format -eq "both") {
  $outPdf = Join-Path $distDir "NatureScout-Handbuch.pdf"

  try {
    & $pandocExe @commonArgs `
      "--pdf-engine=xelatex" `
      "--variable=geometry:margin=2.2cm" `
      $frontmatter `
      @chapterFiles `
      "-o" $outPdf

    Write-Host "PDF erstellt: $outPdf"
  } catch {
    Write-Host ""
    Write-Host "PDF-Export ist fehlgeschlagen. Haeufige Ursache: keine LaTeX/PDF-Engine installiert." -ForegroundColor Yellow
    Write-Host "Empfohlen: MiKTeX installieren (Windows) und danach erneut probieren." -ForegroundColor Yellow
    throw
  }
}


