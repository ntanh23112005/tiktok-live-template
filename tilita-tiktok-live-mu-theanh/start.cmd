@echo off
chcp 65001 >nul
cd /d "%~dp0"
set "PORT=3002"
set "TILITA_MU_DATA_DIR=%~dp0data"
node -e "if(Number(process.versions.node.split('.')[0])<24)process.exit(1)" >nul 2>&1
if errorlevel 1 (
 echo Can cai Node.js 24 hoac moi hon: https://nodejs.org/
 pause
 exit /b 1
)
node --input-type=module -e "await Promise.all(['express','ws','tiktok-live-connector','music-metadata'].map(p=>import(p)))" >nul 2>&1
if errorlevel 1 (
 call npm ci --no-audit --no-fund
 if errorlevel 1 exit /b 1
)
echo HANG MU: http://127.0.0.1:3002/admin
node server.js --open
pause

