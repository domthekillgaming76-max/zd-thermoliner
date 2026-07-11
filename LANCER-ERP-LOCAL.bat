@echo off
chcp 65001 >nul
title Z&D Thermoliner — Serveur local
cd /d "%~dp0"
color 0A

echo.
echo  MODE LOCAL (dev) — http://localhost:3000
echo  Pour l usage normal, utilisez LANCER-ERP.bat (en ligne).
echo.

if not exist ".env" (
  echo [ERREUR] Fichier .env manquant.
  pause
  exit /b 1
)

netstat -ano | findstr ":3000" | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
  start "" "http://localhost:3000"
  exit /b 0
)

start /min "Z&D SERVEUR LOCAL" cmd /k "cd /d "%~dp0" && node --env-file=.env server/index.mjs"
timeout /t 4 /nobreak >nul
start "" "http://localhost:3000"
