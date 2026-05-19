#!/bin/bash
# LegalForge AI -- one-command install (Linux / macOS / WSL)
# Usage:  bash install.sh

set -e

echo "================================================"
echo "  LegalForge AI -- Jac Cloud setup"
echo "================================================"

# 1) Python 3.12 (Jac runtime requires 3.12+)
if command -v python3.12 &> /dev/null; then
    PY=python3.12
elif command -v python3 &> /dev/null && python3 -c 'import sys; sys.exit(0 if sys.version_info >= (3,12) else 1)'; then
    PY=python3
else
    echo "ERROR: Python 3.12+ is required."
    echo "  Install:  https://www.python.org/downloads/   (or use pyenv / apt / brew)"
    exit 1
fi
echo "[1/4] Using $($PY --version)"

# 2) venv-jac + jaclang + byllm + jac-cloud
if [ ! -d .venv-jac ]; then
    echo "[2/4] Creating .venv-jac ..."
    $PY -m venv .venv-jac
fi
. .venv-jac/bin/activate
python -m pip install --upgrade pip --quiet
echo "[2/4] Installing Jac toolchain ..."
python -m pip install --only-binary=:all: --no-cache-dir \
    jaclang byllm jac-cloud python-dotenv \
    --quiet

# 3) .env
if [ ! -f backend/.env ]; then
    echo "[3/4] Creating backend/.env from template ..."
    cp backend/.env.example backend/.env
    echo "  >> Edit backend/.env and add your GEMINI_API_KEY / GOOGLE_API_KEY"
else
    echo "[3/4] backend/.env already exists"
fi

# 4) Frontend deps
if [ ! -d frontend-ui/node_modules ]; then
    echo "[4/4] Installing frontend-ui deps ..."
    (cd frontend-ui && npm install --silent)
else
    echo "[4/4] frontend-ui/node_modules already present"
fi

echo ""
echo "================================================"
echo "  Setup complete."
echo ""
echo "  Start the Jac Cloud backend (terminal 1):"
echo "    export PYTHONPATH=\"\$(pwd)\""
echo "    .venv-jac/bin/jac serve service.jac"
echo ""
echo "  Start the React UI (terminal 2):"
echo "    cd frontend-ui && npm run dev"
echo ""
echo "  Open: http://localhost:3000   Login: analyst / analyst123"
echo "================================================"
