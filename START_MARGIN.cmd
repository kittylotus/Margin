@echo off
setlocal
cd /d "%~dp0"

echo.
echo  Margin - localhost launcher
echo  =========================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js 22.13 or newer is required.
  echo Install Node.js, then run this file again.
  pause
  exit /b 1
)

for /f "tokens=*" %%v in ('node -p "process.versions.node"') do set NODE_VERSION=%%v
echo Node: %NODE_VERSION%

set NEED_INSTALL=0
if not exist node_modules set NEED_INSTALL=1
if not exist node_modules\get-youtube-transcript\package.json set NEED_INSTALL=1

where bun >nul 2>nul
if not errorlevel 1 (
  echo Package runner: Bun
  if "%NEED_INSTALL%"=="1" (
    echo Installing/updating dependencies...
    bun install || goto :fail
  )
  echo.
  echo Starting Margin at http://127.0.0.1:3000
  echo Press Ctrl+C in this window to stop it.
  echo.
  bun run dev
  goto :eof
)

where npm >nul 2>nul
if errorlevel 1 (
  echo ERROR: Neither Bun nor npm is available.
  pause
  exit /b 1
)

echo Package runner: npm
if "%NEED_INSTALL%"=="1" (
  echo Installing/updating dependencies...
  npm install || goto :fail
)
echo.
echo Starting Margin at http://127.0.0.1:3000
echo Press Ctrl+C in this window to stop it.
echo.
npm run dev
goto :eof

:fail
echo.
echo Margin could not install/start. Review the error above.
pause
exit /b 1
