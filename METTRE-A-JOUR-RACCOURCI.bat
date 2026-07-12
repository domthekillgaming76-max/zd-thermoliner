@echo off
chcp 65001 >nul
title Z&D Thermoliner — Raccourci Bureau
cd /d "%~dp0"

echo.
echo  Mise a jour du raccourci Bureau avec le logo Z and D Thermoliner...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-desktop-shortcut.ps1"

echo.
pause
