"""LegalForge AI -- Agent 4: Risk Scorer Walker"""

import from graph.nodes { Clause, Contract }
import from tools.legal_tools { get_industry_benchmark, calculate_exposure }
import from byllm.lib { Model }

glob llm = Model(model_name="gemini/gemini-pro-latest");
walker RiskScorerWalker {
    """Assigns numerical risk scores to each clause and overall contract."""
    has total_score: float = 0.0;
    has clause_count: int = 0;
    has clause_scores: list = [];

    can start with Contract entry {
        visit [-->];
    }

    def score_risk(clause_text: str, clause_type: str,
                   has_contradictions: bool, has_violations: bool) -> str
        by llm(
            reason="Score this contract clause risk 0.0-1.0. Return ONLY JSON: {score: float, factors: [string], exposure_estimate: string, recommendation: string}."
        );

    can evaluate with Clause entry {
        contradiction_edges = [<-->];
        has_contradictions = len(contradiction_edges) > 0 if contradiction_edges else False;
        has_violations = here.flagged;

        result = {};
        llm_raw = self.score_risk(
            here.text, here.clause_type,
            has_contradictions, has_violations
        );
        ::py::
        import json, re
        s = llm_raw if isinstance(llm_raw, str) else ""
        m = re.search(r"\{.*\}", s, re.DOTALL)
        try:
            result = json.loads(m.group(0)) if m else {}
        except Exception:
            result = {}
        ::py::

        score = 0.3;
        if isinstance(result, dict) {
            raw = result.get("score", 0.3);
            if isinstance(raw, (int, float)) {
                score = max(0.0, min(1.0, float(raw)));
            }
        }

        if has_contradictions { score = min(1.0, score + 0.15); }
        if has_violations { score = min(1.0, score + 0.2); }

        here.risk_score = score;
        if score >= 0.8 { here.risk_level = "critical"; }
        elif score >= 0.5 { here.risk_level = "high"; }
        elif score >= 0.3 { here.risk_level = "medium"; }
        else { here.risk_level = "low"; }

        self.total_score += score;
        self.clause_count += 1;
        self.clause_scores.append({
            "clause_id": here.clause_id,
            "score": score,
            "risk_level": here.risk_level
        });

        visit [-->];
    }

    can finalize with Contract exit {
        here.risk_score = self.total_score / max(self.clause_count, 1);
        if here.risk_score >= 0.6 { here.status = "flagged"; }
        else { here.status = "analyzed"; }
        report {
            "overall_risk": here.risk_score,
            "clauses_analyzed": self.clause_count,
            "clause_scores": self.clause_scores
        };
    }
}
