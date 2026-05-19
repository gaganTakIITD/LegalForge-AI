"""LegalForge bootstrap loaded by service.jac.

Adds `backend/` to sys.path so walker ::py:: blocks can import the
existing Python agents (`agents.parser_agent`, `security.auth`,
`graph.models`, `data.sample_contracts`, ...) without any path
gymnastics. Also loads `backend/.env` so OPENAI_API_KEY is available.
"""

import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
_BACKEND = os.path.join(_HERE, "backend")

if _BACKEND not in sys.path:
    sys.path.insert(0, _BACKEND)

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(_BACKEND, ".env"))
except Exception:
    pass
