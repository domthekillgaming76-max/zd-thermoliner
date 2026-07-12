param(
  [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot),
  [string]$ErpUrl = 'https://erp.zd-thermoliner.fr'
)

$ErrorActionPreference = 'Stop'

$desktop = [Environment]::GetFolderPath('Desktop')
$linkPath = Join-Path $desktop 'ZD Thermoliner ERP.lnk'
$legacyLinkPath = Join-Path $desktop 'Z&D Thermoliner ERP.lnk'
$iconPath = Join-Path $ProjectRoot 'public\icons\desktop-shortcut.ico'
$batPath = Join-Path $ProjectRoot 'LANCER-ERP.bat'

$nativeLauncher = Join-Path $env:LOCALAPPDATA 'Programs\ZD-Thermoliner-ERP\ZD-Thermoliner-ERP.exe'
$localLauncher = Join-Path $ProjectRoot 'desktop\erp-launcher\publish\ZD-Thermoliner-ERP.exe'
$downloadLauncher = Join-Path $env:USERPROFILE 'Downloads\ZD-Thermoliner-ERP-Windows-1.0.3.exe'

$targetExe = $null
if (Test-Path $nativeLauncher) { $targetExe = $nativeLauncher }
elseif (Test-Path $localLauncher) { $targetExe = $localLauncher }
elseif (Test-Path $downloadLauncher) { $targetExe = $downloadLauncher }

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($linkPath)

if ($targetExe) {
  $shortcut.TargetPath = $targetExe
  $shortcut.Arguments = '--zd-ready'
  $shortcut.WorkingDirectory = Split-Path $targetExe
  $shortcut.WindowStyle = 1
  $shortcut.Description = 'Z and D Thermoliner ERP'
  $shortcut.IconLocation = "$targetExe,0"
  Write-Host "[OK] Raccourci vers launcher : $targetExe"
} else {
  if (-not (Test-Path $batPath)) {
    Write-Host "[ERREUR] Launcher introuvable. Telechargez ZD-Thermoliner-ERP-Windows-1.0.3.exe"
    exit 1
  }
  $shortcut.TargetPath = $batPath
  $shortcut.WorkingDirectory = $ProjectRoot
  $shortcut.WindowStyle = 1
  $shortcut.Description = "Ouvrir Z and D Thermoliner ERP ($ErpUrl)"
  if (Test-Path $iconPath) {
    $shortcut.IconLocation = "$iconPath,0"
  }
  Write-Host '[INFO] Raccourci vers LANCER-ERP.bat (launcher non installe)'
}

$shortcut.Save()

if (Test-Path $legacyLinkPath) {
  Remove-Item $legacyLinkPath -Force
  Write-Host '[OK] Ancien raccourci supprime : Z&D Thermoliner ERP.lnk'
}

Write-Host "[OK] Raccourci Bureau : $linkPath"
