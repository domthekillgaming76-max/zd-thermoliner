@echo off
chcp 65001 >nul
title Z&D Thermoliner ERP
cd /d "%~dp0"

set "ERP_URL=https://erp.zd-thermoliner.fr"

echo.
echo  Z and D Thermoliner ERP — mode application legere
echo  %ERP_URL%
echo.

rem Preferer Edge (WebView2) — plus leger que Chrome avec extensions
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

rem Flags : fenetre app sans onglets, sans sync/extensions = moins de RAM/CPU
set "APP_FLAGS=--app=%ERP_URL% --disable-extensions --disable-sync --no-first-run --disable-background-networking --disable-default-apps --disable-features=TranslateUI"

if defined BROWSER (
  echo  Ouverture via %BROWSER_NAME% (fenetre application)...
  echo  Astuce : installez l'ERP via le menu %BROWSER_NAME% pour une vraie application Windows.
  echo.
  start "" "%BROWSER%" %APP_FLAGS%
) else (
  start "" "%ERP_URL%"
)

timeout /t 2 /nobreak >nul
exit /b 0
