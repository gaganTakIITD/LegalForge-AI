# LegalForge AI — Devpost Submission

**Track:** Agentic AI · **Event:** JacHacks Spring 2026

LegalForge AI turns contracts into a clause graph and deploys six Jac walkers to find contradictions, compliance gaps & deal risk — every finding tied to a clause, not guesses. Verdict before you sign. Built on Jac.

---

## Inspiration

Contract review breaks down on the details buried deep in the stack. A lawyer skims page 40 at 11 PM; a chatbot summarizes the whole PDF but cannot prove which clause it read — and neither reliably catches when **Section 5 caps liability at $10K while Section 6 indemnifies with no limit**.

We asked: what if a contract were not a document, but a **graph** — every clause a node, every cross-reference an edge — and **specialized agents walked that graph** instead of guessing from plain text?

Jac's Object-Spatial Programming (OSP) made that natural: contracts already have structure (`contains`, `references`, `contradicts`, `governed_by`). LegalForge **forges** that structure, then sends a swarm of Jac walkers to hunt contradictions, compliance traps, and deal-killing risk — with **attributed findings**, not a black-box paragraph.

---

## What it does

**LegalForge AI** is a multi-agent contract intelligence platform built natively on **Jac Cloud**.

Upload a contract (or pick a demo) and click **Launch Agent Swarm**. Six coordinated Jac walkers run a full pipeline:

1. **Parser** — splits the contract into clause nodes on an OSP graph
2. **Mesh enrichment** — links clauses (`references`, `modifies`, `governed_by`, etc.)
3. **Contradiction detection** — finds conflicting obligations (e.g. liability cap vs. uncapped indemnity)
4. **Compliance** — flags gaps against regulatory patterns (GDPR, and more)
5. **Risk scoring** — weighted severity per clause and contract-level score
6. **Negotiation** — suggests improved clause language
7. **Report export** — executive summary and audit-ready output

The **React swarm dashboard** (`frontend-ui`) visualizes the live pipeline: agent status, risk heatmap, graph mesh, and side-by-side clause comparisons.

**Demo contracts** (one-click for judges):

| Sample | What it surfaces |
|--------|------------------|
| Mutual NDA | Liability cap vs. uncapped indemnity contradiction |
| SaaS Agreement | GDPR / compliance violations |
| M&A Letter of Intent | Unconscionable non-compete on a $50M deal |

**Try it:** `analyst` / `analyst123` → pick a sample → **Launch Agent Swarm**.

Walker API (live at `http://localhost:8000/docs` after `jac serve`):

| Endpoint | Purpose |
|----------|---------|
| `POST /walker/login` | JWT auth |
| `POST /walker/list_samples` | Demo contracts |
| `POST /walker/analyze` | Full agent pipeline + UI payload |
| `POST /walker/health` | Runtime + graph stats |

---

## How we built it

### Jac-native runtime (the walkers *are* the API)

```
frontend-ui (React + Vite)  →  Jac Cloud (`jac serve service.jac` :8000)
                                      ↓
                         walkers spawn on Contract + Clause graph
                         agents/*.jac  +  tools/*.jac  +  graph/nodes.jac
```

- **`service.jac`** — Jac Cloud entry point; `walker analyze` orchestrates the full spawn chain
- **`agents/*.jac`** — seven walkers with `by llm()` for AI-powered steps
- **`graph/nodes.jac`** — 7 node types, 8 edge types (OSP schema)
- **`tools/structural_rules.jac`** — deterministic cross-clause legal patterns (mesh-first, not Python mirrors)
- **`tools/clause_classifier.jac`** — shared taxonomy for all agents
- **`tools/legal_tools.jac`** — statute lookup, penalty calc, benchmarks
- **`security/auth_gate.jac`** — RBAC (admin / analyst / viewer)
- **`jac_data/samples.jac`** — demo contracts, no Python bridge

### Orchestration flow

`ParserAgent` → `MeshEnrichmentWalker` → `ContradictionWalker` → `ComplianceWalker` → `RiskScorerWalker` → `NegotiationWalker` → `ReportGeneratorWalker` → `GraphExportWalker`

### Stack

| Layer | Tech |
|-------|------|
| Language & runtime | **Jac** + **Jac Cloud** (`jac-cloud`) |
| LLM | **byllm** / Gemini via LiteLLM (configurable) |
| Host | Python 3.12 |
| UI | React, Vite, Framer Motion |
| Install | `install.ps1` / `install.sh` |

### Quick start

```powershell
.\install.ps1
$env:PYTHONPATH = "$pwd"
.\.venv-jac\Scripts\jac.exe serve service.jac   # terminal 1 → :8000
cd frontend-ui; npm run dev                      # terminal 2 → :3000
```

---

## Challenges we ran into

- **Mapping legal structure to OSP** — designing node/edge types that capture real clause relationships without overfitting to one contract format
- **Attribution vs. hallucination** — ensuring every finding points to a specific clause on the graph, not a generic LLM summary
- **Scaling contradiction checks** — clause-pair analysis is expensive; we combined structural rules in Jac with targeted LLM passes
- **Fully Jac-native path** — migrating auth, samples, and orchestration off Python bridges so `jac serve service.jac` is the single runtime truth
- **Judge-ready demos** — reliable one-click login, curated samples, and a UI that tells the swarm story under time pressure

---

## Accomplishments that we're proud of

- **End-to-end Jac stack** — analysis, auth, samples, and API all run through Jac walkers on Jac Cloud
- **Six specialized agents** coordinating on a shared clause knowledge graph
- **Real issues in demo contracts** — liability/indemnity contradictions, GDPR gaps, aggressive non-competes
- **Structural rules in Jac** — deterministic legal patterns live in `structural_rules.jac`, not duplicated in Python
- **Walkers as REST** — `jac serve` exposes the agent swarm as production endpoints judges can hit in `/docs`
- **Premium swarm UI** — live agent visualization, risk heatmap, and attributed findings
- **Voice-guided demo video** — cinematic intro + narrated UI walkthrough for submission

---

## What we learned

- **Graph-first beats document-first** for contracts — cross-clause logic only emerges when clauses are nodes and conflicts are edges
- **Small walkers, one job each** — Jac's spawn/orchestrate model maps cleanly to agentic pipelines (parse → enrich → verify → score → negotiate → report)
- **`by llm()` + graph traversal** — LLM reasoning works best when scoped to a clause or edge, not an entire 40-page PDF at once
- **Jac Cloud changes the demo story** — the same walkers judges read in `agents/*.jac` are the live API at `/walker/analyze`
- **Explainability wins trust** — legal users need proof ("Section 5 vs. Section 6"), not vibes

---

## What's next for LegalForge AI

- **PDF/DOCX upload** with OCR and automatic clause segmentation
- **Persistent graph storage** (export today; Neo4j or Jac-native persistence next)
- **Multi-contract portfolio view** — conflicts across MSAs, NDAs, and amendments on the same deal
- **Custom regulation packs** — industry-specific compliance modules teams can plug in
- **Integrations** — DocuSign, Ironclad, and CLM export for findings → redlines
- **Hosted deployment** — single `jac serve` + static UI behind a public URL for production pilots

---

## Built With

- [Jac](https://www.jac-lang.org/) · Jac Cloud · byllm
- Python 3.12
- Gemini (via LiteLLM)
- React · Vite · Framer Motion

---

*JacHacks Spring 2026 — Agentic AI track*
