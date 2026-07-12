# Launcher ERP natif Windows

Application **WebView2** légère — l'ERP s'affiche dans une fenêtre dédiée **ZD-Thermoliner-ERP** (pas Google Chrome dans le Gestionnaire des tâches).

## Prérequis

- Windows 10/11 x64
- [WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/) (présent sur la plupart des PC Windows 11)

## Build

```powershell
npm run build:erp-launcher
```

Sortie : `desktop/erp-launcher/publish/ZD-Thermoliner-ERP.exe` (autonome, .NET inclus)

## Distribution ERP

```powershell
npm run build:erp-launcher
node scripts/copy-erp-launcher.mjs
npm run build
```

Le fichier est copié vers `public/downloads/ZD-Thermoliner-ERP-Windows-1.0.5.exe` et téléchargeable depuis l'ERP (Paramètres → Aide, Portail chauffeur).

À chaque lancement ou mise à jour, le launcher installe l'exe dans `%LOCALAPPDATA%\Programs\ZD-Thermoliner-ERP\` et recrée le raccourci Bureau avec le logo Z&D.

## URL personnalisée

```text
ZD-Thermoliner-ERP.exe --url https://erp.zd-thermoliner.fr
```
