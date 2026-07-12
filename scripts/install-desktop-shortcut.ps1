param(
  [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot),
  [string]$ErpUrl = 'https://erp.zd-thermoliner.fr'
)

$ErrorActionPreference = 'Stop'

$desktop = [Environment]::GetFolderPath('Desktop')
$linkPath = Join-Path $desktop 'Z&D Thermoliner ERP.lnk'
$iconPath = Join-Path $ProjectRoot 'public\icons\desktop-shortcut.ico'
$batPath = Join-Path $ProjectRoot 'LANCER-ERP.bat'

function Find-InstalledPwaShortcut {
  $patterns = @(
    (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\*.lnk'),
    (Join-Path $env:ProgramData 'Microsoft\Windows\Start Menu\Programs\*.lnk')
  )

  foreach ($pattern in $patterns) {
    $candidates = Get-ChildItem -Path $pattern -ErrorAction SilentlyContinue | Where-Object {
      $_.Name -match 'Thermoliner|ZD ERP'
    }
    if ($candidates) {
      return $candidates | Select-Object -First 1
    }
  }
  return $null
}

$pwaShortcut = Find-InstalledPwaShortcut

$nativeLauncher = Join-Path $env:LOCALAPPDATA 'Programs\ZD-Thermoliner-ERP\ZD-Thermoliner-ERP.exe'
$localLauncher = Join-Path $ProjectRoot 'desktop\erp-launcher\publish\ZD-Thermoliner-ERP.exe'
$downloadLauncher = Join-Path $env:USERPROFILE 'Downloads\ZD-Thermoliner-ERP-Windows-1.0.0.exe'

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($linkPath)

if (Test-Path $nativeLauncher) {
  $shortcut.TargetPath = $nativeLauncher
  $shortcut.WorkingDirectory = Split-Path $nativeLauncher
  $shortcut.Description = 'Z and D Thermoliner ERP (launcher natif)'
  if (Test-Path $iconPath) { $shortcut.IconLocation = "$iconPath,0" }
  Write-Host "[OK] Raccourci launcher natif : $nativeLauncher"
} elseif (Test-Path $localLauncher) {
  $shortcut.TargetPath = $localLauncher
  $shortcut.WorkingDirectory = Split-Path $localLauncher
  $shortcut.Description = 'Z and D Thermoliner ERP (launcher natif local)'
  if (Test-Path $iconPath) { $shortcut.IconLocation = "$iconPath,0" }
  Write-Host '[OK] Raccourci launcher natif (build local)'
} elseif (Test-Path $downloadLauncher) {
  $shortcut.TargetPath = $downloadLauncher
  $shortcut.WorkingDirectory = Split-Path $downloadLauncher
  $shortcut.Description = 'Z and D Thermoliner ERP (launcher telecharge)'
  if (Test-Path $iconPath) { $shortcut.IconLocation = "$iconPath,0" }
  Write-Host "[OK] Raccourci launcher telecharges : $downloadLauncher"
} elseif ($pwaShortcut) {
  $existing = $shell.CreateShortcut($pwaShortcut.FullName)
  $shortcut.TargetPath = $existing.TargetPath
  $shortcut.Arguments = $existing.Arguments
  $shortcut.WorkingDirectory = $existing.WorkingDirectory
  $shortcut.Description = 'Z and D Thermoliner ERP (application installee)'
  if ($existing.IconLocation) {
    $shortcut.IconLocation = $existing.IconLocation
  }
  Write-Host "[OK] Raccourci PWA installe detecte : $($pwaShortcut.Name)"
} else {
  if (-not (Test-Path $batPath)) {
    Write-Host "[ERREUR] LANCER-ERP.bat introuvable : $batPath"
    exit 1
  }
  $shortcut.TargetPath = $batPath
  $shortcut.WorkingDirectory = $ProjectRoot
  $shortcut.WindowStyle = 1
  $shortcut.Description = "Ouvrir Z and D Thermoliner ERP ($ErpUrl)"
  if (Test-Path $iconPath) {
    $shortcut.IconLocation = "$iconPath,0"
  }
  Write-Host '[INFO] Raccourci vers LANCER-ERP.bat (mode fenetre legere)'
  Write-Host '       Astuce : telechargez le launcher natif dans Parametres - Aide'
}

$shortcut.Save()

Write-Host "[OK] Raccourci Bureau : $linkPath"
Write-Host "     URL : $ErpUrl"
