@echo off
chcp 65001 >nul
title Z&D Thermoliner ERP
cd /d "%~dp0"

set "ERP_URL=https://erp.zd-thermoliner.fr"

echo.
echo  Ouverture Z and D Thermoliner ERP...
echo  %ERP_URL%
echo  (en ligne — pas besoin de votre PC allume)
echo.

set "BROWSER="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "BROWSER=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "BROWSER=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not defined BROWSER if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"

if defined BROWSER (
  start "" "%BROWSER%" --app="%ERP_URL%"
) else (
  start "" "%ERP_URL%"
)

timeout /t 2 /nobreak >nul
exit /b 0
