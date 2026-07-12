param(
  [string]$Configuration = 'Release'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$project = Join-Path $root 'desktop\erp-launcher\ZDThermoliner.ErpLauncher.csproj'
$outDir = Join-Path $root 'desktop\erp-launcher\publish'

Write-Host "[erp-launcher] Build $Configuration..."
$exe = Join-Path $outDir 'ZD-Thermoliner-ERP.exe'
if (Test-Path $exe) {
  Remove-Item -LiteralPath $exe -Force
}

dotnet publish $project -c $Configuration -o $outDir
if ($LASTEXITCODE -ne 0) {
  Write-Host "[ERREUR] Echec du build du launcher ERP."
  exit $LASTEXITCODE
}

if (-not (Test-Path $exe)) {
  Write-Host "[ERREUR] Executable introuvable : $exe"
  exit 1
}

Write-Host "[OK] $exe"
$sizeMb = [math]::Round((Get-Item $exe).Length / 1MB, 2)
Write-Host "     Taille : ${sizeMb} Mo"
