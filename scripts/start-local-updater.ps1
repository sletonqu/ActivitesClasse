param(
  [int]$Port = 8765,
  [string]$ProjectPath = (Split-Path -Parent $PSScriptRoot),
  [string]$Token = $env:UPDATER_TOKEN
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Send-JsonResponse {
  param(
    [Parameter(Mandatory = $true)] $Context,
    [int]$StatusCode = 200,
    [hashtable]$Body = @{}
  )

  $payload = [System.Text.Encoding]::UTF8.GetBytes(($Body | ConvertTo-Json -Depth 5))
  $Context.Response.StatusCode = $StatusCode
  $Context.Response.ContentType = 'application/json; charset=utf-8'
  $Context.Response.ContentLength64 = $payload.Length
  $Context.Response.OutputStream.Write($payload, 0, $payload.Length)
  $Context.Response.OutputStream.Close()
}

$resolvedProjectPath = (Resolve-Path $ProjectPath).Path
$updateScript = Join-Path $PSScriptRoot 'update-application.ps1'
$lockFile = Join-Path $resolvedProjectPath 'tmp\update-in-progress.lock'

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://127.0.0.1:$Port/")
$listener.Start()

Write-Host "Service local de mise à jour démarré sur http://127.0.0.1:$Port/" -ForegroundColor Green
Write-Host "Laissez cette fenêtre ouverte pour autoriser les demandes de mise à jour depuis l'interface admin." -ForegroundColor Yellow

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $path = $request.Url.AbsolutePath.TrimEnd('/')

    try {
      if ($request.HttpMethod -eq 'GET' -and ($path -eq '' -or $path -eq '/health')) {
        Send-JsonResponse -Context $context -Body @{
          status = 'ok'
          projectPath = $resolvedProjectPath
          isUpdating = (Test-Path $lockFile)
        }
        continue
      }

      if ($request.HttpMethod -eq 'POST' -and $path -eq '/update') {
        if ($Token) {
          $authorization = $request.Headers['Authorization']
          if ($authorization -ne "Bearer $Token") {
            Send-JsonResponse -Context $context -StatusCode 401 -Body @{ error = 'Jeton de sécurité invalide.' }
            continue
          }
        }

        if (Test-Path $lockFile) {
          Send-JsonResponse -Context $context -StatusCode 409 -Body @{ error = 'Une mise à jour est déjà en cours.' }
          continue
        }

        $arguments = @(
          '-ExecutionPolicy', 'Bypass',
          '-File', $updateScript,
          '-ProjectPath', $resolvedProjectPath
        )

        Start-Process -FilePath 'powershell.exe' -ArgumentList $arguments -WindowStyle Hidden | Out-Null

        Send-JsonResponse -Context $context -StatusCode 202 -Body @{
          message = 'Demande acceptée. La mise à jour a été lancée sur le poste local.'
          acceptedAt = (Get-Date -Format o)
        }
        continue
      }

      Send-JsonResponse -Context $context -StatusCode 404 -Body @{ error = 'Route inconnue.' }
    }
    catch {
      Send-JsonResponse -Context $context -StatusCode 500 -Body @{ error = $_.Exception.Message }
    }
  }
}
finally {
  $listener.Stop()
  $listener.Close()
}
