param(
  [string]$ProjectPath = (Split-Path -Parent $PSScriptRoot),
  [switch]$SkipGitPull
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

Write-Host @"
========================================
 Mise à jour d'ActivitesClasse
========================================
Cette opération sauvegarde la base SQLite, récupère les mises à jour
et reconstruit puis redémarre les services Docker.
L'application peut être indisponible pendant quelques instants.
"@ -ForegroundColor Yellow

function Write-Step {
  param([string]$Message)
  Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Assert-LastExitCode {
  param([string]$CommandDescription)

  if ($LASTEXITCODE -ne 0) {
    throw "$CommandDescription a échoué (code $LASTEXITCODE)."
  }
}

$resolvedProjectPath = (Resolve-Path $ProjectPath).Path
$lockFile = Join-Path $resolvedProjectPath 'tmp\update-in-progress.lock'

if (Test-Path $lockFile) {
  throw "Une mise à jour est déjà en cours sur ce poste."
}

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $lockFile) | Out-Null
Set-Content -Path $lockFile -Value (Get-Date -Format o)

Push-Location $resolvedProjectPath
try {
  if (-not (Test-Path '.git')) {
    throw "Le dossier $resolvedProjectPath n'est pas un dépôt Git valide."
  }

  if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw "Git n'est pas installé ou indisponible dans le PATH."
  }

  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker Desktop n'est pas installé ou indisponible dans le PATH."
  }

  $timestamp = Get-Date -Format 'yyyy-MM-dd_HHmmss'

  Write-Step 'Sauvegarde préventive de la base SQLite dans le volume Docker'
  $backupCommand = "if [ -f /app/data/database.sqlite ]; then cp /app/data/database.sqlite /app/data/database.sqlite.backup-$timestamp; echo 'Sauvegarde SQLite créée'; else echo 'Aucune base SQLite trouvée'; fi"
  docker compose run --rm --no-deps backend sh -lc $backupCommand
  Assert-LastExitCode 'La sauvegarde de la base SQLite'

  if (-not $SkipGitPull) {
    $previousCommit = git rev-parse HEAD
    Assert-LastExitCode 'La lecture du commit Git courant'

    Write-Step 'Récupération de la dernière version depuis GitHub'
    git pull --ff-only
    Assert-LastExitCode 'La récupération des dernières modifications depuis Git'

    $updatedCommit = git rev-parse HEAD
    Assert-LastExitCode 'La lecture du commit Git courant'

    $changedFiles = git diff --name-only "$previousCommit" "$updatedCommit" -- scripts/update-application.ps1
    Assert-LastExitCode 'La vérification des modifications du script de mise à jour'

    if ($changedFiles -contains 'scripts/update-application.ps1') {
      throw "Le script de mise à jour a été modifié par le git pull. Relancez scripts\update-application.ps1 pour appliquer la nouvelle version."
    }
  }

  Write-Step 'Reconstruction des images Docker avec les dernières images de base'
  docker compose build --pull
  Assert-LastExitCode 'La reconstruction des images Docker'

  Write-Step 'Redémarrage des conteneurs'
  docker compose up -d
  Assert-LastExitCode 'Le redémarrage des conteneurs'

  Write-Step 'État actuel des services Docker'
  docker compose ps
  Assert-LastExitCode "L'affichage de l'état des services Docker"

  Write-Host "`nMise à jour terminée. Ouvrez http://localhost:3000 pour vérifier l'application." -ForegroundColor Green
}
finally {
  if (Test-Path $lockFile) {
    Remove-Item $lockFile -Force
  }
  Pop-Location
}
