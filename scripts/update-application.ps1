param(
  [string]$ProjectPath = (Split-Path -Parent $PSScriptRoot),
  [switch]$SkipGitPull
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Write-Step {
  param([string]$Message)
  Write-Host "`n==> $Message" -ForegroundColor Cyan
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

  if (-not $SkipGitPull) {
    Write-Step 'Récupération de la dernière version depuis GitHub'
    git pull --ff-only
  }

  Write-Step 'Reconstruction et redémarrage des conteneurs'
  docker compose up -d --build

  Write-Step 'État actuel des services Docker'
  docker compose ps

  Write-Host "`nMise à jour terminée. Ouvrez http://localhost:3000 pour vérifier l'application." -ForegroundColor Green
}
finally {
  if (Test-Path $lockFile) {
    Remove-Item $lockFile -Force
  }
  Pop-Location
}
