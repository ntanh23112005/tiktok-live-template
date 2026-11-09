$ErrorActionPreference = 'Stop'
$health = Invoke-RestMethod -Uri 'http://127.0.0.1:5178/api/health' -TimeoutSec 3
if ($health.app -ne 'tilita-live-threejs-theanh' -or $health.workspace -ne $PSScriptRoot) { throw 'This is not this project server; no process was stopped.' }
Stop-Process -Id $health.pid
Write-Host 'Tilita stopped. Interrupted events will be recovered paused on the next launch.'
