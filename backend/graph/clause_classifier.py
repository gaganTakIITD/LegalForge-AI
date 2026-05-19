"""
Deterministic clause taxonomy — shared by all walkers so classification
does not depend on LLM timing or demo heuristics living only in llm_client.
"""

from __future__ import annotations

import re

FOUNDATIONAL_KINDS = frozenset({
    "party_block", "recital", "definition", "signature",
    "governing_law", "notices", "force_majeure",
})

SUBSTANTIVE_KINDS = frozenset({
    "liability", "indemnification", "ip_assignment", "data_processing",
    "non_compete", "termination", "renewal", "warranty", "confidentiality",
    "general",
})

# Cross-kind pairs worth adjudicating (mesh narrows further via references).
CROSS_KIND_CANDIDATES = frozenset({
    frozenset({"liability", "indemnification"}),
    frozenset({"liability", "warranty"}),
    frozenset({"termination", "renewal"}),
    frozenset({"termination", "non_compete"}),
    frozenset({"termination", "confidentiality"}),
    frozenset({"renewal", "warranty"}),
    frozenset({"data_processing", "confidentiality"}),
    frozenset({"ip_assignment", "ip_assignment"}),
    frozenset({"governing_law", "termination"}),
})


def classify_clause(text: str, section: str = "") -> str:
    """Classify from section heading first, then body keywords."""
    combined = f"{section}\n{text}".strip()
    t = combined.lower()
    head = re.split(r"\n", combined.strip(), maxsplit=1)[0][:160].lower()

    def in_head(*needles: str) -> bool:
        return any(n in head for n in needles)

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
    if in_head("termination", "term and termination"):
        return "termination"
    if in_head("term of agreement", "term and term"):
        return "termination"
    if in_head("intellectual property", "ip ownership", "assignment of", "work product"):
        return "ip_assignment"
    if in_head("warrant", "warranties", "representations"):
        return "warranty"
    if in_head("confidential"):
        return "confidentiality"
    if in_head("governing law", "jurisdiction", "venue", "dispute resolution"):
        return "governing_law"
    if in_head("definition"):
        return "definition"
    if in_head("force majeure"):
        return "force_majeure"
    if in_head("notice"):
        return "notices"
    if in_head("signature", "signed", "execution"):
        return "signature"
    if in_head("remedies"):
        if "liability" in t and ("cap" in t or "$" in t or "shall not exceed" in t):
            return "liability"
        if "indemnif" in t:
            return "indemnification"

    if "indemnif" in t or "hold harmless" in t:
        if t.count("indemnif") >= 1 and "shall indemnify" in t:
            return "indemnification"
    if any(k in t for k in ("liability shall not exceed", "aggregate liability", "total liability")):
        return "liability"
    if "liability" in t and ("cap" in t or "$" in t or "shall not exceed" in t):
        return "liability"
    if "personal data" in t or "data processing" in t or "subprocessor" in t:
        return "data_processing"
    if "auto-renew" in t or "automatic renewal" in t or "renews automatically" in t:
        return "renewal"
    if "non-compete" in t or "noncompete" in t:
        return "non_compete"
    if "terminate" in t or "termination" in t:
        return "termination"
    if "warrant" in t or " as is " in t:
        return "warranty"
    if ("owns" in t or "ownership" in t) and ("work" in t or "intellectual property" in t):
        return "ip_assignment"
    if "confidential" in t and "information" in t:
        return "confidentiality"
    if "governing law" in t or "jurisdiction" in t:
        return "governing_law"
    if " means " in t or "shall mean" in t:
        return "definition"
    head500 = t[:500]
    if (
        ("entered into" in head500 and "between" in head500)
        or "by and between" in head500
        or ("agreement is" in head500 and "between" in head500)
    ):
        return "party_block"
    if "whereas" in head500 or "recital" in head500:
        return "recital"
    if "force majeure" in t:
        return "force_majeure"
    return "general"


def classify_all_clauses(clauses: list) -> None:
    """Persist clause_kind on graph clause nodes in place."""
    for c in clauses:
        c.clause_kind = classify_clause(c.text or "", c.section or "")
