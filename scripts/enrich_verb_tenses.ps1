# Exécute l'enrichissement du temps des verbes dans le conteneur backend Docker
param (
    [string]$Provider = "gemini",
    [int]$Batch = 20,
    [int]$Limit = 0
)

Write-Host "Lancement de l'enrichissement du temps des verbes via Docker..." -ForegroundColor Cyan
docker compose exec backend node scripts/enrich_verb_tenses.js "--provider=$Provider" "--batch=$Batch" "--limit=$Limit"
