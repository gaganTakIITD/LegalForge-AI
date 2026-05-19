"""
Contract knowledge mesh — reference/modifies edges and graph-native traversal
for walker coordination (Jac OSP mirror: references, modifies, contradicts).
"""

from __future__ import annotations

import re
from typing import Iterable

from graph.models import graph, Edge, Clause
from graph.clause_classifier import (
    classify_all_clauses,
    FOUNDATIONAL_KINDS,
    CROSS_KIND_CANDIDATES,
    classify_clause,
)

_REF_PATTERNS = [
    re.compile(r"\b[Ss]ection\s+(\d+(?:\.\d+)*)", re.I),
    re.compile(r"\b[Ss]ections?\s+(\d+(?:\.\d+)*)\s+and\s+(\d+(?:\.\d+)*)", re.I),
    re.compile(r"§\s*(\d+(?:\.\d+)*)"),
    re.compile(r"\b[Aa]rticle\s+(\d+)", re.I),
    re.compile(r"\b(?:clause|paragraph)\s+(\d+(?:\.\d+)*)", re.I),
]

_MODIFIES_PATTERNS = [
    re.compile(r"\bnotwithstanding\b[^.]{0,80}\b[Ss]ection\s+(\d+(?:\.\d+)*)", re.I),
    re.compile(r"\bsubject to\b[^.]{0,80}\b[Ss]ection\s+(\d+(?:\.\d+)*)", re.I),
    re.compile(r"\bexcept as (?:provided|set forth) in\b[^.]{0,80}\b[Ss]ection\s+(\d+(?:\.\d+)*)", re.I),
]


def _clause_id_index(clauses: list[Clause]) -> dict[str, Clause]:
    """Map normalized clause_id strings to clause nodes."""
    idx: dict[str, Clause] = {}
    for c in clauses:
        cid = (c.clause_id or "").strip()
        if cid:
            idx[cid] = c
            # Also index parent section (5 from 5.2)
            if "." in cid:
                parent = cid.rsplit(".", 1)[0]
                idx.setdefault(parent, c)
    return idx


def _extract_references(text: str) -> list[str]:
    refs: list[str] = []
    for pat in _REF_PATTERNS:
        for m in pat.finditer(text):
            groups = [g for g in m.groups() if g]
            refs.extend(groups)
    return refs


def build_reference_edges(contract_id: str) -> int:
    clauses = graph.contract_clauses(contract_id)
    idx = _clause_id_index(clauses)
    created = 0
    for src in clauses:
        for ref_id in _extract_references(src.text or ""):
            tgt = idx.get(ref_id)
            if not tgt or tgt.id == src.id:
                continue
            if _edge_exists(src.id, tgt.id, "references"):
                continue
            graph.edges.append(Edge(
                source=src.id,
                target=tgt.id,
                edge_type="references",
                data={"context": f"references §{ref_id}"},
            ))
            created += 1
    return created


def build_modifies_edges(contract_id: str) -> int:
    clauses = graph.contract_clauses(contract_id)
    idx = _clause_id_index(clauses)
    created = 0
    for src in clauses:
        text = src.text or ""
        for pat in _MODIFIES_PATTERNS:
            for m in pat.finditer(text):
                ref_id = m.group(1)
                tgt = idx.get(ref_id)
                if not tgt or tgt.id == src.id:
                    continue
                if _edge_exists(src.id, tgt.id, "modifies"):
                    continue
                scope = "limits" if "notwithstanding" in m.group(0).lower() else "extends"
                graph.edges.append(Edge(
                    source=src.id,
                    target=tgt.id,
                    edge_type="modifies",
                    data={"scope": scope, "context": m.group(0)[:120]},
                ))
                created += 1
    return created


def _edge_exists(source: str, target: str, edge_type: str) -> bool:
    return any(
        e.source == source and e.target == target and e.edge_type == edge_type
        for e in graph.edges
    )


def enrich_contract_graph(contract_id: str) -> dict:
    """Post-parse mesh build: classify clauses + semantic edges."""
    clauses = graph.contract_clauses(contract_id)
    classify_all_clauses(clauses)
    ref_n = build_reference_edges(contract_id)
    mod_n = build_modifies_edges(contract_id)
    graph.add_audit(
        "GraphMesh",
        "mesh_enriched",
        f"classified {len(clauses)} clauses; {ref_n} reference edges; {mod_n} modifies edges",
    )
    return {
        "clauses": len(clauses),
        "reference_edges": ref_n,
        "modifies_edges": mod_n,
    }


def clause_neighbors(
    clause_node_id: str,
    edge_types: Iterable[str] | None = None,
) -> list[Clause]:
    """Clauses connected by outbound or inbound mesh edges."""
    types = set(edge_types or ("references", "modifies", "contradicts"))
    neighbor_ids: set[str] = set()
    for e in graph.edges:
        if e.edge_type not in types:
            continue
        if e.source == clause_node_id:
            neighbor_ids.add(e.target)
        if e.target == clause_node_id:
            neighbor_ids.add(e.source)
    return [graph.clauses[nid] for nid in neighbor_ids if nid in graph.clauses]


def candidate_contradiction_pairs(clauses: list[Clause]) -> list[tuple[Clause, Clause]]:
    """
    Graph-pruned pair set: reference/modifies links + cross-kind substantive matrix.
    Avoids O(n²) on boilerplate-heavy agreements.
    """
    if len(clauses) < 2:
        return []

    seen: set[tuple[str, str]] = set()
    pairs: list[tuple[Clause, Clause]] = []

    def add(a: Clause, b: Clause) -> None:
        if a.id == b.id:
            return
        key = tuple(sorted((a.id, b.id)))
        if key in seen:
            return
        seen.add(key)
        pairs.append((a, b))

    # 1) Mesh-linked pairs (Jac references / modifies)
    for e in graph.edges:
        if e.edge_type not in ("references", "modifies"):
            continue
        a = graph.clauses.get(e.source)
        b = graph.clauses.get(e.target)
        if a and b:
            add(a, b)

    # 2) Cross-kind substantive matrix
    substantive = [c for c in clauses if (c.clause_kind or "general") not in FOUNDATIONAL_KINDS]
    for i, ca in enumerate(substantive):
        ka = ca.clause_kind or "general"
        for cb in substantive[i + 1:]:
            kb = cb.clause_kind or "general"
            if ka == kb and ka != "ip_assignment":
                continue
            if frozenset({ka, kb}) in CROSS_KIND_CANDIDATES or ka == "general" or kb == "general":
                add(ca, cb)

    # 3) Same-kind liability/indemnity layers in REMEDIES sections often split across clauses
    by_kind: dict[str, list[Clause]] = {}
    for c in substantive:
        k = c.clause_kind or "general"
        by_kind.setdefault(k, []).append(c)
    if "liability" in by_kind and "indemnification" in by_kind:
        for la in by_kind["liability"]:
            for ib in by_kind["indemnification"]:
                add(la, ib)

    return pairs


def mesh_context_for_clause(contract_id: str, clause: Clause, max_nodes: int = 10) -> str:
    """Linked graph block for Forge — actual mesh neighbors, not arbitrary slices."""
    lines: list[str] = []
    neighbors = clause_neighbors(clause.id)
    # Prioritize contradicts, then modifies/references
    contradicts = [n for n in neighbors if _linked_via(clause.id, n.id, "contradicts")]
    modifies = [n for n in neighbors if _linked_via(clause.id, n.id, "modifies")]
    refs = [n for n in neighbors if _linked_via(clause.id, n.id, "references")]

    ordered: list[Clause] = []
    for group in (contradicts, modifies, refs):
        for n in group:
            if n.id not in {x.id for x in ordered}:
                ordered.append(n)

    # Fill with same-kind substantive if sparse
    if len(ordered) < 4:
        kind = clause.clause_kind or classify_clause(clause.text, clause.section)
        for c in graph.contract_clauses(contract_id):
            if c.id == clause.id:
                continue
            if c.clause_kind == kind and c.id not in {x.id for x in ordered}:
                ordered.append(c)
            if len(ordered) >= max_nodes:
                break

    for c in ordered[:max_nodes]:
        excerpt = re.sub(r"\s+", " ", c.text or "")[:160]
        rel = []
        if _linked_via(clause.id, c.id, "contradicts"):
            rel.append("contradicts")
        if _linked_via(clause.id, c.id, "modifies"):
            rel.append("modifies")
        if _linked_via(clause.id, c.id, "references"):
            rel.append("references")
        rel_s = ",".join(rel) if rel else "related"
        lines.append(
            f"- §{c.clause_id} kind={c.clause_kind or 'general'} "
            f"risk={c.risk_level} via={rel_s} :: {excerpt}"
        )

    for e in graph.edges:
        if e.edge_type != "contradicts":
            continue
        if e.source not in (clause.id,) and e.target not in (clause.id,):
            continue
        expl = re.sub(r"\s+", " ", e.data.get("explanation", ""))[:140]
        sev = e.data.get("severity", "potential")
        lines.append(f"EDGE contradicts(severity={sev}) :: {expl}")

    defs = graph.contract_definitions(contract_id)[:4]
    if defs:
        lines.append("DEFINITIONS:")
        for d in defs:
            lines.append(f"  - {d.term}: {d.meaning[:100]}")

    return "\n".join(lines) if lines else "(no linked nodes)"


def _linked_via(a_id: str, b_id: str, edge_type: str) -> bool:
    return any(
        e.edge_type == edge_type
        and ((e.source == a_id and e.target == b_id) or (e.source == b_id and e.target == a_id))
        for e in graph.edges
    )


def contract_wide_liability_indemnity_clauses(contract_id: str) -> tuple[list[Clause], list[Clause]]:
    caps, indems = [], []
    for c in graph.contract_clauses(contract_id):
        k = c.clause_kind or classify_clause(c.text, c.section)
        if k == "liability":
            caps.append(c)
        elif k == "indemnification":
            indems.append(c)
    return caps, indems
