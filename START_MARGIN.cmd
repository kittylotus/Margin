@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  ERROR: Node.js 22.13 or newer is required.
  echo  Install Node.js, then run this file again.
  echo.
  pause
  exit /b 1
)

node local-tools\launch-margin.mjs %*
if errorlevel 1 (
  echo.
  echo  Margin stopped with an error. Review the output above.
  pause
)
