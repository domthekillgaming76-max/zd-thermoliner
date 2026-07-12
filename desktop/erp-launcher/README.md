# Launcher ERP natif Windows

Application **WebView2** légère — l'ERP s'affiche dans une fenêtre dédiée **ZD-Thermoliner-ERP** (pas Google Chrome dans le Gestionnaire des tâches).

## Prérequis

- Windows 10/11 x64
- [.NET 8 Runtime](https://dotnet.microsoft.com/download/dotnet/8.0) (souvent déjà installé)
- [WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/) (présent sur la plupart des PC Windows 11)

## Build

```powershell
npm run build:erp-launcher
```

Sortie : `desktop/erp-launcher/publish/ZD-Thermoliner-ERP.exe`

## Distribution ERP

```powershell
npm run build:erp-launcher
node scripts/copy-erp-launcher.mjs
npm run build
```

Le fichier est copié vers `public/downloads/ZD-Thermoliner-ERP-Windows-1.0.0.exe` et téléchargeable depuis l'ERP (Paramètres → Aide, Portail chauffeur).

## URL personnalisée

```text
ZD-Thermoliner-ERP.exe --url https://erp.zd-thermoliner.fr
```
