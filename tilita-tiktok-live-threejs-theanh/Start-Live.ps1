param([switch]$NoBrowser, [switch]$SkipBuild)
$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$studioUrl = 'http://127.0.0.1:5178'
try {
  $running = Invoke-RestMethod -Uri "$studioUrl/api/health" -TimeoutSec 2
  if ($running.app -eq 'tilita-live-threejs-theanh' -and $running.workspace -eq $projectRoot) {
    Write-Host "Tilita is running: $studioUrl"
    if (-not $NoBrowser) { Start-Process -FilePath $studioUrl }
    exit 0
  }
  throw 'Port 5178 is in use by another application.'
} catch {
  if ($_.Exception.Message -eq 'Port 5178 is in use by another application.') { throw }
}
if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) { throw 'Node.js 20 or newer is required.' }
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'node_modules'))) {
  & npm.cmd ci
  if ($LASTEXITCODE -ne 0) { throw 'Could not install dependencies.' }
}
if (-not $SkipBuild -or -not (Test-Path -LiteralPath (Join-Path $projectRoot 'dist\index.html'))) {
  & npm.cmd run build
  if ($LASTEXITCODE -ne 0) { throw 'Build failed; the server was not started.' }
}
$logs = Join-Path $projectRoot 'data'
New-Item -ItemType Directory -Force -Path $logs | Out-Null
$nodePath = (Get-Command node.exe).Source
$process = Start-Process -FilePath $nodePath -ArgumentList @('server/index.js') -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logs 'server-output.log') -RedirectStandardError (Join-Path $logs 'server-error.log')
for ($attempt = 0; $attempt -lt 80; $attempt++) {
  Start-Sleep -Milliseconds 150
  try {
    $health = Invoke-RestMethod -Uri "$studioUrl/api/health" -TimeoutSec 1
    if ($health.app -eq 'tilita-live-threejs-theanh' -and $health.workspace -eq $projectRoot) {
      Write-Host "Tilita LIVE Studio: $studioUrl"
      Write-Host "OBS 1080x1920: $studioUrl/overlay"
      if (-not $NoBrowser) { Start-Process -FilePath $studioUrl }
      exit 0
    }
  } catch { }
  if ($process.HasExited) { throw "The server stopped. See data/server-error.log." }
}
throw 'The server is not ready. See data/server-error.log.'
