@echo off
chcp 65001 >nul
title Z&D Thermoliner — Installation
cd /d "%~dp0"

echo.
echo  ============================================
echo   Z&D THERMOLINER — Installation ERP
echo  ============================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERREUR] Node.js n'est pas installe.
  echo Telechargez Node.js 20 LTS : https://nodejs.org
  pause
  exit /b 1
)

echo [OK] Node.js detecte :
node -v
npm -v
echo.

if not exist ".env" (
  if exist ".env.example" (
    echo [INFO] Creation du fichier .env depuis .env.example
    copy /Y ".env.example" ".env" >nul
    echo [ACTION] Editez .env avec vos cles Supabase avant de lancer start.bat
    echo.
  ) else (
    echo [ATTENTION] Fichier .env manquant — creez-le avant de demarrer.
    echo.
  )
)

if not exist "dist\index.html" (
  echo [INFO] Build de l'interface web...
  call npm install
  if errorlevel 1 goto :fail
  call npm run build
  if errorlevel 1 goto :fail
) else (
  echo [INFO] Interface deja compilee — installation legere...
  call npm install --omit=dev
  if errorlevel 1 goto :fail
)

echo.
echo  ============================================
echo   Installation terminee !
echo   1. Configurez .env si pas encore fait
echo   2. Lancez start.bat
echo   3. Ouvrez http://localhost:3000
echo  ============================================
echo.
pause
exit /b 0

:fail
echo.
echo [ERREUR] Installation echouee.
pause
exit /b 1
