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
      $_.Name -match 'Z&D|Thermoliner|ZD ERP|Z&D ERP'
    }
    if ($candidates) {
      return $candidates | Select-Object -First 1
    }
  }
  return $null
}

$pwaShortcut = Find-InstalledPwaShortcut

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($linkPath)

if ($pwaShortcut) {
  $existing = $shell.CreateShortcut($pwaShortcut.FullName)
  $shortcut.TargetPath = $existing.TargetPath
  $shortcut.Arguments = $existing.Arguments
  $shortcut.WorkingDirectory = $existing.WorkingDirectory
  $shortcut.Description = "Z&D Thermoliner ERP (application installee)"
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
  $shortcut.Description = "Ouvrir Z&D Thermoliner ERP ($ErpUrl) — installez via Edge/Chrome pour l'app Windows"
  if (Test-Path $iconPath) {
    $shortcut.IconLocation = "$iconPath,0"
  }
  Write-Host "[INFO] PWA non installee — raccourci vers LANCER-ERP.bat (mode fenetre legere)"
  Write-Host "       Installez l'ERP depuis Edge/Chrome : menu -> Installer Z&D ERP"
}

$shortcut.Save()

Write-Host "[OK] Raccourci Bureau : $linkPath"
Write-Host "     URL : $ErpUrl"
