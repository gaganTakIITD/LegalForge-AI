# LegalForge AI
### Multi-Agent Contract Intelligence Platform
**JacHacks Spring 2026 · Agentic AI Track · May 15–19, 2026**

---

## 🧠 Inspiration

Legal contracts are the backbone of every business deal — and also the single easiest place to get burned.

A liability cap of **$10,000** buried in Section 5.2. An indemnification clause with **no cap at all** in Section 6.1. Two lawyers reviewed the same NDA. Neither flagged the contradiction. The company discovered it during litigation — after a $3M claim.

We asked one question: **What if a contract was not a document, but a knowledge graph — every clause a node, every cross-reference an edge — and specialized AI agents walked that graph instead of guessing from plain text?**

That question is LegalForge AI.

The moment we saw **Jac's Object-Spatial Programming (OSP)** model during JacHacks, it clicked. Contracts already have structure: clauses *contain* obligations, definitions *bind* to parties, sections *contradict* each other or *govern* one another. Jac's graph-native programming lets you **model that structure directly in the language** — `Contract → contains → Clause`, `Clause → contradicts → Clause`, `Party → binds → Obligation` — and then send walkers through it.

We didn't want to build another chatbot that summarizes a PDF. We wanted to build a **legal intelligence swarm**.

---

## ⚡ What It Does

**LegalForge AI** is a multi-agent contract intelligence platform built natively on **Jac Cloud**.

Upload any contract (or pick one of our demo samples) and click **Launch Agent Swarm**. Seven coordinated Jac walkers run an eight-stage pipeline, each agent a specialist:

| # | Agent Walker | What It Does |
|---|---|---|
| 1 | **ParserAgent** | Splits the raw contract text into a semantic clause graph — each clause becomes a `Clause` node attached to the `Contract` root via `contains` edges |
| 2 | **MeshEnrichmentWalker** | Detects cross-clause relationships and creates typed edges: `references`, `modifies`, `governed_by`, `defines` |
| 3 | **ContradictionWalker** | Traverses pairwise clause combinations, runs structural rules first (zero LLM cost), then calls `by llm()` only when needed — flags contradictions with a `contradicts` edge (severity, explanation, confidence) |
| 4 | **ComplianceWalker** | Maps each clause to a statute lookup table (GDPR Art. 28, UCC §2-302, FTC Act §5, CCPA 1798.100) and calls `by llm()` for nuanced compliance checks |
| 5 | **RiskScorerWalker** | Assigns a numeric risk score (0.0–1.0) to every clause and aggregates a contract-level score; risk level propagates into `Clause.risk_level` (low / medium / high / critical) |
| 6 | **NegotiationWalker** (`Forge`) | Focuses only on flagged / high-risk clauses, reads linked neighbor context from the graph, and proposes improved clause language with rationale and confidence |
| 7 | **ReportGeneratorWalker** | Produces an executive summary and audit-ready findings combining contradictions, violations, and negotiation proposals |
| 8 | **GraphExportWalker** | Serializes the enriched clause graph as a JSON payload driving the React dashboard |

### Demo Contracts (one-click for judges)

| Sample | Real Issues Surfaced |
|---|---|
| **Mutual NDA** — Acme Corp & TechStart | Liability cap ($10K, §5.2) vs uncapped indemnity (§6.1) — a direct `contradicts` edge with 93% confidence |
| **SaaS Agreement** — CloudForge & MegaCorp | Personal-data sale without consent clause triggers GDPR Art. 6 / CCPA 1798.120 violation at `critical` severity |
| **M&A Letter of Intent** — $50M deal | Unconscionable non-compete clause, missing governing-law provisions, aggressive renewal terms |

### Walker API (live at `localhost:8000/docs`)

| Endpoint | Walker | Purpose |
|---|---|---|
| `POST /walker/login` | `login` | JWT authentication |
| `POST /walker/list_samples` | `list_samples` | List demo contracts |
| `POST /walker/get_sample` | `get_sample` | Fetch sample text |
| `POST /walker/analyze` | `analyze` | Full 7-agent pipeline + UI payload |
| `POST /walker/health` | `health` | Runtime + graph stats |

Try them live at **<http://localhost:8000/docs>** after `jac serve service.jac`.  
Login: `analyst` / `analyst123`

---

## 🏗️ How We Built It

### The Core Insight: Walkers *Are* the API

In standard agentic AI, you write Python orchestration code that calls agents. In LegalForge AI, the **Jac walkers themselves are the REST endpoints**. `jac serve service.jac` exposes every walker as a production HTTP route — the code judges read in `agents/*.jac` is the live API at `/walker/analyze`.

```
frontend-ui (React + Vite + Framer Motion)
        │  HTTP POST /walker/*
        ▼
Jac Cloud (jac serve service.jac  :8000)
        │  walker analyze orchestrates
        ▼
Contract + Clause OSP Graph
        │  walkers spawn + traverse
        ▼
agents/*.jac · tools/*.jac · graph/nodes.jac
```

### The OSP Graph Schema (`graph/nodes.jac`)

Seven node types, ten edge types — designed so every legal relationship has a first-class representation:

**Nodes:** `Contract`, `Clause`, `Definition`, `Party`, `Obligation`, `AuditEntry`, `UserSession`

**Edges:** `contains`, `defines`, `involves`, `modifies`, `contradicts` *(with severity + confidence)*, `references`, `exempts`, `binds`, `governed_by`, `audited_by`

The `contradicts` edge is the heart of the system: when `ContradictionWalker` finds a conflict, it **writes an edge directly into the graph** — `here +>:contradicts(severity="direct", explanation="...", confidence=0.93):+> prev_clause`. Every downstream agent (Risk, Negotiation) can read that edge without re-running the LLM.

### Agent Architecture

**Structural Rules First.** `tools/structural_rules.jac` implements deterministic legal pattern matching (liability-cap-vs-uncapped-indemnity, ownership conflicts, survival clauses) in pure Jac. The `ContradictionWalker` runs structural rules on every clause pair *before* calling the LLM. This eliminates unnecessary quota consumption and ensures the most legally certain findings are rock-solid.

**`by llm()` for Reasoning.** Where deterministic rules can't decide, `by llm()` activates — scoped to a single clause or clause pair, never the full document. This keeps the LLM focused and attributable. Every finding carries a `confidence` float and points to specific `clause_id`s.

**Shared Clause Taxonomy.** `tools/clause_classifier.jac` defines a shared vocabulary (`liability`, `indemnification`, `ip_assignment`, `data_processing`, `non_compete`, etc.) used by every agent. When `ContradictionWalker` classifies a clause, that `clause_kind` is written to the `Clause` node and reused by `ComplianceWalker`, `RiskScorerWalker`, and `NegotiationWalker` — no re-classification.

**RBAC Auth Gate.** `security/auth_gate.jac` implements role-based access control as a Jac walker pattern. Three tiers: `admin` (full access), `analyst` (read + analyze + negotiate), `viewer` (read-only). JWT tokens are issued by the `login` walker and validated in-graph.

### The Full Orchestration Chain

```
walker analyze (service.jac)
  └─▶ ParserAgent           → Contract node + N Clause nodes
  └─▶ MeshEnrichmentWalker  → typed edges between clauses
  └─▶ ContradictionWalker   → contradicts edges + findings[]
  └─▶ ComplianceWalker      → violations[] (statute-mapped)
  └─▶ RiskScorerWalker      → risk_score per clause + overall
  └─▶ NegotiationWalker     → proposals[] for flagged clauses
  └─▶ ReportGeneratorWalker → executive_summary
  └─▶ GraphExportWalker     → JSON payload → React dashboard
```

### Frontend (`frontend-ui/`)

Built with **React + Vite + Framer Motion**:
- **Landing.jsx** — animated hero with live graph particle background
- **Login.jsx** — JWT auth flow
- **Dashboard.jsx** — multi-tab analysis workspace: Knowledge Graph, Risk Heatmap, Contradictions, Proposals, Executive Report, Audit Trail
- **ForceGraph.jsx** — D3-style force-directed graph of clause nodes and typed edges
- **Workspace.jsx** — contract upload / sample selection

### Stack

| Layer | Technology |
|---|---|
| Language & Runtime | **Jac** + **Jac Cloud** (`jac-cloud`) |
| AI Abilities | **byllm** · Gemini via LiteLLM (configurable) |
| Host Language | Python 3.12 |
| UI | React · Vite · Framer Motion |
| Install | `install.ps1` / `install.sh` |

---

## 🚧 Challenges We Ran Into

**1. Mapping legal structure to OSP without overfitting.**  
The first graph schema had 15 node types. Real contracts break those assumptions within 5 minutes. We iterated down to 7 nodes with 10 edge types — expressive enough to capture real cross-clause logic, stable enough to survive diverse contract formats.

**2. Attribution vs. hallucination.**  
The hard requirement: every finding must point to a specific `clause_id`, not a generic summary. Achieving this with `by llm()` required careful prompt engineering — returning `{clause_a, clause_b, explanation, confidence}` JSON — and a fallback to structural rules when the LLM returns vague output.

**3. Scaling contradiction detection.**  
Pairwise clause comparison is O(n²). For a 30-clause contract, that's 435 pairs — too many LLM calls for a live demo. Solution: structural rules handle obvious cases (cap vs. uncapped indemnity) in microseconds; the LLM is only called for clause pairs that pass a `_should_compare()` filter based on clause kind and graph linkage.

**4. Building a fully Jac-native path.**  
Early versions had Python bridges for auth, sample data, and orchestration. We progressively migrated everything into `.jac` — `security/auth_gate.jac`, `jac_data/samples.jac`, the full `service.jac` walker chain — so `jac serve service.jac` is the **single runtime truth**. No Python bootstrap needed.

**5. Demo stability under quota pressure.**  
LLM quota exhaustion mid-demo is a showstopper. We implemented a deterministic fallback mode: the `analyze` walker defaults to structural-rule-only analysis, guarantees a complete graph export payload, and clearly signals `"runtime": "jac-walkers"` in its response. Judges always see a working dashboard.

**6. Learning Jac under hackathon pressure.**  
Both of us came in knowing Python but not Jac. The OSP model, `by llm()` syntax, `visit [-->]` traversal, and `jac serve` deployment model were all new. The hackathon was a steep but rewarding ramp — by Day 3 we were writing walkers instinctively.

---

## 🏆 Accomplishments We're Proud Of

- **End-to-end Jac stack.** Analysis, auth, samples, and REST API all run through Jac walkers on Jac Cloud — no Python bridge in the runtime path.
- **Seven specialized agents coordinating on a shared clause knowledge graph** — each walker reads and writes graph state, so findings from one agent propagate to the next for free.
- **Real issues in demo contracts.** The NDA's liability/indemnity contradiction, the SaaS GDPR violation, and the M&A non-compete are real legal patterns — not toy examples.
- **Structural rules in Jac.** Deterministic legal patterns live in `tools/structural_rules.jac`. They're faster, cheaper, and more reliable than LLM calls for the patterns legal engineers can specify precisely.
- **Walkers as REST.** `jac serve` exposes the agent swarm as production endpoints — the same code the agent is the API. Judges can hit `/walker/analyze` in Swagger UI and see the live JSON.
- **Graph-aware negotiation.** `NegotiationWalker` reads linked neighbor context (`[<-->]` and `[-:references:->]`) before proposing redlines — it knows *why* a clause is risky, not just *that* it is.
- **Premium swarm dashboard.** Animated landing, live agent status chips, D3-force knowledge graph with color-coded edge types, clause risk heatmap, side-by-side redline viewer.
- **Immutable audit trail.** Every agent action writes an `AuditEntry` node to the graph. Compliance teams can replay exactly what was flagged, by which agent, at what confidence.

---

## 📚 What We Learned

**Graph-first beats document-first for contracts.** Cross-clause logic — the liability cap that negates the indemnity, the termination clause that contradicts the survival clause — only emerges when clauses are nodes and conflicts are edges. Flat text search misses it structurally.

**Small walkers, one job each.** Jac's spawn/orchestrate model maps perfectly to agentic pipelines. A walker that does one thing (parse, or detect contradictions, or score risk) is easier to debug, easier to test, and composable without re-architecture.

**`by llm()` + graph traversal is a superpower.** The LLM reasoning is most accurate when scoped to a single clause or edge, not an entire 40-page document. `visit [-->](?Clause)` + `by llm()` is the core loop of every agent in LegalForge AI.

**Structural rules and LLMs are complements, not substitutes.** Deterministic rules catch obvious contradictions instantly and cheaply. The LLM handles nuance (does this warranty clause *actually* conflict with this indemnity given the jurisdiction?). The right system uses both in sequence.

**Jac Cloud changes the demo story.** In most hackathon AI projects, the "agent" is a Python class and the "API" is a Flask wrapper. In LegalForge AI, the walker *is* the API. That's not just a technical detail — it's a fundamentally different mental model for agentic software.

**Explainability wins trust in legal tech.** Users don't trust "this clause is risky." They trust "Section 5.2 caps liability at $10K while Section 6.1 removes that cap — here is the exact text of both." Every finding in LegalForge AI is attributed to specific clause IDs, specific statutes, and a confidence score.

---

## 🚀 What's Next for LegalForge AI

- **PDF / DOCX upload** with OCR and automatic clause segmentation (currently paste-only)
- **Persistent graph storage** — export today; Neo4j or Jac-native persistence for clause history and version-diffing
- **Multi-contract portfolio view** — detect conflicts across MSAs, NDAs, and amendments on the same deal
- **Custom regulation packs** — industry-specific compliance modules (healthcare HIPAA, finance SOX, EU AI Act)
- **Adversarial proposer-critic loop** — current `NegotiationWalker` proposes once; next version spawns a critic walker to attack the proposal and only surfaces the hardened version
- **Integrations** — DocuSign, Ironclad, and CLM platforms to push AI-generated redlines directly into the signing workflow
- **Hosted deployment** — single `jac serve` + static UI behind a public URL for production pilots

---

## 🛠️ Built With

- [**Jac**](https://www.jac-lang.org/) — primary language for all agents, graph schema, auth, and API
- **Jac Cloud** (`jac-cloud`) — `jac serve` runtime, walkers as REST endpoints
- **byllm** — `by llm()` ability declarations for AI-powered walker steps
- **LiteLLM / Gemini** — LLM backend (configurable; works with any LiteLLM-compatible model)
- **Python 3.12** — Jac runtime host
- **React + Vite** — frontend dashboard
- **Framer Motion** — UI animations and transitions
- **D3.js** — force-directed knowledge graph visualization

---

## 🚀 Try It Yourself

```powershell
git clone https://github.com/YOUR_USERNAME/LegalForge-AI.git
cd LegalForge-AI
.\install.ps1

# Terminal 1 — Jac Cloud backend
$env:PYTHONPATH = "$pwd"
.\.venv-jac\Scripts\jac.exe serve service.jac   # → :8000

# Terminal 2 — React dashboard
cd frontend-ui
npm run dev                                       # → :3000
```

Open **<http://localhost:3000>** — login `analyst` / `analyst123` — pick a sample contract — click **Launch Agent Swarm**.

Interactive API docs at **<http://localhost:8000/docs>**.

---

*JacHacks Spring 2026 — Agentic AI Track — May 15–19, 2026*
