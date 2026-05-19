"""Agent 5: Forge Negotiation Walker -- graph-aware single-pass redlines."""

import from graph.nodes { Contract, Clause }
import from byllm.lib { Model }

glob llm = Model(model_name="gemini/gemini-pro-latest");
walker NegotiationWalker {
    has party_perspective: str = "buyer";
    has proposals: list = [];

    can start with Contract entry {
        visit [-->];
    }

    def evaluate_clause(clause_text: str, clause_kind: str, linked_nodes: str, perspective: str) -> str
        by llm(
            reason=(
                "You are Forge, a surgical contract redline engine. Evaluate CURRENT_CLAUSE "
                "against LINKED_GRAPH_NODES. Flag literal contradictions and compliance failures. "
                "Do NOT flag complementary pairs (IP assignment + IP indemnity). "
                "Return ONLY JSON: {needs_redline: bool, issue_detected: string, proposed_text: string, "
                "impact: low|medium|high, rationale: string, confidence_score: 0.0-1.0}."
            )
        );

    def _linked_context(here: Clause) -> str {
        lines = [];
        neighbors = [<-->];
        for n in neighbors {
            lines.append(f"- §{n.clause_id} kind={n.clause_kind} risk={n.risk_level} :: {n.text[:120]}");
        }
        ref_neighbors = [->:references:->];
        for n in ref_neighbors {
            lines.append(f"- §{n.clause_id} (referenced) :: {n.text[:120]}");
        }
        return "\n".join(lines) if lines else "(no linked nodes)";
    }

    can negotiate with Clause entry {
        if here.risk_level != "high" and here.risk_level != "critical" and not here.flagged {
            visit [-->];
            return;
        }

        linked = self._linked_context(here);
        verdict = {};
        llm_raw = self.evaluate_clause(
            here.text,
            here.clause_kind or "general",
            linked,
            self.party_perspective
        );
        ::py::
        import json, re
        s = llm_raw if isinstance(llm_raw, str) else ""
        m = re.search(r"\{.*\}", s, re.DOTALL)
        try:
            verdict = json.loads(m.group(0)) if m else {}
        except Exception:
            verdict = {}
        ::py::

        if isinstance(verdict, dict) and verdict.get("needs_redline", False) {
            proposed = str(verdict.get("proposed_text", ""));
            if proposed and proposed != here.text {
                self.proposals.append({
                    "clause_id": here.clause_id,
                    "clause_kind": here.clause_kind,
                    "original": here.text,
                    "original_text": here.text,
                    "proposed": proposed,
                    "proposed_text": proposed,
                    "impact": verdict.get("impact", "medium"),
                    "issue_detected": verdict.get("issue_detected", ""),
                    "rationale": verdict.get("rationale", ""),
                    "confidence": verdict.get("confidence_score", 0.0)
                });
            }
        }
        visit [-->];
    }

    can summarize with Contract exit {
        report {
            "agent": "NegotiationWalker",
            "proposals_generated": len(self.proposals),
            "proposals": self.proposals
        };
    }
}
