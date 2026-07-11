@echo off
chcp 65001 >nul
title Z&D Thermoliner ERP
cd /d "%~dp0"

if not exist ".env" (
  echo [ERREUR] Fichier .env manquant.
  echo Lancez install.bat ou copiez .env.example vers .env
  pause
  exit /b 1
)

if not exist "dist\index.html" (
  echo [ERREUR] Interface non compilee. Lancez install.bat d'abord.
  pause
  exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
  echo [ERREUR] Node.js requis — https://nodejs.org
  pause
  exit /b 1
)

echo.
echo  Z&D Thermoliner ERP demarre...
echo  Navigateur : http://localhost:3000
echo  Arret : Ctrl+C ou fermer cette fenetre
echo.

node --env-file=.env server/index.mjs
