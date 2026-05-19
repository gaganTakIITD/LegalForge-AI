"""
Test harness — inject contracts directly into the graph (no LLM parser).
"""

from __future__ import annotations

import asyncio
from typing import Any

import _bootstrap  # noqa: F401

from graph.models import graph, Contract, Clause, Edge, set_current_contract, _now
from graph.mesh import enrich_contract_graph
from agents.contradiction import detect_contradictions
from agents.compliance import check_compliance
from agents.risk_scorer import score_risks


def reset_graph() -> None:
    graph.reset()


def inject_contract(
    title: str,
    clauses: list[dict[str, str]],
    jurisdiction: str = "US",
) -> str:
    """Build contract + clause nodes from specs: {id, text, section?}."""
    contract = Contract(title=title, jurisdiction=jurisdiction, upload_date=_now())
    graph.contracts[contract.id] = contract
    set_current_contract(contract.id)

    for spec in clauses:
        c = Clause(
            clause_id=str(spec["id"]),
            text=str(spec["text"]),
            section=str(spec.get("section", f"Section {spec['id']}")),
            clause_type=str(spec.get("clause_type", "obligation")),
        )
        graph.clauses[c.id] = c
        graph.edges.append(Edge(source=contract.id, target=c.id, edge_type="contains"))

    enrich_contract_graph(contract.id)
    return contract.id


async def run_agents(contract_id: str, jurisdiction: str = "US") -> dict[str, Any]:
    contra = await detect_contradictions(contract_id)
    compliance = await check_compliance(contract_id, jurisdiction)
    risk = await score_risks(contract_id)
    return {"contradiction": contra, "compliance": compliance, "risk": risk}


def assert_case(case: dict, results: dict) -> list[str]:
    """Return list of failure messages (empty = pass)."""
    failures: list[str] = []
    exp = case.get("expect", {})
    contra = results["contradiction"]
    comp = results["compliance"]

    n_contra = contra.get("contradictions_found", 0)
    min_c = exp.get("min_contradictions")
    max_c = exp.get("max_contradictions")
    if min_c is not None and n_contra < min_c:
        failures.append(f"expected >={min_c} contradictions, got {n_contra}")
    if max_c is not None and n_contra > max_c:
        failures.append(f"expected <={max_c} contradictions, got {n_contra}")

    forbidden = exp.get("forbidden_pairs", [])
    for fpair in forbidden:
        ka, kb = fpair
        for finding in contra.get("findings", []):
            kinds = {finding.get("kind_a"), finding.get("kind_b")}
            if kinds == {ka, kb}:
                failures.append(f"forbidden contradiction between {ka} and {kb}")

    min_v = exp.get("min_violations")
    max_v = exp.get("max_violations")
    n_v = comp.get("violations_found", 0)
    if min_v is not None and n_v < min_v:
        failures.append(f"expected >={min_v} violations, got {n_v}")
    if max_v is not None and n_v > max_v:
        failures.append(f"expected <={max_v} violations, got {n_v}")

    must_statute = exp.get("must_include_statute")
    if must_statute:
        statutes = {v.get("statute") for v in comp.get("violations", [])}
        if must_statute not in statutes:
            failures.append(f"expected statute {must_statute}, got {statutes}")

    must_rule = exp.get("must_structural_rule")
    if must_rule:
        found = any(
            must_rule in (f.get("explanation") or "")
            or must_rule in str(f)
            for f in contra.get("findings", [])
        )
        if not found and n_contra == 0:
            failures.append(f"expected structural pattern {must_rule}")

    if exp.get("must_flag_liability_indemnity") and n_contra == 0 and n_v == 0:
        failures.append("expected liability/indemnity trap to be flagged")

    return failures
