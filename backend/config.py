"""LegalForge AI — Configuration & Environment Setup."""

import os
from dotenv import load_dotenv

load_dotenv()

# LLM Provider (OpenAI-compatible).
#
# Works with:
#   - OpenAI: just set OPENAI_API_KEY (default base URL).
#   - Google Gemini (OpenAI-compat): set OPENAI_API_KEY=<your Gemini key>,
#     OPENAI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/,
#     LLM_MODEL=gemini-2.0-flash  (or gemini-1.5-flash, gemini-2.5-flash, ...).
#   - Any other OpenAI-compatible provider (Groq, Together, Fireworks, ...):
#     set OPENAI_API_KEY + OPENAI_BASE_URL + LLM_MODEL.
#
# When OPENAI_API_KEY is empty the agent pipeline gracefully falls back to
# deterministic demo data baked into llm_client.py (handy for offline demos).
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "")

# JWT Auth
JWT_SECRET = os.getenv("JWT_SECRET", "legalforge-hackathon-secret-2026")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# LLM Model
LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4o-mini")

# Server
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))
