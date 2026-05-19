# LegalForge AI — Demo Presentation Script

**How to use this file:** Follow **On the slide** as a checklist. The **Describe / emphasize** section is what you say out loud. Total time: ~3 minutes.

---

## Slide 1 — Title & Hook
**On the slide**

1. **Title:** `LegalForge AI`
2. **Subtitle:** *6 AI agents swarm through contracts — parsing, detecting contradictions, checking compliance, scoring risk, negotiating better terms, and generating audit reports*
3. **Hackathon:** `JacHacks Spring 2026`
4. **Team:** `Team: [Name1], [Name2]`
5. **Visual:** LegalForge logo (hexagonal graph icon) + dark theme screenshot

**Describe / emphasize**

- "Contract review costs companies $billions in legal fees. Lawyers spend hours reading dense documents. What if 6 specialized AI agents could do it in seconds?"
- "We built LegalForge AI — the first multi-agent contract intelligence platform built natively on Jac's graph architecture."

---

## Slide 2 — The Problem
**On the slide**

1. **Slide title:** `The Problem`
2. **Four bullets:**
   - Legal contracts contain contradictions that humans miss under time pressure
   - Compliance violations hide in boilerplate — a $10K liability cap next to uncapped indemnity
   - Risk assessment is subjective — different lawyers give different opinions
   - Negotiation starts from scratch every time — no institutional memory
3. **Pull quote:** `We are not building another document reader. We are building a legal intelligence swarm.`

**Describe / emphasize**

- Give the concrete example: "In our sample NDA, Section 5.2 caps liability at $10K, but Section 6.1 says indemnification has no cap. That's a $50M contradiction that a tired lawyer might miss at 2am."
- "Every Fortune 500 company deals with this. The market is $billion+."

---

## Slide 3 — What LegalForge AI Does
**On the slide**

1. **Slide title:** `What LegalForge AI Does`
2. **One-sentence:** *Upload any contract. 6 AI agents analyze it through a knowledge graph. Get contradictions, compliance issues, risk scores, and negotiated alternatives — in seconds.*
3. **Six agent cards (use icons):**
   - 🔍 **Parser** — Decomposes into clause graph
   - ⚡ **Contradiction Walker** — Adversarial pairwise analysis
   - ⚖️ **Compliance Walker** — Statute database checking
   - 📊 **Risk Scorer** — Weighted rubric (0.0-1.0)
   - 🤝 **Negotiation Walker** — Proposer-Critic adversarial loop
   - 📋 **Report Generator** — C-suite executive summary

**Describe / emphasize**

- "Each agent is a Jac walker that traverses the knowledge graph. They don't just read text — they walk through nodes and edges."
- "The Negotiation Walker is our secret weapon — it proposes better clause language, then a critic agent attacks it. Only the surviving version gets recommended."

---

## Slide 4 — How It Works (Architecture)
**On the slide**

1. **Slide title:** `How It Works`
2. **Diagram (left to right):**
   `Contract Text` → `Parser Walker` → `Knowledge Graph (7 nodes, 8 edges)` → `3 Walkers in Parallel` → `Negotiation` → `Report`
3. **Graph schema strip:**
   `Contract → contains → Clause → contradicts → Clause`
   `Contract → defines → Definition`
   `Contract → involves → Party → binds → Obligation`

**Describe / emphasize**

- "The key insight: contracts ARE graphs. Clauses reference each other, definitions bind to obligations, parties connect through edges."
- "After parsing, three walkers run in PARALLEL — contradiction, compliance, and risk — because they're independent graph traversals."
- "Jac's `by llm()` makes each walker an AI agent. `visit [-->](?Clause)` navigates the graph. This is Object-Spatial Programming in action."

---

## Slide 5 — Live Demo Script
**On the slide**

1. **Slide title:** `Live Demo`
2. **Five numbered steps:**
   1. `Open LegalForge AI at localhost:8000`
   2. `Login as analyst (JWT authentication + RBAC)`
   3. `Select the M&A LOI ($50M acquisition) sample contract`
   4. `Click "Launch Agent Swarm" — watch 6 agents activate in real-time`
   5. `Walk through results: Knowledge Graph → Risk Heatmap → Contradictions → Proposals → Executive Report → Audit Trail`
3. **Footer:** `Backup: if live demo fails → screen recording + repo walkthrough`

**Describe / emphasize**

- Show the **agent status chips** lighting up one by one in the nav bar
- Click through each tab: "Here's the knowledge graph — see the red dashed lines? Those are contradictions the AI found."
- "The heatmap shows clause-by-clause risk at a glance. Red = critical. Click any cell for details."
- "In Proposals, you see original clause on the left, AI-negotiated version on the right. The critic found 2 weaknesses in the first proposal."
- Show the audit trail: "Every agent action is immutably logged. This is your compliance paper trail."

---

## Slide 6 — Jac Patterns & Tech Stack
**On the slide**

1. **Slide title:** `Built with Jac`
2. **Jac patterns used (code snippets):**
   - `by llm()` — AI-powered clause analysis on every agent
   - `can analyze with Clause entry` — Walker graph traversal
   - `visit [-->](?Clause)` — Graph navigation
   - `here spawn ContradictionWalker()` — Multi-agent orchestration
   - `here ++> :contradicts: ++> other_clause` — Edge creation
   - `report {...}` — Walker result reporting
3. **Stack:** `Jac (primary) · FastAPI (API layer) · OpenAI GPT-4o-mini · Canvas (graph viz)`

**Describe / emphasize**

- "Jac is not a wrapper — it IS the application. Our 6 agents, graph schema, tool functions, and auth gate are all `.jac` files."
- "The `by llm()` abstraction is incredibly powerful — you define WHAT the agent should reason about, not HOW."
- Point to the proposer-critic pattern: "This is two `by llm()` calls in sequence — propose, then critique. Adversarial AI in 10 lines of Jac."

---

## Slide 7 — What We Shipped
**On the slide**

1. **Slide title:** `What We Shipped`
2. **Done (demo-real):**
   - 6 Jac walker agents with `by llm()` reasoning
   - Knowledge graph with 7 node types, 8 edge types
   - Premium dark-theme dashboard with live graph visualization
   - JWT authentication with 3-tier RBAC (admin/analyst/viewer)
   - Risk heatmap and side-by-side clause negotiation
   - Immutable audit trail of every agent action
   - 3 pre-loaded sample contracts (NDA, SaaS, M&A)
3. **Stubbed / future:**
   - PDF/DOCX upload (currently paste-only)
   - Neo4j persistence (currently in-memory)
   - Multi-contract cross-reference

**Describe / emphasize**

- Be honest about what's real vs future. Judges respect transparency.
- "Everything you see in the demo runs live against the OpenAI API. No mock data in the analysis."

---

## Slide 8 — Impact & Differentiation
**On the slide**

1. **Slide title:** `Why This Matters`
2. **Market line:** `Global legal tech market: $28B by 2027. Contract review is the #1 pain point.`
3. **Differentiation vs existing tools:**
   - vs DocuSign CLM: `Graph-native analysis, not just clause tagging`
   - vs Harvey AI: `Multi-agent adversarial loop, not single-pass generation`
   - vs manual review: `6 agents in 30 seconds vs 1 lawyer in 4 hours`
4. **Next 30 days:**
   - `PDF/DOCX ingestion with OCR`
   - `Multi-contract cross-reference (detect conflicts across agreements)`
   - `Custom regulation modules per industry`

---

## Slide 9 — Team & Links
**On the slide**

1. **Slide title:** `Team & Links`
2. **Team:** `[Name1] — Backend & Jac Architecture` / `[Name2] — Frontend & Integration`
3. **Links:**
   - `Repo: github.com/[your-repo]`
   - `Live demo: localhost:8000 (or deployed URL)`
4. **Thank-you line:** `Thank you.`
5. **Ask:** `We want feedback on the adversarial proposer-critic pattern.`
6. **Value recap:** *LegalForge AI turns contract risk into explainable, actionable intelligence with a 6-agent AI swarm.*

---

## Speaker Notes — Q&A

- **Scale**: Currently single-contract; multi-contract cross-reference is roadmap
- **Accuracy**: GPT-4o-mini reasoning validated against sample contracts with known issues
- **Privacy**: Contract text only sent to OpenAI API; no data persistence beyond session
- **False positives**: Risk scores use weighted rubric + LLM reasoning; human-in-the-loop for final decisions
- **Why not fine-tuned model**: `by llm()` lets us swap models instantly; tested with GPT-4o-mini for speed, can upgrade to GPT-4o for accuracy
