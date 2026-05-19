"""
LegalForge AI — Graph Node & Edge Models
Mirrors the Jac OSP graph schema from the architecture.
"""

from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import contextvars
import uuid


def _uid() -> str:
    return uuid.uuid4().hex[:12]


def _now() -> str:
    return datetime.utcnow().isoformat() + "Z"


# Tags every audit entry / late-attached edge with the currently-running
# analysis so multiple contracts cannot leak into each other's responses.
_current_contract: contextvars.ContextVar[str] = contextvars.ContextVar(
    "current_contract_id", default=""
)


def set_current_contract(contract_id: str) -> contextvars.Token:
    return _current_contract.set(contract_id)


def reset_current_contract(token: contextvars.Token) -> None:
    _current_contract.reset(token)


def current_contract() -> str:
    return _current_contract.get()


# ─── DOCUMENT LAYER ────────────────────────────────────────────────

class Contract(BaseModel):
    id: str = Field(default_factory=_uid)
    title: str = ""
    upload_date: str = Field(default_factory=_now)
    parties: list[str] = []
    jurisdiction: str = "US"
    risk_score: float = 0.0
    status: str = "pending"  # pending | analyzed | flagged


class Clause(BaseModel):
    id: str = Field(default_factory=_uid)
    clause_id: str = ""
    text: str = ""
    section: str = ""
    page_number: int = 1
    clause_type: str = "obligation"  # obligation | right | definition | condition | remedy
    # Semantic kind — written by ContradictionWalker.classify_clause and
    # reused by Compliance / Risk / Negotiation walkers so every walker
    # agrees on what this clause is *about*.
    clause_kind: str = ""
    risk_level: str = "low"  # low | medium | high | critical
    risk_score: float = 0.0
    ai_summary: str = ""
    flagged: bool = False


class Definition(BaseModel):
    id: str = Field(default_factory=_uid)
    term: str = ""
    meaning: str = ""
    scope: str = "global"


class Party(BaseModel):
    id: str = Field(default_factory=_uid)
    name: str = ""
    role: str = ""
    obligations: list[str] = []
    rights: list[str] = []


class Statute(BaseModel):
    id: str = Field(default_factory=_uid)
    name: str = ""
    jurisdiction: str = ""
    relevant_sections: list[str] = []
    last_updated: str = Field(default_factory=_now)


class Obligation(BaseModel):
    id: str = Field(default_factory=_uid)
    description: str = ""
    deadline: str = ""
    penalty: str = ""
    is_conditional: bool = False
    condition: str = ""


# ─── SECURITY LAYER ────────────────────────────────────────────────

class AuditEntry(BaseModel):
    id: str = Field(default_factory=_uid)
    timestamp: str = Field(default_factory=_now)
    agent_name: str = ""
    action: str = ""
    finding: str = ""
    confidence: float = 0.0
    contract_id: str = ""


class UserSession(BaseModel):
    user_id: str = ""
    role: str = "viewer"  # admin | analyst | viewer
    permissions: list[str] = []
    session_token: str = ""


# ─── EDGES ──────────────────────────────────────────────────────────

class Edge(BaseModel):
    id: str = Field(default_factory=_uid)
    source: str = ""
    target: str = ""
    edge_type: str = ""
    data: dict = {}


class ContradictionEdge(Edge):
    edge_type: str = "contradicts"
    severity: str = "potential"  # direct | implicit | potential
    explanation: str = ""


class ModifiesEdge(Edge):
    edge_type: str = "modifies"
    scope: str = "extends"  # extends | limits | overrides


class ReferencesEdge(Edge):
    edge_type: str = "references"
    context: str = ""


class BindsEdge(Edge):
    edge_type: str = "binds"
    enforcement: str = "strict"


# ─── KNOWLEDGE GRAPH ───────────────────────────────────────────────

class KnowledgeGraph:
    """In-memory knowledge graph holding all contracts ever analyzed."""

    def __init__(self):
        self.contracts: dict[str, Contract] = {}
        self.clauses: dict[str, Clause] = {}
        self.definitions: dict[str, Definition] = {}
        self.parties: dict[str, Party] = {}
        self.statutes: dict[str, Statute] = {}
        self.obligations: dict[str, Obligation] = {}
        self.audit_log: list[AuditEntry] = []
        self.edges: list[Edge] = []

    def reset(self) -> None:
        """Clear in-memory graph (test harness isolation)."""
        self.contracts.clear()
        self.clauses.clear()
        self.definitions.clear()
        self.parties.clear()
        self.statutes.clear()
        self.obligations.clear()
        self.audit_log.clear()
        self.edges.clear()

    # ── Contract edges ──
    def contract_clauses(self, contract_id: str) -> list[Clause]:
        clause_ids = {
            e.target for e in self.edges
            if e.source == contract_id and e.edge_type == "contains"
        }
        return [self.clauses[cid] for cid in clause_ids if cid in self.clauses]

    def contract_definitions(self, contract_id: str) -> list[Definition]:
        def_ids = {
            e.target for e in self.edges
            if e.source == contract_id and e.edge_type == "defines"
        }
        return [self.definitions[did] for did in def_ids if did in self.definitions]

    def contract_parties(self, contract_id: str) -> list[Party]:
        party_ids = {
            e.target for e in self.edges
            if e.source == contract_id and e.edge_type == "involves"
        }
        return [self.parties[pid] for pid in party_ids if pid in self.parties]

    # ── Contradiction edges ──
    def clause_contradictions(self, clause_id: str) -> list[dict]:
        results = []
        for e in self.edges:
            if e.edge_type == "contradicts":
                if e.source == clause_id or e.target == clause_id:
                    other = e.target if e.source == clause_id else e.source
                    results.append({
                        "other_clause_id": other,
                        "severity": e.data.get("severity", "potential"),
                        "explanation": e.data.get("explanation", ""),
                    })
        return results

    # ── Audit ──
    def add_audit(
        self,
        agent_name: str,
        action: str,
        finding: str,
        confidence: float = 0.85,
        contract_id: Optional[str] = None,
    ):
        entry = AuditEntry(
            agent_name=agent_name,
            action=action,
            finding=finding,
            confidence=confidence,
            contract_id=contract_id or _current_contract.get(),
        )
        self.audit_log.append(entry)
        return entry

    def contract_audit(self, contract_id: str) -> list[AuditEntry]:
        """Return only audit entries tagged with this contract (prevents leakage
        across multiple analyses run in the same backend process)."""
        return [e for e in self.audit_log if e.contract_id == contract_id]

    # ── Serialise for API ──
    def to_graph_data(self, contract_id: str) -> dict:
        """Return D3-friendly nodes + edges for a single contract."""
        nodes = []
        links = []

        contract = self.contracts.get(contract_id)
        if not contract:
            return {"nodes": [], "links": []}

        nodes.append({
            "id": contract.id, "label": contract.title,
            "type": "contract", "risk": contract.risk_score,
        })

        for c in self.contract_clauses(contract_id):
            nodes.append({
                "id": c.id, "label": f"§{c.clause_id}",
                "type": "clause", "risk": c.risk_score,
                "clause_type": c.clause_type, "risk_level": c.risk_level,
                "flagged": c.flagged, "text": c.text[:120],
            })
            links.append({"source": contract.id, "target": c.id, "type": "contains"})

        for d in self.contract_definitions(contract_id):
            nodes.append({
                "id": d.id, "label": d.term,
                "type": "definition", "risk": 0,
            })
            links.append({"source": contract.id, "target": d.id, "type": "defines"})

        for p in self.contract_parties(contract_id):
            nodes.append({
                "id": p.id, "label": p.name,
                "type": "party", "risk": 0, "role": p.role,
            })
            links.append({"source": contract.id, "target": p.id, "type": "involves"})

        # Contradiction edges
        for e in self.edges:
            if e.edge_type == "contradicts":
                links.append({
                    "source": e.source, "target": e.target,
                    "type": "contradicts",
                    "severity": e.data.get("severity", "potential"),
                })

        return {"nodes": nodes, "links": links}


# Global singleton
graph = KnowledgeGraph()
