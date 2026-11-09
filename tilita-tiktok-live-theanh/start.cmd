@echo off
chcp 65001 >nul
cd /d "%~dp0"
set "PORT=3001"
set "TILITA_DATA_DIR=%~dp0output\qa-v2\data"
node -e "if(Number(process.versions.node.split('.')[0])<24)process.exit(1)" >nul 2>&1
if errorlevel 1 (
  echo Can cai Node.js 24 hoac moi hon: https://nodejs.org/
  pause
  exit /b 1
)
if not exist "node_modules\.package-lock.json" (
  echo Dang cai thu vien lan dau. Can ket noi Internet...
  call npm ci --no-audit --no-fund
  if errorlevel 1 (
    echo Cai thu vien that bai. Kiem tra mang roi mo lai.
    pause
    exit /b 1
  )
)
echo Dang mo Tam an lac: http://127.0.0.1:3001/admin
node server.js --open
pause
