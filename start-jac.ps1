# LegalForge AI — Jac-native backend (official runtime for judges)
# Terminal 1:  .\start-jac.ps1
# Terminal 2:  cd frontend-ui; npm run dev
# Browser:     http://localhost:3000  — analyst / analyst123

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "LegalForge Jac backend (service.jac + agents/*.jac) on port 8000" -ForegroundColor Cyan
Write-Host "UI:  cd frontend-ui; npm run dev  ->  http://localhost:3000" -ForegroundColor Yellow
Write-Host "Do NOT run another server on port 8000." -ForegroundColor Yellow

$jac = ".\.venv-jac\Scripts\jac.exe"
if (-not (Test-Path $jac)) {
    Write-Host "Missing .venv-jac — run .\install.ps1 first." -ForegroundColor Red
    exit 1
}

Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }

$env:PYTHONPATH = $PSScriptRoot
$env:PYTHONIOENCODING = "utf-8"
$env:PYTHONUTF8 = "1"

& $jac serve service.jac
