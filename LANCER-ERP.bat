@echo off
chcp 65001 >nul
title Z&D Thermoliner ERP
cd /d "%~dp0"

set "ERP_URL=https://erp.zd-thermoliner.fr"

rem Launcher natif (prioritaire)
set "NATIVE_LAUNCHER=%LOCALAPPDATA%\Programs\ZD-Thermoliner-ERP\ZD-Thermoliner-ERP.exe"
if exist "%NATIVE_LAUNCHER%" (
  echo  Ouverture launcher natif Z and D Thermoliner ERP...
  start "" "%NATIVE_LAUNCHER%"
  timeout /t 2 /nobreak >nul
  exit /b 0
)

set "LOCAL_LAUNCHER=%~dp0desktop\erp-launcher\publish\ZD-Thermoliner-ERP.exe"
if exist "%LOCAL_LAUNCHER%" (
  echo  Ouverture launcher natif (build local)...
  start "" "%LOCAL_LAUNCHER%"
  timeout /t 2 /nobreak >nul
  exit /b 0
)

echo.
echo  Z and D Thermoliner ERP — mode navigateur leger
echo  %ERP_URL%
echo  Astuce : telechargez le launcher natif dans Parametres - Aide
echo.

set "BROWSER="
set "BROWSER_NAME="

if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
  set "BROWSER=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
  set "BROWSER_NAME=Edge"
)
if not defined BROWSER if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
  set "BROWSER=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
  set "BROWSER_NAME=Edge"
)
if not defined BROWSER if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
  set "BROWSER=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
  set "BROWSER_NAME=Chrome"
)
if not defined BROWSER if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
  set "BROWSER=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
  set "BROWSER_NAME=Chrome"
)

set "APP_FLAGS=--app=%ERP_URL% --disable-extensions --disable-sync --no-first-run --disable-background-networking --disable-default-apps --disable-features=TranslateUI"

if defined BROWSER (
  echo  Ouverture via %BROWSER_NAME% (fenetre application)...
  start "" "%BROWSER%" %APP_FLAGS%
) else (
  start "" "%ERP_URL%"
)

timeout /t 2 /nobreak >nul
exit /b 0
