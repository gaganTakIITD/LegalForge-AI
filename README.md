# LegalForge AI -- Multi-Agent Contract Intelligence Platform

> Six Jac walker-agents swarm through any contract -- parsing clauses, detecting contradictions, checking compliance, scoring risk, negotiating better terms, and generating audit reports. The runtime is **Jac Cloud (`jac serve`)** -- the walkers themselves are the live REST API.

Built for **JacHacks Spring 2026** (May 15-19, virtual). Track: **Agentic AI**.

**Runs locally only** — no cloud deploy required. Clone the repo, run `install.ps1`, then `jac serve` + the React UI on your machine. API keys stay in `backend/.env` (gitignored); demo mode works without keys.

---

## Clone & run locally

```powershell
git clone https://github.com/<your-github-username>/LegalForge-AI.git
cd LegalForge-AI
.\install.ps1
# Optional: copy backend\.env.example → backend\.env and add a Gemini/OpenAI key for full LLM mode
$env:PYTHONPATH = "$pwd"
.\.venv-jac\Scripts\jac.exe serve service.jac
# New terminal:
cd frontend-ui; npm run dev
```

Open <http://localhost:3000> — login `analyst` / `analyst123`.

---

## Architecture

```
+------------------------+        +------------------------------+
|  frontend-ui (Vite)    | -----> |  Jac Cloud  (`jac serve`)    |
|  React swarm dashboard |        |  service.jac on  :8000        |
+------------------------+        +------------------------------+
                                    |  walker login
                                    |  walker get_sample / list_samples
                                    |  walker analyze   (orchestrator)
                                    |  walker health
                                    v
                          +------------------------------+
                          |  Jac walkers (agents/*.jac)  |
                          |  spawn on Contract + Clause  |
                          |  edges: contains, references,  |
                          |  modifies, contradicts,      |
                          |  governed_by + by llm()      |
                          +------------------------------+
```

- **Native language: Jac.** Analysis runs through `agents/*.jac` walkers
  spawned on the OSP graph (`Contract` → `Clause` nodes, mesh edges).
- **`service.jac`** orchestrates: `ParserAgent` → `MeshEnrichmentWalker` →
  `ContradictionWalker` → `ComplianceWalker` → `RiskScorerWalker` →
  `NegotiationWalker` → `ReportGeneratorWalker` → `GraphExportWalker`.
- **Structural rules** live in `tools/structural_rules.jac` (liability cap vs
  uncapped indemnity, ownership conflicts) — not Python mirrors.
- **Jac-native auth + sample contracts** now run inside Jac modules
  (`security/auth_gate.jac`, `jac_data/samples.jac`) with no Python bridge.
- Runtime path is fully Jac (`service.jac` + `agents/*.jac` + `tools/*.jac`).

---

## Quick start (Windows)

### 1. Install everything
```powershell
.\install.ps1
```

This:
1. Installs Python 3.12 via winget if missing (Jac runtime requires 3.12+).
2. Creates `.venv-jac` and installs `jaclang`, `byllm`, and `jac-cloud`.
3. Creates `backend\.env` from the template -- add your Gemini key there if using LLM mode.
4. Runs `npm install` in `frontend-ui/`.

### 2. Start the Jac Cloud backend  (terminal 1)
```powershell
$env:PYTHONPATH = "$pwd"
.\.venv-jac\Scripts\jac.exe serve service.jac
```
Output: `Uvicorn running on http://0.0.0.0:8000`. Interactive docs at <http://localhost:8000/docs>.

### 3. Start the UI                (terminal 2)
```powershell
cd frontend-ui
npm run dev
```
Open <http://localhost:3000>. Login `analyst / analyst123` and click any sample contract -> **Launch Agent Swarm**.

---

## Jac surface area (what judges see)

| File | What it shows |
|------|---------------|
| `service.jac` | Live runtime. `walker analyze` spawns Jac agent walkers on the graph. |
| `main.jac` | `walker AnalyzeContract` orchestrator (same spawn chain as service). |
| `agents/*.jac` | 7 walkers: parser, mesh, contradiction, compliance, risk, negotiation, export. |
| `tools/structural_rules.jac` | Deterministic cross-clause legal patterns (mesh-first). |
| `tools/clause_classifier.jac` | Shared clause taxonomy for all walkers. |
| `graph/nodes.jac` | 7 node types + 8 edge types (Object-Spatial Programming schema). |
| `tools/legal_tools.jac` | Tool functions (statute lookup, penalty calc, benchmarks). |
| `security/auth_gate.jac` | RBAC walker pattern. |

### Walker endpoints exposed by `jac serve service.jac`

| Endpoint | Walker | Purpose |
|----------|--------|---------|
| `POST /walker/login` | `login` | Auth, returns JWT |
| `POST /walker/list_samples` | `list_samples` | List demo contracts |
| `POST /walker/get_sample` | `get_sample` | Fetch sample text |
| `POST /walker/analyze` | `analyze` | Full 6-agent pipeline + UI payload |
| `POST /walker/health` | `health` | Runtime + graph stats |

Try them live at <http://localhost:8000/docs>.

---

## Demo accounts

| Username | Password    | Role    | Permissions                                |
|----------|-------------|---------|--------------------------------------------|
| admin    | admin123    | Admin   | Full access                                |
| analyst  | analyst123  | Analyst | Read + Analyze + Negotiate                 |
| viewer   | viewer123   | Viewer  | Read only                                  |

## Sample contracts

1. **Mutual NDA** -- Acme Corp & TechStart Inc (liability cap contradiction)
2. **SaaS Agreement** -- CloudForge & MegaCorp (GDPR violations)
3. **M&A Letter of Intent** -- $50M deal (unconscionable non-compete)

---

## Stack

- **Jac** + **Jac Cloud** (`jac-cloud`) -- live runtime, walkers as REST
- **byllm** -- `by llm()` ability declarations (in `agents/*.jac`)
- **Python 3.12** -- Jac runtime host
- **Gemini via byllm/litellm** (configurable)
- **React + Vite + Framer Motion** -- premium dashboard with swarm visualisation

---

## Project layout

```
JacHACS/
|-- service.jac                  # *** Jac Cloud entry: jac serve service.jac
|-- _bootstrap.py                # legacy bootstrap helper (not required in runtime path)
|-- jac.toml                     # Jac project config (byllm + serve)
|-- main.jac                     # AnalyzeContract orchestrator (Jac spec)
|-- agents/*.jac                 # 6 walker-agents (by llm())
|-- graph/nodes.jac              # OSP schema
|-- tools/legal_tools.jac        # tool functions
|-- security/auth_gate.jac       # RBAC walker
|-- jac_data/samples.jac         # Jac-native demo contracts
|-- security/auth_gate.jac       # Jac-native auth + RBAC helpers
|-- frontend-ui/                 # Vite + React swarm UI (talks to /walker/*)
|-- install.ps1 / install.sh
`-- README.md
```

---

## Deployment

Today: localhost only (`jac serve` + `npm run dev`). Hosting any Jac
Cloud instance follows the same two-process model -- expose `:8000` for
the API and serve the built `frontend-ui/dist` from any static host (or
reverse-proxy alongside `jac serve`).

---

*Built for JacHacks Spring 2026 -- May 15-19, 2026.*
