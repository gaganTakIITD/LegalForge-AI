# LegalForge AI -- one-command install (Windows PowerShell)
# Usage:  .\install.ps1

$ErrorActionPreference = "Stop"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  LegalForge AI -- Jac Cloud setup" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# 1) Python 3.12 (Jac runtime requires 3.12+)
$py = $null
try {
    $ver = (& py -3.12 --version) 2>&1
    if ($ver -match "Python 3\.(1[2-9]|[2-9]\d)") {
        $py = "py -3.12"
        Write-Host "[1/4] $ver detected" -ForegroundColor Green
    }
} catch {}
if (-not $py) {
    Write-Host "[1/4] Python 3.12 not found. Installing via winget..." -ForegroundColor Yellow
    winget install --id Python.Python.3.12 -e --accept-source-agreements --accept-package-agreements --silent
    $py = "py -3.12"
}

# 2) venv-jac with jaclang + byllm + jac-cloud
if (-not (Test-Path ".venv-jac")) {
    Write-Host "[2/4] Creating venv-jac (Python 3.12) ..." -ForegroundColor Yellow
    & py -3.12 -m venv .venv-jac
}
$pip = ".\.venv-jac\Scripts\python.exe -m pip"
Write-Host "[2/4] Installing Jac toolchain ..." -ForegroundColor Yellow
& .\.venv-jac\Scripts\python.exe -m pip install --upgrade pip --quiet
& .\.venv-jac\Scripts\python.exe -m pip install --only-binary=:all: --no-cache-dir `
    jaclang byllm jac-cloud python-dotenv `
    --quiet

# 3) .env (Gemini key if using LLM mode)
if (-not (Test-Path "backend\.env")) {
    Write-Host "[3/4] Creating backend\.env from template ..." -ForegroundColor Yellow
    Copy-Item "backend\.env.example" "backend\.env"
    Write-Host "  >> Edit backend\.env and add your GEMINI_API_KEY / GOOGLE_API_KEY" -ForegroundColor Magenta
} else {
    Write-Host "[3/4] backend\.env already exists" -ForegroundColor Green
}

# 4) Frontend deps
if (-not (Test-Path "frontend-ui\node_modules")) {
    Write-Host "[4/4] Installing frontend-ui deps ..." -ForegroundColor Yellow
    Push-Location frontend-ui
    npm install --silent
    Pop-Location
} else {
    Write-Host "[4/4] frontend-ui\node_modules already present" -ForegroundColor Green
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Setup complete." -ForegroundColor Green
Write-Host ""
Write-Host "  Start the Jac Cloud backend (terminal 1):" -ForegroundColor White
Write-Host "    .\start-jac.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "  Start the React UI (terminal 2):" -ForegroundColor White
Write-Host "    cd frontend-ui; npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "  Open: http://localhost:3000   Login: analyst / analyst123" -ForegroundColor White
Write-Host "================================================" -ForegroundColor Cyan
