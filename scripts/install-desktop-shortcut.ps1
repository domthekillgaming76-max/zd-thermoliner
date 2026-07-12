param(
  [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot),
  [string]$ErpUrl = 'https://erp.zd-thermoliner.fr'
)

$ErrorActionPreference = 'Stop'

$batPath = Join-Path $ProjectRoot 'LANCER-ERP.bat'
if (-not (Test-Path $batPath)) {
  Write-Host "[ERREUR] LANCER-ERP.bat introuvable : $batPath"
  exit 1
}

$iconPath = Join-Path $ProjectRoot 'public\icons\desktop-shortcut.ico'
if (-not (Test-Path $iconPath)) {
  Write-Host "[ATTENTION] Icone introuvable : $iconPath"
  $iconPath = $null
}

$desktop = [Environment]::GetFolderPath('Desktop')
$linkPath = Join-Path $desktop 'Z&D Thermoliner ERP.lnk'

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($linkPath)
$shortcut.TargetPath = $batPath
$shortcut.WorkingDirectory = $ProjectRoot
$shortcut.WindowStyle = 1
$shortcut.Description = "Ouvrir Z&D Thermoliner ERP ($ErpUrl)"
if ($iconPath) {
  $shortcut.IconLocation = "$iconPath,0"
}
$shortcut.Save()

Write-Host "[OK] Raccourci Bureau mis a jour :"
Write-Host "     $linkPath"
if ($iconPath) {
  Write-Host "     Icone : $iconPath"
}
Write-Host "     URL : $ErpUrl"
