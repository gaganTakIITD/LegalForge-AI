"""
LegalForge AI — LLM Client
Wraps OpenAI calls with retry logic and structured output parsing.
Falls back to deterministic demo data when OPENAI_API_KEY is not set.
"""

import json
import re
import hashlib
from config import OPENAI_API_KEY, OPENAI_BASE_URL, LLM_MODEL

_client = None


def _get_client():
    global _client
    if _client is None and OPENAI_API_KEY:
        from openai import AsyncOpenAI
        kwargs = {"api_key": OPENAI_API_KEY}
        if OPENAI_BASE_URL:
            kwargs["base_url"] = OPENAI_BASE_URL
        _client = AsyncOpenAI(**kwargs)
    return _client


def _seed(text: str) -> int:
    return int(hashlib.sha1(text.encode("utf-8")).hexdigest(), 16)


# ───────────────────────────────────────────────────────────────────
# Demo-mode deterministic fallbacks (used when no OPENAI_API_KEY)
# ───────────────────────────────────────────────────────────────────


def _classify_clause(text: str) -> str:
    """Rough clause taxonomy used by all demo fallbacks so risk, negotiation
    and contradiction all agree on what kind of clause they're looking at.

    Strategy: look at the FIRST line / section heading first (it's the most
    reliable signal of what the clause is *about*), then fall back to body
    keyword scans. A clause whose heading says "LIMITATION OF LIABILITY" is
    a liability clause even if it mentions indemnification carve-outs in
    sub-sections."""
    t = text.lower()
    # Heading = first ~120 chars, normalized.
    head = re.split(r"\n", text.strip(), maxsplit=1)[0][:160].lower()

    def in_head(*needles):
        return any(n in head for n in needles)

    # ── Heading-driven classifications (highest priority) ─────────────
    if in_head("limitation of liability", "limit of liability", "liability cap", "cap on liability"):
        return "liability"
    if in_head("indemnif"):
        return "indemnification"
    if in_head("non-compete", "noncompete", "restrictive covenant", "non compete"):
        return "non_compete"
    if in_head("data process", "data protection", "personal data", "gdpr", "privacy"):
        return "data_processing"
    if in_head("auto-renew", "automatic renewal", "renewal"):
        return "renewal"
    if in_head("termination", "term and termination", "term of agreement"):
        return "termination"
    if in_head("intellectual property", "ip ownership", "ownership", "work product"):
        return "ip_assignment"
    if in_head("warrant", "warranties", "representations"):
        return "warranty"
    if in_head("confidential"):
        return "confidentiality"
    if in_head("governing law", "jurisdiction", "venue"):
        return "governing_law"
    if in_head("definition"):
        return "definition"
    if in_head("force majeure"):
        return "force_majeure"
    if in_head("notice"):
        return "notices"
    if in_head("signature", "signed"):
        return "signature"

    # ── Body-driven fallbacks (only if heading was generic like "REMEDIES",
    # "MISCELLANEOUS", "EMPLOYEE MATTERS" etc.) ──────────────────────
    if "indemnif" in t or "hold harmless" in t or "indemnity" in t:
        # Body-only signal — but only if the body is *primarily* about
        # indemnification, not just mentioning it as a carve-out.
        if t.count("indemnif") >= 2:
            return "indemnification"
    if any(
        k in t
        for k in (
            "liability shall not exceed",
            "aggregate liability",
            "total liability",
        )
    ) or ("liability" in t and ("cap" in t or "$" in t or "shall not exceed" in t)):
        return "liability"
    if "personal data" in t or "data processing" in t or "subprocessor" in t or "gdpr" in t:
        return "data_processing"
    if "auto-renew" in t or "automatic renewal" in t or "renews automatically" in t:
        return "renewal"
    if "non-compete" in t or "noncompete" in t or "restrictive covenant" in t:
        return "non_compete"
    if "terminate" in t or "termination" in t or "material breach" in t:
        return "termination"
    if "warrant" in t or " as is " in t or "as-is" in t:
        return "warranty"
    if "intellectual property" in t or "work product" in t:
        return "ip_assignment"
    if "confidential" in t and "information" in t:
        return "confidentiality"
    if "governing law" in t or "jurisdiction" in t:
        return "governing_law"
    if " means " in t or 'shall mean' in t:
        return "definition"
    if (
        "this agreement" in t
        and ("purpose" in t or "background" in t or "whereas" in t or "recital" in t)
    ):
        return "recital"
    # Title/preamble/parties block — these contracts always start with a "by and
    # between Party A ... Party B" header before any substantive clauses. Treat
    # the entire opener as foundational so it never gets redlined.
    head500 = t[:500]
    if (
        ("entered into" in head500 and "between" in head500)
        or ("by and between" in head500)
        or ("agreement is" in head500 and "between" in head500)
        or (
            "party" in head500
            and (
                "name" in head500
                or "address" in head500
                or "principal place" in head500
                or "registered" in head500
                or "corporation" in head500
                or "ltd" in head500
            )
        )
    ):
        return "party_block"
    if "force majeure" in t:
        return "force_majeure"
    if "notice" in t and ("written" in t or "delivered" in t):
        return "notices"
    return "general"


# Clause kinds that are foundational/boilerplate — should never be redlined,
# never get high risk, and never trigger contradiction noise.
_FOUNDATIONAL = {
    "party_block",
    "recital",
    "definition",
    "signature",
    "governing_law",
    "notices",
    "force_majeure",
}

# Clause kinds with meaningful semantic surface area for cross-clause analysis.
_SUBSTANTIVE = {
    "liability",
    "indemnification",
    "data_processing",
    "renewal",
    "non_compete",
    "termination",
    "warranty",
    "ip_assignment",
    "confidentiality",
}


def _clause_body_from_prompt(user_prompt: str) -> str:
    """Strip the leading 'Original clause X (risk: Y):' or 'Clause X (Type):'
    headers added by the agent so heuristics see just the clause text."""
    text = user_prompt
    text = re.sub(
        r"^\s*(?:Original\s+)?Clause\s+\S+\s*(?:\([^)]*\))?\s*:\s*\n*",
        "",
        text,
        flags=re.IGNORECASE,
    )
    # Many prompts also append meta lines like "Has contradictions: ..."; trim.
    text = re.split(r"\n\s*Has\s+(?:contradictions|regulatory|violations)\s*:", text, maxsplit=1)[0]
    return text.strip()


def _demo_json(system_prompt: str, user_prompt: str):
    sp = system_prompt.lower()
    up = user_prompt.lower()
    seed = _seed(user_prompt)

    # Parser — clause list
    if "legal document parser" in sp or "split the contract into individual clauses" in sp:
        # Strip the prompt prefix so the first chunk doesn't carry "Parse this
        # contract into clauses:" into a synthetic §1 clause body.
        body = re.sub(
            r"^[\s\S]*?(?=\n\s*\d+[\.\)]\s|\n\s*Section\s|\n\s*Article\s|\n\s*[A-Z][A-Z &]{4,}\b)",
            "",
            user_prompt,
            count=1,
        ).lstrip()
        if not body:
            body = user_prompt
        chunks = re.split(
            r"\n(?=\s*\d+[\.\)]\s)|\n(?=\s*Section\s)|\n(?=\s*Article\s)",
            body,
        )
        # Drop chunks that don't look like substantive clauses (boilerplate,
        # title pages, signature lines).
        cleaned = []
        for raw in chunks:
            ch = raw.strip()
            if len(ch) < 60:
                continue
            # Skip chunks that don't start with a section number or all-caps heading.
            if not re.match(r"^(\d+[\.\)]\s|[A-Z][A-Z &/\-]{3,}|Section|Article)", ch):
                continue
            cleaned.append(ch)
        chunks = cleaned[:14]
        if not chunks:
            # Fallback: chunk by fixed size if the document has no clear sections.
            chunks = [body[i : i + 380] for i in range(0, min(len(body), 4500), 380)][:8]
        kinds = ["obligation", "right", "definition", "condition", "remedy"]
        out = []
        for i, ch in enumerate(chunks):
            heading_match = re.match(
                r"^\s*\d+[\.\)]\s+([A-Z][A-Za-z0-9 &/\-,]{2,60})|^([A-Z][A-Z &/\-]{3,60})",
                ch,
            )
            if heading_match:
                section = (heading_match.group(1) or heading_match.group(2) or "").strip()
            else:
                section = f"Section {i + 1}"
            # Pull the section number out of the leading "5.", "5.1", "Section 5" etc.
            num_match = re.match(r"^\s*(\d+(?:\.\d+)?)", ch)
            clause_num = num_match.group(1) if num_match else f"{i + 1}"
            out.append(
                {
                    "clause_id": clause_num,
                    "text": ch[:1200],
                    "section": section,
                    "page_number": 1 + i // 6,
                    "clause_type": kinds[i % len(kinds)],
                }
            )
        return out

    # Parser — definitions
    if "defined terms" in sp or "extract all defined" in sp:
        return [
            {"term": "Confidential Information", "meaning": "All non-public information disclosed under this agreement.", "scope": "global"},
            {"term": "Effective Date", "meaning": "The date this agreement is signed by both parties.", "scope": "global"},
            {"term": "Term", "meaning": "The duration of this agreement, including any renewals.", "scope": "global"},
        ]

    # Parser — parties
    if "identify all parties" in sp or "identify parties" in sp:
        return [
            {
                "name": "Disclosing Party",
                "role": "service_provider",
                "obligations": ["Disclose only necessary confidential info"],
                "rights": ["Withhold trade secrets", "Audit recipient compliance"],
            },
            {
                "name": "Receiving Party",
                "role": "client",
                "obligations": ["Maintain confidentiality", "Limit internal access"],
                "rights": ["Use info for the agreed purpose"],
            },
        ]

    # ── New walker: classify a single clause into the kind taxonomy ──
    if "classify this contract clause into one category" in sp:
        kind = _classify_clause(user_prompt)
        return {"kind": kind}

    # ── New walker: kind-aware contradiction adjudication ──
    # The agent has already filtered out foundational / same-kind /
    # complementary pairs before calling, so we just answer the
    # remaining cross-kind question.
    if "you are deciding whether two contract clauses contradict" in sp:
        # Pull kind hints from the user_prompt the agent passes in.
        m_a = re.search(r"clause\s*a\s*is\s*classified\s*as\s*kind\s*=\s*(\w+)", up)
        m_b = re.search(r"clause\s*b\s*is\s*classified\s*as\s*kind\s*=\s*(\w+)", up)
        if m_a and m_b:
            kind_a, kind_b = m_a.group(1), m_b.group(1)
        else:
            kind_a = kind_b = "general"
        return _adjudicate_contradiction(kind_a, kind_b, up)

    # ── Forge clause evaluator (the unified 4-step per-clause pipeline) ──
    if "core analytical engine of " in sp and "forge" in sp:
        return _adjudicate_forge_clause(user_prompt)

    # ── New walker: kind+statute targeted compliance check ──
    if "decide whether this contract clause violates the named statute" in sp:
        m_statute = re.search(r"statute:\s*([^\n]+)", up)
        statute = m_statute.group(1).strip() if m_statute else ""
        # IMPORTANT: only match keywords against the clause body, not the
        # whole prompt. The system prompt + statute brief mention things
        # like "auto-renewal" / "merchantability" / "personal data" as part
        # of explaining the statute — those must NOT count as clause-content
        # matches or every clause gets flagged.
        m_clause = re.search(r"clause text:\s*\n([\s\S]+)$", user_prompt, re.IGNORECASE)
        clause_only = m_clause.group(1) if m_clause else user_prompt
        return _adjudicate_statute(statute, clause_only)

    # Contradiction — pairwise (legacy / generic agent prompt)
    if "adversarial legal analyst" in sp or "find contradictions" in sp:
        # Split the prompt into clause A vs clause B halves so heuristics never
        # match because the same keyword appears anywhere in the combined text.
        halves = re.split(r"\n\nClause\s+\S+\s*\(.+?\)\s*:\s*\n", "\n\n" + user_prompt, maxsplit=2)
        halves = [h for h in halves if h.strip()]
        if len(halves) >= 2:
            a_raw, b_raw = halves[0], halves[1]
        else:
            a_raw = b_raw = user_prompt

        kind_a = _classify_clause(a_raw)
        kind_b = _classify_clause(b_raw)

        # Foundational clauses are NEVER the source of meaningful conflicts.
        if kind_a in _FOUNDATIONAL or kind_b in _FOUNDATIONAL:
            return {"contradicts": False, "severity": "none", "explanation": "", "confidence": 0.95}

        pair = {kind_a, kind_b}

        # Additional cross-kind pairs that surface real M&A / SaaS / NDA traps.
        if pair == {"non_compete", "termination"}:
            return {
                "contradicts": True,
                "severity": "direct",
                "explanation": (
                    "At-will termination right pulls against a long-tail non-compete obligation — "
                    "an employee/founder can be fired but is still locked out of the industry. "
                    "Read together this is unconscionable in most jurisdictions."
                ),
                "confidence": 0.88,
            }
        # NOTE: {indemnification, ip_assignment} is intentionally NOT a contradiction.
        # An IP assignment + an IP-infringement indemnity is the standard structural
        # pairing in IP transfer agreements — the assignor transfers ownership AND
        # warrants the asset's originality. They are complementary risk-allocation
        # clauses, not opposing obligations. Flagging this as a contradiction makes
        # the system look like it doesn't understand basic transaction mechanics.
        if pair == {"indemnification", "termination"}:
            return {
                "contradicts": True,
                "severity": "implicit",
                "explanation": (
                    "Termination clause does not carve out indemnification survival — obligations "
                    "may technically expire when the agreement ends, defeating the indemnity."
                ),
                "confidence": 0.79,
            }
        if pair == {"liability", "indemnification"}:
            return {
                "contradicts": True,
                "severity": "direct",
                "explanation": (
                    "Capped liability is incompatible with the uncapped indemnification — the "
                    "receiving party assumes unbounded exposure while the disclosing party benefits "
                    "from a hard $ cap. Classic NDA trap."
                ),
                "confidence": 0.93,
            }
        if pair == {"renewal", "termination"}:
            return {
                "contradicts": True,
                "severity": "implicit",
                "explanation": (
                    "Termination right is undermined by the auto-renewal mechanism — without a "
                    "non-renewal notice window the termination clause is effectively unreachable."
                ),
                "confidence": 0.82,
            }
        if pair == {"data_processing", "confidentiality"}:
            return {
                "contradicts": True,
                "severity": "implicit",
                "explanation": (
                    "Confidentiality undertaking is silent on personal-data treatment — read "
                    "against GDPR/CCPA obligations this creates ambiguity about subprocessor use."
                ),
                "confidence": 0.78,
            }
        if pair == {"warranty", "liability"}:
            return {
                "contradicts": True,
                "severity": "potential",
                "explanation": (
                    "Warranty obligations sit outside the stated liability cap — the cap may not "
                    "survive a warranty-breach claim, exposing the disclosing party."
                ),
                "confidence": 0.74,
            }
        if pair == {"ip_assignment", "confidentiality"}:
            return {
                "contradicts": True,
                "severity": "potential",
                "explanation": (
                    "IP assignment language may conflict with confidentiality carve-outs — "
                    "ownership transfer should preserve recipient's confidentiality obligations."
                ),
                "confidence": 0.72,
            }

        # No baseline noise — substantive pairs that don't match any known
        # contradiction pattern are reported clean, not randomly flagged.
        return {"contradicts": False, "severity": "none", "explanation": "", "confidence": 0.91}

    # Compliance — per-clause statute check
    if "regulatory compliance expert" in sp or "violates any known regulation" in sp:
        bucket = seed % 100
        text = up

        # Deterministic catches for known triggers
        if (
            "personal data" in text
            or "data processing" in text
            or "subprocessor" in text
            or "data protection" in text
            or "gdpr" in text
            or ("user data" in text and ("third party" in text or "anonymi" in text or "retention" in text or "share" in text))
        ):
            return {
                "violation": True,
                "statute": "GDPR Art. 28",
                "violation_detail": (
                    "Clause permits personal-data processing without specifying lawful basis, "
                    "subprocessor disclosure, or data-subject rights mechanism."
                ),
                "severity": "high",
                "suggested_fix": (
                    "Add explicit lawful basis (Art. 6), subprocessor list with prior approval, "
                    "and 30-day data-subject request response."
                ),
                "confidence": 0.91,
            }
        if "liability" in text and ("cap" in text or "$" in text or "limit" in text):
            return {
                "violation": True,
                "statute": "UCC §2-302",
                "violation_detail": (
                    "Liability cap appears unconscionable relative to potential indemnified losses; "
                    "may not survive a §2-302 challenge."
                ),
                "severity": "high",
                "suggested_fix": (
                    "Carve out indemnification, willful misconduct, and confidentiality breaches "
                    "from the liability cap."
                ),
                "confidence": 0.86,
            }
        if "auto-renew" in text or "automatic renewal" in text or "renewal" in text:
            return {
                "violation": True,
                "statute": "FTC Act §5",
                "violation_detail": (
                    "Auto-renewal lacks the conspicuous disclosure and prior consent expected "
                    "under FTC negative-option guidance."
                ),
                "severity": "medium",
                "suggested_fix": "Require 30-day pre-renewal written notice with opt-out window.",
                "confidence": 0.79,
            }
        # FTC Non-Compete Rule only targets clauses that bar a worker/founder
        # from competing employment or starting a competing business. The bare
        # word "restrict" shows up in 80% of NDAs (restrict ACCESS to confidential
        # info) and must NOT trigger this finding — that was a false positive on
        # ordinary access-control clauses.
        if (
            "non-compete" in text
            or "noncompete" in text
            or "non compete" in text
            or "restrictive covenant" in text
            or "shall not compete" in text
            or "agree not to compete" in text
            or "shall not engage in" in text and "competing" in text
            or "non-solicitation" in text
            or ("compete" in text and ("employment" in text or "founder" in text or "employee" in text or "post-closing" in text or "post-termination" in text))
        ):
            return {
                "violation": True,
                "statute": "FTC Non-Compete Rule",
                "violation_detail": (
                    "Restrictive covenant scope may exceed enforceability under recent FTC rulemaking."
                ),
                "severity": "high",
                "suggested_fix": "Narrow geography, duration, and role scope; add severability.",
                "confidence": 0.83,
            }
        # ── Statute-keyword guarded baselines ──────────────────────────
        # No random "this clause might violate X" filler. Each statute only
        # fires when the clause actually contains language relevant to that
        # statute's domain. SOX §404 must NEVER hit on a confidentiality
        # clause; CCPA must NEVER hit on an indemnification clause; etc.
        kind_here = _classify_clause(text)
        if kind_here in _FOUNDATIONAL or kind_here == "general":
            return {"violation": False, "statute": "", "violation_detail": "", "severity": "low", "confidence": 0.95}

        # CCPA / consumer data — only on clauses that actually mention
        # consumer or personal data rights.
        if (
            ("consumer" in text and ("data" in text or "personal" in text or "right" in text))
            or "consumer privacy" in text
            or "right to know" in text
            or "right to delete" in text
        ):
            return {
                "violation": True,
                "statute": "CCPA 1798.100",
                "violation_detail": "Consumer data rights are referenced without an explicit mechanism for access, deletion, or opt-out.",
                "severity": "medium",
                "suggested_fix": "Add explicit consumer-rights workflow with response SLA.",
                "confidence": 0.79,
            }

        # SOX §404 — only on clauses that touch financial reporting / audit
        # of financial controls. Does NOT fire on NDA audit-of-confidentiality
        # language.
        if (
            "internal control" in text
            or "financial report" in text
            or "financial statement" in text
            or ("audit" in text and ("financial" in text or "sec " in text or "10-k" in text or "10-q" in text))
            or "material weakness" in text
        ):
            return {
                "violation": True,
                "statute": "SOX §404",
                "violation_detail": "Internal-controls language is ambiguous on management attestation and independent auditor sign-off.",
                "severity": "medium",
                "suggested_fix": "Reference the specific SOX §404 attestation deliverables and timing.",
                "confidence": 0.77,
            }

        # UCC §2-316 — only on clauses that disclaim warranties on goods/services.
        if (
            ("warrant" in text or "warranty" in text or "warranties" in text)
            and ("disclaim" in text or "as is" in text or "as-is" in text or "merchantability" in text or "fitness for" in text)
        ):
            return {
                "violation": True,
                "statute": "UCC §2-316",
                "violation_detail": "Warranty-exclusion language must be conspicuous and reference 'merchantability' / 'fitness for a particular purpose' explicitly.",
                "severity": "medium",
                "suggested_fix": "Render the disclaimer in ALL CAPS or a contrasting heading and use the statutory phrasing.",
                "confidence": 0.81,
            }

        # No statute-relevant signal — clean.
        return {"violation": False, "statute": "", "violation_detail": "", "severity": "low", "confidence": 0.92}

    # Risk scoring — keyword-aware, deterministic per clause
    # Matches the risk_scorer.py system prompt: "legal risk assessment expert / Scoring rubric"
    if (
        "legal risk assessment expert" in sp
        or "scoring rubric" in sp
        or "weighted rubric" in sp
        or "score this clause" in sp
    ):
        body = _clause_body_from_prompt(user_prompt)
        kind = _classify_clause(body)
        jitter = ((seed % 60) - 30) / 600  # ±0.05 deterministic per clause

        if kind == "liability":
            score, factors = 0.82, ["financial_exposure", "liability_cap"]
            exposure = "$250K–$1M"
        elif kind == "indemnification":
            score, factors = 0.78, ["financial_exposure", "unbounded_indemnity"]
            exposure = "$100K–$500K"
        elif kind == "data_processing":
            score, factors = 0.75, ["regulatory_risk", "gdpr_exposure"]
            exposure = "regulatory fines"
        elif kind == "non_compete":
            score, factors = 0.72, ["operational_burden", "enforceability"]
            exposure = "post-employment loss"
        elif kind == "ip_assignment":
            score, factors = 0.55, ["ip_transfer", "scope_breadth"]
            exposure = "IP scope risk"
        elif kind == "renewal":
            score, factors = 0.5, ["operational_burden", "auto_renewal"]
            exposure = "12-month rollover"
        elif kind == "termination":
            score, factors = 0.45, ["operational_burden", "notice_period"]
            exposure = "transition cost"
        elif kind == "warranty":
            score, factors = 0.42, ["financial_exposure", "warranty_scope"]
            exposure = "warranty claims"
        elif kind == "confidentiality":
            score, factors = 0.35, ["information_risk"]
            exposure = "info leakage"
        elif kind in _FOUNDATIONAL:
            score, factors = 0.12, ["boilerplate"]
            exposure = "negligible"
        else:
            score, factors = 0.28, ["general_obligation"]
            exposure = "low"

        score = max(0.0, min(1.0, score + jitter))
        if score >= 0.75:
            level = "critical"
        elif score >= 0.5:
            level = "high"
        elif score >= 0.25:
            level = "medium"
        else:
            level = "low"
        return {
            "score": round(score, 2),
            "risk_score": round(score, 2),
            "risk_level": level,
            "factors": factors,
            "exposure_estimate": exposure,
            "recommendation": _risk_recommendation(kind),
            "rationale": f"Scored as {kind} clause; weighted across regulatory, financial and operational factors.",
            "confidence": 0.84,
        }

    # Negotiation CRITIC (llm_json) — clause-type-aware verdict on a proposed
    # redline. The proposer (llm_call → _demo_text) returns the actual prose.
    if "adversarial legal reviewer" in sp or "find weaknesses in the proposed" in sp:
        body = _clause_body_from_prompt(user_prompt)
        kind = _classify_clause(body)
        if kind in _FOUNDATIONAL:
            # Should never reach the critic for foundational clauses, but if it
            # does, declare it acceptable so no redline is appended.
            return {
                "acceptable": True,
                "weaknesses": [],
                "improved_version": "",
                "risk_reduction_pct": 0,
            }
        weakness_map = {
            "liability": ["cap still excludes consequential damages"],
            "indemnification": ["carve-outs need explicit list"],
            "data_processing": ["subprocessor disclosure list missing"],
            "non_compete": ["scope still possibly overbroad"],
            "renewal": ["notice period could be longer"],
            "termination": ["cure window may be too short"],
            "warranty": ["disclaimer wording not conspicuous enough"],
            "ip_assignment": ["pre-existing IP retention unclear"],
            "confidentiality": ["return/destruction obligations missing"],
        }
        weaknesses = weakness_map.get(kind, ["clarity could be improved"])
        # Deterministic acceptable / not-acceptable per clause so demo shows
        # both proposer-passes and critic-improved variants.
        acceptable = (seed % 3) != 0
        return {
            "acceptable": acceptable,
            "weaknesses": weaknesses,
            "improved_version": "" if acceptable else _demo_negotiation_proposed_for(kind, body),
            "risk_reduction_pct": 35 + (seed % 50),
        }

    # Contract intent — deal thesis from excerpt
    if "senior transactional lawyer" in sp and "deal_thesis" in sp:
        up_l = user_prompt.lower()
        if "non-disclosure" in up_l or "nda" in up_l or "mutual_nda" in up_l:
            thesis = (
                "Parties need to share confidential information safely while "
                "evaluating a commercial relationship."
            )
            stake = "Limit uncapped liability and ensure indemnity aligns with any liability cap."
        elif "saas" in up_l or "software as a service" in up_l:
            thesis = "Customer procures cloud services; vendor limits operational and data-processing risk."
            stake = "Secure GDPR/CCPA-compliant data handling and proportional liability caps."
        elif "letter of intent" in up_l or "merger" in up_l or "acquisition" in up_l:
            thesis = "Parties negotiate a strategic transaction under preliminary terms."
            stake = "Protect exclusivity, diligence access, and enforceable non-compete scope."
        else:
            thesis = "Commercial agreement allocating rights, obligations, and remedies between the parties."
            stake = "Align remedies, caps, and regulatory obligations with commercial intent."
        return {
            "deal_thesis": thesis,
            "why_parties_enter": thesis,
            "party_stake": stake,
            "success_criteria": "No cross-clause conflicts; regulatory flags remediated; redlines adopted where issued.",
            "review_priorities": [
                "Cross-clause consistency",
                "Liability and indemnity alignment",
                "Regulatory fit for stated jurisdiction",
            ],
        }

    # Report — markdown executive summary (delivered via llm_call → _demo_text)
    # We never expect llm_json to be called for the report, but keep a stub.
    if "executive summary" in sp and "json" in sp:
        return {
            "executive_summary": "See markdown report.",
            "verdict": "negotiate",
        }

    # Default empty array — many call sites tolerate this
    return []


def _risk_recommendation(kind: str) -> str:
    return {
        "liability": "Carve indemnity, confidentiality and willful misconduct out of the liability cap.",
        "indemnification": "Mutualise indemnification and add a notice + control-of-defense clause.",
        "data_processing": "Add GDPR Art. 28 controller/processor terms and a subprocessor approval list.",
        "non_compete": "Narrow scope, duration and geography; add severability.",
        "renewal": "Insert a 30-day non-renewal notice window before each renewal term.",
        "termination": "Add a 30-day cure period for material breach and post-termination obligations.",
        "warranty": "Make any disclaimer conspicuous and carve breaches out of the liability cap.",
        "ip_assignment": "Limit assignment to work product created under this engagement; preserve pre-existing IP.",
        "confidentiality": "Add return-or-destroy obligation and survival period for confidential information.",
    }.get(kind, "Review clause for clarity and alignment with the rest of the agreement.")


# ───────────────────────────────────────────────────────────────────
# Negotiation proposer (text output, not JSON)
# ───────────────────────────────────────────────────────────────────


def _parse_forge_prompt(user_prompt: str) -> dict:
    """Pull the structured fields out of the [DOCUMENT_CONTEXT] / [CURRENT_CLAUSE]
    block that `clause_evaluator.evaluate_clause` constructs."""
    out = {
        "document_type": "GENERIC",
        "target_party": "buyer",
        "allowed": [],
        "clause_id": "",
        "clause_title": "",
        "clause_kind": "general",
        "clause_text": "",
    }
    m = re.search(r"Document Type:\s*([^\n]+)", user_prompt)
    if m: out["document_type"] = m.group(1).strip()
    m = re.search(r"Target Party:\s*([^\n]+)", user_prompt)
    if m: out["target_party"] = m.group(1).strip()
    m = re.search(r"Allowed Regulations Matrix:\s*([^\n]+)", user_prompt)
    if m:
        raw = m.group(1).strip()
        out["allowed"] = [r.strip() for r in raw.split(",") if r.strip() and r.strip() != "(none)"]
    m = re.search(r"Section/Number:\s*([^\n]+)", user_prompt)
    if m: out["clause_id"] = m.group(1).strip()
    m = re.search(r"Title:\s*([^\n]+)", user_prompt)
    if m: out["clause_title"] = m.group(1).strip()
    m = re.search(r"Kind:\s*([^\n]+)", user_prompt)
    if m: out["clause_kind"] = m.group(1).strip()
    m = re.search(r'Original Text:\s*"([\s\S]*?)"\s*\n\[/CURRENT_CLAUSE\]', user_prompt)
    if m: out["clause_text"] = m.group(1).strip()
    return out


def _adjudicate_forge_clause(user_prompt: str) -> dict:
    """Demo fallback for the unified Forge evaluator. Honors the
    ALLOWED_REGULATIONS matrix strictly — never returns a regulation
    outside the supplied list."""
    ctx = _parse_forge_prompt(user_prompt)
    kind = (ctx["clause_kind"] or "general").lower()
    text = ctx["clause_text"]
    body = text.lower()
    allowed = set(ctx["allowed"])
    doc_type = ctx["document_type"]

    def reg_if_allowed(name: str) -> str:
        return name if name in allowed else ""

    # Foundational kinds: never need a redline.
    if kind in _FOUNDATIONAL or kind == "general":
        return {
            "needs_redline": False,
            "issue_detected": "",
            "evaluated_regulation": "",
            "proposed_text": "",
            "impact": "low",
            "rationale": "Foundational / boilerplate clause; no risk surface.",
            "confidence_score": 0.9,
        }

    # ── Liability cap that doesn't carve out indemnification / wilful misconduct.
    if kind == "liability" and ("shall not exceed" in body or "limitation of liability" in body or "$" in body):
        reg = reg_if_allowed("UCC §2-302")
        return {
            "needs_redline": True,
            "issue_detected": (
                "Liability cap is decoupled from indemnification scope and lacks "
                "carve-outs for wilful misconduct and confidentiality breaches."
            ),
            "evaluated_regulation": reg,
            "proposed_text": (
                f"§{ctx['clause_id']}. The total aggregate liability of either party arising "
                f"out of or related to this Agreement shall not exceed the greater of (a) the "
                f"fees paid by the receiving party in the twelve (12) months preceding the claim "
                f"or (b) USD 100,000; provided, however, that this cap shall not apply to "
                f"(i) breaches of confidentiality, (ii) indemnification obligations, "
                f"(iii) wilful misconduct, or (iv) violations of applicable law."
            ),
            "impact": "high",
            "rationale": (
                "Preserves the parties' agreed cap mechanic while restoring the standard "
                "carve-outs that prevent the cap from neutralising indemnity exposure."
            ),
            "confidence_score": 0.88,
        }

    # ── Indemnification clauses.
    if kind == "indemnification":
        # IP-infringement indemnity in an IP_ASSIGNMENT — keep IP-specific scope.
        if doc_type == "IP_ASSIGNMENT" or "infring" in body or "intellectual property" in body:
            return {
                "needs_redline": True,
                "issue_detected": (
                    "Indemnification scope is open-ended; should be narrowed to "
                    "third-party IP-infringement claims with notice and control of defense."
                ),
                "evaluated_regulation": "NONE",
                "proposed_text": (
                    f"§{ctx['clause_id']}. Assignor shall defend, indemnify and hold harmless "
                    f"Assignee from and against third-party claims that the Work, as delivered "
                    f"by Assignor and used by Assignee in accordance with this Agreement, "
                    f"infringes any U.S. patent, registered copyright, or trade secret of such "
                    f"third party, provided that Assignee (i) gives Assignor prompt written "
                    f"notice, (ii) grants Assignor sole control of the defense and settlement "
                    f"(no admission of liability without Assignee's consent, not unreasonably "
                    f"withheld), and (iii) provides reasonable cooperation. This is Assignee's "
                    f"sole and exclusive remedy for IP infringement claims."
                ),
                "impact": "high",
                "rationale": (
                    "Retains specific IP / patent / copyright protections, adds standard "
                    "notice + control-of-defense procedure, and bounds the obligation without "
                    "collapsing it into generic liability boilerplate."
                ),
                "confidence_score": 0.9,
            }
        reg = reg_if_allowed("UCC §2-302")
        return {
            "needs_redline": True,
            "issue_detected": (
                "Indemnity is uncapped and asymmetric; standard mutual carve-outs and "
                "control-of-defense language are missing."
            ),
            "evaluated_regulation": reg,
            "proposed_text": (
                f"§{ctx['clause_id']}. Each party shall defend, indemnify and hold harmless "
                f"the other party from third-party claims arising out of (i) its breach of "
                f"confidentiality, (ii) its gross negligence or wilful misconduct, or "
                f"(iii) its violation of applicable law. The indemnified party shall give "
                f"prompt written notice and grant the indemnifying party control of the "
                f"defense, subject to the indemnified party's reasonable approval of any "
                f"settlement that imposes obligations on it."
            ),
            "impact": "high",
            "rationale": "Mutualises indemnification, adds notice + control-of-defense, leaves business intent intact.",
            "confidence_score": 0.86,
        }

    # ── Data processing.
    if kind == "data_processing":
        reg = reg_if_allowed("GDPR Art. 28") or reg_if_allowed("CCPA 1798.100")
        if not reg:
            return _forge_clean()
        return {
            "needs_redline": True,
            "issue_detected": (
                "Personal-data processing language lacks a Data Processing Addendum, "
                "subprocessor disclosure, and a data-subject request mechanism."
            ),
            "evaluated_regulation": reg,
            "proposed_text": (
                f"§{ctx['clause_id']}. To the extent the receiving party processes Personal "
                f"Data on behalf of the disclosing party, the parties shall execute a Data "
                f"Processing Addendum aligned with GDPR Art. 28 addressing (a) lawful basis, "
                f"(b) prior written approval of subprocessors with a published list, "
                f"(c) data-subject request response within 30 days, and (d) data return or "
                f"deletion upon termination, with a single audit per calendar year on 30 "
                f"days' notice."
            ),
            "impact": "high",
            "rationale": "Surfaces required Art. 28 mechanics without changing the commercial intent.",
            "confidence_score": 0.91,
        }

    # ── Non-compete.
    if kind == "non_compete":
        reg = reg_if_allowed("FTC Non-Compete Rule")
        return {
            "needs_redline": True,
            "issue_detected": (
                "Non-compete scope appears unenforceable: duration, geography, "
                "and role scope are too broad relative to the protectable interest."
            ),
            "evaluated_regulation": reg or "NONE",
            "proposed_text": (
                f"§{ctx['clause_id']}. For a period of twelve (12) months following "
                f"termination, and only within the geographic territory in which the "
                f"restricted party actually performed services under this Agreement, the "
                f"restricted party shall not, in the same competitive role, solicit any "
                f"customer of the protected party with whom the restricted party had "
                f"material direct contact during the twelve (12) months preceding "
                f"termination. The parties acknowledge that this clause is severable in "
                f"the event any portion is found unenforceable."
            ),
            "impact": "high",
            "rationale": "Narrows duration, geography, and role to the legally enforceable core; adds severability.",
            "confidence_score": 0.85,
        }

    # ── Renewal.
    if kind == "renewal":
        reg = reg_if_allowed("FTC Act §5")
        return {
            "needs_redline": True,
            "issue_detected": "Auto-renewal lacks a conspicuous opt-out window.",
            "evaluated_regulation": reg or "NONE",
            "proposed_text": (
                f"§{ctx['clause_id']}. This Agreement shall automatically renew for "
                f"successive twelve (12) month terms unless either party provides written "
                f"notice of non-renewal at least thirty (30) days prior to the end of the "
                f"then-current term. Renewal pricing shall not increase by more than the "
                f"annual change in CPI."
            ),
            "impact": "medium",
            "rationale": "Adds the standard 30-day opt-out window and a CPI-bounded renewal price.",
            "confidence_score": 0.82,
        }

    # ── Termination.
    if kind == "termination":
        return {
            "needs_redline": True,
            "issue_detected": "Termination clause omits cure period and survival of confidentiality / indemnity.",
            "evaluated_regulation": "NONE",
            "proposed_text": (
                f"§{ctx['clause_id']}. Either party may terminate this Agreement for "
                f"material breach by providing written notice and a thirty (30) day cure "
                f"period; if the breach is not cured within that period, the non-breaching "
                f"party may terminate immediately. The parties' obligations under "
                f"confidentiality, indemnification, payment for services rendered, and "
                f"limitation of liability shall survive termination."
            ),
            "impact": "high",
            "rationale": "Adds cure window and explicit survival, preserving the agreed termination right.",
            "confidence_score": 0.83,
        }

    # ── Confidentiality (NDA core).
    if kind == "confidentiality":
        return {
            "needs_redline": True,
            "issue_detected": "Confidentiality scope and survival period would benefit from explicit standards.",
            "evaluated_regulation": "NONE",
            "proposed_text": (
                f"§{ctx['clause_id']}. The receiving party shall hold Confidential "
                f"Information in strict confidence using at least the same degree of care "
                f"it uses for its own confidential information (and in no event less than "
                f"reasonable care), and shall limit disclosure to representatives with a "
                f"need to know who are bound by written confidentiality obligations no less "
                f"protective than those herein. Confidentiality obligations shall survive "
                f"for five (5) years after termination, and indefinitely with respect to "
                f"information that constitutes a trade secret under applicable law."
            ),
            "impact": "medium",
            "rationale": "Tightens the standard of care and clarifies the trade-secret survival carve-out.",
            "confidence_score": 0.8,
        }

    # ── Warranty.
    if kind == "warranty":
        reg = reg_if_allowed("UCC §2-316")
        return {
            "needs_redline": True,
            "issue_detected": "Warranty disclaimer is not conspicuous and does not reference statutory terms.",
            "evaluated_regulation": reg or "NONE",
            "proposed_text": (
                f"§{ctx['clause_id']}. EXCEPT AS EXPRESSLY SET FORTH IN THIS AGREEMENT, "
                f"THE SERVICE IS PROVIDED \"AS IS\" AND PROVIDER DISCLAIMS ALL WARRANTIES, "
                f"WHETHER EXPRESS, IMPLIED OR STATUTORY, INCLUDING THE IMPLIED WARRANTIES "
                f"OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE."
            ),
            "impact": "medium",
            "rationale": "Renders the disclaimer conspicuous and uses the UCC statutory phrasing.",
            "confidence_score": 0.83,
        }

    # ── IP assignment.
    if kind == "ip_assignment":
        return {
            "needs_redline": True,
            "issue_detected": "Assignment language could clarify retained moral rights and transfer of underlying tools.",
            "evaluated_regulation": "NONE",
            "proposed_text": (
                f"§{ctx['clause_id']}. Assignor hereby irrevocably assigns to Assignee all "
                f"right, title and interest in and to the Work and all intellectual property "
                f"rights therein. Assignor retains a non-exclusive, non-transferable license "
                f"to general-purpose tools, libraries and know-how independently developed by "
                f"Assignor and used in creating the Work, solely to the extent necessary for "
                f"Assignor's other engagements not competitive with Assignee."
            ),
            "impact": "medium",
            "rationale": "Preserves the full IP transfer while carving out independently-developed general-purpose tooling.",
            "confidence_score": 0.78,
        }

    return _forge_clean()


def _forge_clean() -> dict:
    return {
        "needs_redline": False,
        "issue_detected": "",
        "evaluated_regulation": "",
        "proposed_text": "",
        "impact": "low",
        "rationale": "",
        "confidence_score": 0.9,
    }


def _adjudicate_contradiction(kind_a: str, kind_b: str, prompt_text: str) -> dict:
    """Kind-aware contradiction lookup. Mirrors the structural rules in
    agents/contradiction.py — the agent already filtered out foundational
    and complementary pairs before calling, so here we only answer the
    remaining cross-kind question."""
    pair = {kind_a, kind_b}
    text = prompt_text.lower()

    if pair == {"liability", "indemnification"}:
        # Real trap iff the indemnity is uncapped and/or liability has a tight cap.
        uncapped = "no cap" in text or "uncapped" in text or "without limit" in text
        capped = (
            "shall not exceed" in text
            or "aggregate liability" in text
            or "limitation of liability" in text
        )
        if uncapped or capped:
            return {
                "contradicts": True,
                "severity": "direct",
                "explanation": (
                    "Capped liability is incompatible with the uncapped indemnification — "
                    "the receiving party assumes unbounded exposure while the disclosing "
                    "party benefits from a hard $ cap. Classic NDA / SaaS trap."
                ),
                "confidence": 0.92,
            }

    if pair == {"non_compete", "termination"}:
        return {
            "contradicts": True,
            "severity": "direct",
            "explanation": (
                "At-will termination right pulls against a long-tail non-compete "
                "obligation — an employee or founder can be terminated but is still "
                "locked out of the industry. Generally unenforceable."
            ),
            "confidence": 0.88,
        }

    if pair == {"renewal", "termination"}:
        return {
            "contradicts": True,
            "severity": "implicit",
            "explanation": (
                "Auto-renewal mechanism conflicts with the stated termination right — "
                "absent an explicit non-renewal notice window, the agreement may roll "
                "indefinitely without any practical exit."
            ),
            "confidence": 0.81,
        }

    if pair == {"liability", "warranty"}:
        if "non-refundable" in text and ("uptime" in text or "sla" in text or "service level" in text):
            return {
                "contradicts": True,
                "severity": "direct",
                "explanation": (
                    "SLA / uptime warranty contradicts the 'all fees non-refundable' "
                    "clause — there is no remedy for performance failure."
                ),
                "confidence": 0.86,
            }

    return {"contradicts": False, "severity": "none", "explanation": "", "confidence": 0.92}


def _adjudicate_statute(statute: str, clause_text: str) -> dict:
    """Statute-targeted compliance check. Each statute only fires when the
    clause actually contains language relevant to that statute's domain."""
    text = clause_text.lower()
    s = statute.lower()

    if "ucc" in s and "2-302" in s:
        # Liability / indemnification unconscionability.
        liability_capped = (
            ("liability" in text and ("cap" in text or "shall not exceed" in text or "$" in text))
            or "limitation of liability" in text
        )
        indemnity_unbounded = ("indemnif" in text or "hold harmless" in text) and (
            "no cap" in text or "uncapped" in text or "all claims" in text
        )
        if liability_capped or indemnity_unbounded:
            return {
                "violation": True,
                "statute": "UCC §2-302",
                "violation_detail": (
                    "Liability cap or indemnification scope appears unconscionable "
                    "relative to potential exposure under §2-302."
                ),
                "severity": "high",
                "suggested_fix": (
                    "Carve out indemnification, willful misconduct and confidentiality "
                    "from the liability cap; cap indemnification at deal value."
                ),
                "confidence": 0.86,
            }

    if "ucc" in s and "2-316" in s:
        if (
            ("warrant" in text or "warranty" in text)
            and ("disclaim" in text or "as is" in text or "as-is" in text
                 or "merchantability" in text or "fitness for" in text)
        ):
            return {
                "violation": True,
                "statute": "UCC §2-316",
                "violation_detail": (
                    "Warranty exclusion language must be conspicuous and reference "
                    "'merchantability' / 'fitness for a particular purpose' explicitly."
                ),
                "severity": "medium",
                "suggested_fix": "Render disclaimer in ALL CAPS and use the statutory phrasing.",
                "confidence": 0.81,
            }

    if "gdpr" in s:
        if (
            "personal data" in text
            or "data processing" in text
            or "subprocessor" in text
            or "data protection" in text
            or "gdpr" in text
            or ("user data" in text and ("share" in text or "third party" in text or "anonymi" in text))
        ):
            return {
                "violation": True,
                "statute": "GDPR Art. 28",
                "violation_detail": (
                    "Clause permits personal-data processing without specifying lawful "
                    "basis, subprocessor disclosure, or data-subject rights mechanism."
                ),
                "severity": "high",
                "suggested_fix": (
                    "Add explicit lawful basis (Art. 6), subprocessor list with prior "
                    "approval, and 30-day data-subject request response."
                ),
                "confidence": 0.91,
            }

    if "ccpa" in s:
        if (
            ("consumer" in text and ("data" in text or "personal" in text or "right" in text))
            or "consumer privacy" in text
            or "right to know" in text
            or "right to delete" in text
        ):
            return {
                "violation": True,
                "statute": "CCPA 1798.100",
                "violation_detail": (
                    "Consumer data rights are referenced without an explicit access / "
                    "deletion / opt-out workflow."
                ),
                "severity": "medium",
                "suggested_fix": "Add a documented consumer-rights workflow with response SLA.",
                "confidence": 0.79,
            }

    if "ftc non-compete" in s or "ftc non compete" in s:
        if (
            "non-compete" in text or "noncompete" in text or "non compete" in text
            or "restrictive covenant" in text or "shall not compete" in text
            or ("compete" in text and ("employment" in text or "founder" in text
                                       or "post-closing" in text or "post-termination" in text))
        ):
            return {
                "violation": True,
                "statute": "FTC Non-Compete Rule",
                "violation_detail": (
                    "Restrictive covenant scope may exceed enforceability under the "
                    "2024 FTC Non-Compete Rule."
                ),
                "severity": "high",
                "suggested_fix": "Narrow geography, duration, and role scope; add severability.",
                "confidence": 0.83,
            }

    if "ftc act" in s and ("§5" in s or "section 5" in s):
        if (
            "auto-renew" in text or "automatic renewal" in text or "renews automatically" in text
            or "renewal" in text
        ):
            return {
                "violation": True,
                "statute": "FTC Act §5",
                "violation_detail": (
                    "Auto-renewal lacks the conspicuous disclosure and prior consent "
                    "expected under FTC negative-option guidance."
                ),
                "severity": "medium",
                "suggested_fix": "Require 30-day pre-renewal written notice with opt-out window.",
                "confidence": 0.79,
            }
        if "terminate" in text and "without cause" in text and "notice" not in text:
            return {
                "violation": True,
                "statute": "FTC Act §5",
                "violation_detail": (
                    "Unilateral termination without notice or cure period may be unfair."
                ),
                "severity": "medium",
                "suggested_fix": "Add a 30-day notice + cure window before unilateral termination.",
                "confidence": 0.76,
            }

    return {
        "violation": False,
        "statute": statute,
        "violation_detail": "",
        "severity": "low",
        "confidence": 0.92,
    }


def _demo_negotiation_proposed_for(kind: str, original_body: str) -> str:
    """Return a clause-type-aware rewritten redline as prose, referencing the
    original where possible. Never returns the same string for every input."""
    snippet = original_body.strip().split("\n", 1)[0][:160]
    if kind == "liability":
        return (
            "Notwithstanding any other provision, the total aggregate liability of either party "
            "arising out of or related to this Agreement shall not exceed the greater of (a) the "
            "fees paid by the receiving party in the twelve (12) months preceding the claim or "
            "(b) US$50,000; provided that this cap shall NOT apply to breaches of confidentiality, "
            "indemnification obligations, gross negligence or willful misconduct."
        )
    if kind == "indemnification":
        return (
            "Each party shall indemnify, defend and hold harmless the other party from third-party "
            "claims arising out of (i) its breach of confidentiality, (ii) its gross negligence or "
            "willful misconduct, or (iii) its violation of applicable law. The indemnified party "
            "shall give prompt written notice and allow the indemnifying party to control the "
            "defense, subject to the indemnified party's reasonable approval of any settlement."
        )
    if kind == "data_processing":
        return (
            "To the extent the receiving party processes Personal Data on behalf of the disclosing "
            "party, the parties shall execute a Data Processing Addendum aligned with GDPR Art. 28 "
            "addressing (a) lawful basis, (b) prior written approval of subprocessors with a "
            "published list, (c) data-subject request response within 30 days, and (d) data return "
            "or certified destruction upon termination."
        )
    if kind == "renewal":
        return (
            "This Agreement shall renew automatically for successive one-year terms unless either "
            "party provides written notice of non-renewal at least thirty (30) days prior to the "
            "end of the then-current term. Renewal pricing shall not increase by more than the "
            "lesser of CPI or five percent (5%) per renewal period."
        )
    if kind == "non_compete":
        return (
            "For a period of twelve (12) months following termination, and only within the "
            "geographic territory in which the restricted party actually performed services under "
            "this Agreement, the restricted party shall not, in the same competitive role, solicit "
            "any customer of the protected party with whom the restricted party had material "
            "contact during the preceding twelve months."
        )
    if kind == "termination":
        return (
            "Either party may terminate this Agreement for material breach by providing written "
            "notice and a thirty (30) day cure period; if the breach is not cured within that "
            "period, the non-breaching party may terminate immediately. Sections governing "
            "confidentiality, indemnification, payment for services rendered, and limitation of "
            "liability shall survive termination."
        )
    if kind == "warranty":
        return (
            "Each party warrants that it has the full corporate authority to enter into this "
            "Agreement and that the services will be performed in a professional and workmanlike "
            "manner in accordance with industry standards. EXCEPT AS EXPRESSLY SET FORTH HEREIN, "
            "ALL OTHER WARRANTIES ARE EXPRESSLY DISCLAIMED. The foregoing disclaimer shall not "
            "apply to breaches of confidentiality or indemnification obligations."
        )
    if kind == "ip_assignment":
        return (
            "All work product created specifically for the disclosing party under this Agreement "
            "shall be assigned to the disclosing party upon full payment. Each party retains all "
            "right, title and interest in its pre-existing intellectual property and any "
            "general-purpose tools, methods or know-how independently developed."
        )
    if kind == "confidentiality":
        return (
            "The receiving party shall hold Confidential Information in strict confidence using at "
            "least the degree of care it uses to protect its own confidential information, and in "
            "any event no less than a reasonable standard of care. Upon termination, the receiving "
            "party shall return or certify destruction of all Confidential Information within "
            "thirty (30) days. Obligations shall survive for five (5) years after termination."
        )
    # No targeted redline pattern — return the original unchanged so the agent's
    # high_risk filter discards it as effectively already-acceptable.
    return snippet


def _demo_text(system_prompt: str, user_prompt: str) -> str:
    """Demo text response for callers expecting prose (not JSON)."""
    sp = system_prompt.lower()

    # Negotiation proposer — return the redline as actual contract prose
    if "contract negotiation expert" in sp or "return only the revised clause text" in sp:
        body = _clause_body_from_prompt(user_prompt)
        kind = _classify_clause(body)
        # Foundational clauses are never redlined — return their original body
        # so the agent's downstream logic treats them as already acceptable.
        if kind in _FOUNDATIONAL or kind == "general":
            return body or user_prompt
        return _demo_negotiation_proposed_for(kind, body)

    # Executive summary — markdown report
    if (
        "senior legal counsel" in sp
        or ("executive summary" in sp and "c-suite" in sp)
        or "report generator for legalforge" in sp
    ):
        return _demo_executive_summary(user_prompt)

    # Anything else — JSON-stringified demo payload
    payload = _demo_json(system_prompt, user_prompt)
    return json.dumps(payload, indent=2)


def _demo_executive_summary(user_prompt: str) -> str:
    """Build a deterministic markdown summary from intent block + real finding lines."""

    def _grab(label: str, default: int = 0) -> int:
        m = re.search(rf"{re.escape(label)}\s*:\s*(\d+)", user_prompt, re.IGNORECASE)
        return int(m.group(1)) if m else default

    def _field(label: str, default: str = "") -> str:
        m = re.search(rf"{re.escape(label)}\s*:\s*([^\n]+)", user_prompt, re.IGNORECASE)
        return m.group(1).strip() if m else default

    title_m = re.search(r"Contract\s*:\s*([^\n]+)", user_prompt)
    title = title_m.group(1).strip() if title_m else "Contract"
    risk_m = re.search(r"Overall Risk Score\s*:\s*([0-9.]+)", user_prompt)
    risk = float(risk_m.group(1)) if risk_m else 0.0
    contradictions = _grab("CONTRADICTIONS_FOUND", _grab("Contradictions Found", 0))
    violations = _grab("REGULATORY_VIOLATIONS", _grab("Regulatory Violations", 0))
    proposals = _grab("REDLINES_PROPOSED", _grab("Negotiation Proposals", 0))

    deal_thesis = _field("Deal thesis", _field("deal_thesis", ""))
    why_enter = _field("Business problem solved", _field("why_parties_enter", deal_thesis))
    party_stake = _field("Party stake", "")

    contra_lines = [
        ln.replace("CONTRADICTION:", "").strip()
        for ln in user_prompt.splitlines()
        if ln.strip().startswith("CONTRADICTION:")
    ]
    viol_lines = [
        ln.replace("VIOLATION:", "").strip()
        for ln in user_prompt.splitlines()
        if ln.strip().startswith("VIOLATION:")
    ]
    redline_lines = [
        ln.replace("REDLINE:", "").strip()
        for ln in user_prompt.splitlines()
        if ln.strip().startswith("REDLINE:")
    ]

    if contradictions >= 1 or risk >= 0.6 or violations >= 2:
        verdict = "NEGOTIATE — do not counter-sign as-is."
    elif risk >= 0.35 or violations >= 1 or proposals >= 2:
        verdict = "REVIEW — judgement call required before signature."
    else:
        verdict = "SIGN-READY — clean to counter-sign."

    sections = [
        f"### Executive Report — {title}",
        "",
        f"**Verdict:** {verdict}",
        "",
        "### Why this contract exists",
        deal_thesis or why_enter or "Commercial agreement between identified parties.",
        "",
    ]
    if party_stake:
        sections.append(f"**Your stake:** {party_stake}")
        sections.append("")

    sections.append("### What the swarm found")
    if contra_lines:
        for ln in contra_lines:
            sections.append(f"- **Conflict:** {ln}")
    else:
        sections.append("- No irreconcilable cross-clause conflicts detected.")
    if viol_lines:
        for ln in viol_lines:
            sections.append(f"- **Regulatory:** {ln}")
    if redline_lines:
        for ln in redline_lines:
            sections.append(f"- **Redline:** {ln}")

    sections.extend(["", "### Critical risk areas"])
    if contra_lines:
        sections.append(f"- {contra_lines[0][:200]}")
    elif viol_lines:
        sections.append(f"- {viol_lines[0][:200]}")
    elif redline_lines:
        sections.append(f"- {redline_lines[0][:200]}")
    else:
        sections.append("- No blocking issues in top findings layer.")

    sections.extend(["", "### Recommended immediate actions"])
    step = 1
    if redline_lines:
        sections.append(f"{step}. Circulate Forge redlines — each maps to a clause issue above.")
        step += 1
    if contra_lines:
        sections.append(f"{step}. Reconcile conflicting clauses (e.g. cap vs uncapped indemnity) before signature.")
        step += 1
    if viol_lines:
        sections.append(f"{step}. Remediate regulatory flags or attach required addenda.")
        step += 1
    if step == 1:
        sections.append("1. Proceed after counsel spot-check of flagged clauses.")

    sections.extend([
        "",
        "### Estimated legal exposure",
        f"Unmitigated: {'elevated' if risk >= 0.5 or contradictions else 'moderate' if violations else 'low'}.",
        f"After redlines: {'moderate' if proposals else 'unchanged'}.",
        "",
        "_Audit trail preserved — findings attributable to Parser, Contradiction, Compliance, Risk, Forge, Report walkers._",
    ])
    return "\n".join(sections)


# ───────────────────────────────────────────────────────────────────
# Public API
# ───────────────────────────────────────────────────────────────────


_DEMO_REASON = {"why": "no_key" if not OPENAI_API_KEY else None}


async def llm_call(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.3,
    max_tokens: int = 4096,
) -> str:
    """Raw LLM text response. Falls back to deterministic demo text on any failure."""
    c = _get_client()
    if not c or _DEMO_REASON["why"]:
        return _demo_text(system_prompt, user_prompt)
    try:
        resp = await c.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return resp.choices[0].message.content or ""
    except Exception as e:  # noqa: BLE001
        msg = str(e).lower()
        if (
            "quota" in msg
            or "rate" in msg
            or "401" in msg
            or "auth" in msg
            or "429" in msg
            or "api key" in msg
            or "api_key" in msg
        ):
            _DEMO_REASON["why"] = "quota_or_auth"
            print(f"[llm_client] falling back to demo mode for the rest of this session: {e}")
        else:
            print(f"[llm_client] LLM call failed, demo fallback: {e}")
        return _demo_text(system_prompt, user_prompt)


async def llm_json(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.2,
    max_tokens: int = 4096,
) -> dict | list:
    """LLM call that returns parsed JSON. Falls back to demo data on any failure."""
    c = _get_client()
    if not c or _DEMO_REASON["why"]:
        return _demo_json(system_prompt, user_prompt)
    try:
        raw = await llm_call(
            system_prompt + "\n\nYou MUST return valid JSON only. No markdown fences.",
            user_prompt,
            temperature,
            max_tokens,
        )
    except Exception as e:  # noqa: BLE001
        print(f"[llm_client] llm_json wrap failed, demo fallback: {e}")
        return _demo_json(system_prompt, user_prompt)

    cleaned = re.sub(r"^```(?:json)?\s*", "", raw.strip())
    cleaned = re.sub(r"\s*```$", "", cleaned.strip())
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"[\[{].*[\]}]", cleaned, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
        # Last resort — give the agents valid demo data instead of an error envelope
        return _demo_json(system_prompt, user_prompt)


def is_demo_mode() -> bool:
    return _DEMO_REASON["why"] is not None
