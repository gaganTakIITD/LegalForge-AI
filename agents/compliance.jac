"""Agent 3: Compliance Walker -- kind-mapped statutes + graph-wide structural checks."""

import from graph.nodes { Contract, Clause, governed_by }
import from tools.clause_classifier { FOUNDATIONAL_KINDS }
import from tools.structural_rules { has_liability_cap, has_uncapped_indemnity }
import from byllm.lib { Model }

glob llm = Model(model_name="gemini/gemini-pro-latest");
glob STATUTE_MAP_US = {
    "liability":       ["UCC §2-302"],
    "indemnification": ["UCC §2-302"],
    "data_processing": ["GDPR Art. 28", "CCPA 1798.100"],
    "non_compete":     ["FTC Non-Compete Rule"],
    "renewal":         ["FTC Act §5"],
    "warranty":        ["UCC §2-316"],
    "termination":     ["FTC Act §5"]
};
walker ComplianceWalker {
    has jurisdiction: str = "US";
    has violations: list = [];

    def check_clause_against_statute(clause_text: str, clause_kind: str, statute: str) -> str
        by llm(
            reason=(
                "Strict compliance check: violation=true only when operative language "
                "conflicts with the statute. 'restrict access' is NOT a non-compete. "
                "Return ONLY JSON: {violation: bool, statute: string, violation_detail: string, "
                "severity: critical|high|medium|low, suggested_fix: string, confidence: 0.0-1.0}."
            )
        );

    def _privacy_leak(text: str) -> bool {
        t = text.lower();
        return ("sell" in t or "share" in t) and "personal data" in t and "without" in t and "consent" in t;
    }

    can start with Contract entry {
        all_clauses = [-->(`?Clause)];
        cap_clause = None;
        ind_clause = None;
        for c in all_clauses {
            if has_liability_cap(c.text) { cap_clause = c; }
            if has_uncapped_indemnity(c.text) { ind_clause = c; }
        }
        if cap_clause and ind_clause {
            self.violations.append({
                "clause_id": ind_clause.clause_id,
                "clause_kind": "indemnification",
                "statute": "UCC §2-302",
                "detail": (
                    f"Uncapped indemnity at §{ind_clause.clause_id} vs cap at §{cap_clause.clause_id}."
                ),
                "severity": "high",
                "confidence": 0.93
            });
            ind_clause.flagged = True;
            ind_clause +>:governed_by:+> cap_clause;
        }
        visit [-->];
    }

    can inspect with Clause entry {
        if here.clause_kind in FOUNDATIONAL_KINDS {
            visit [-->];
            return;
        }
        if self._privacy_leak(here.text) {
            here.flagged = True;
            self.violations.append({
                "clause_id": here.clause_id,
                "clause_kind": here.clause_kind or "data_processing",
                "statute": "GDPR Art. 6 / CCPA 1798.120",
                "detail": "Blatant personal-data sale without consent.",
                "severity": "critical",
                "confidence": 0.95
            });
            visit [-->];
            return;
        }

        candidates = STATUTE_MAP_US.get(here.clause_kind, []);
        for statute in candidates {
            result = {};
            llm_raw = self.check_clause_against_statute(here.text, here.clause_kind, statute);
            ::py::
            import json, re
            s = llm_raw if isinstance(llm_raw, str) else ""
            m = re.search(r"\{.*\}", s, re.DOTALL)
            try:
                result = json.loads(m.group(0)) if m else {}
            except Exception:
                result = {}
            ::py::
            if isinstance(result, dict) and result.get("violation", False) {
                here.flagged = True;
                self.violations.append({
                    "clause_id": here.clause_id,
                    "clause_kind": here.clause_kind,
                    "statute": result.get("statute", statute),
                    "detail": result.get("violation_detail", ""),
                    "severity": result.get("severity", "medium"),
                    "confidence": result.get("confidence", 0.8)
                });
                break;
            }
        }
        visit [-->];
    }

    can summarize with Contract exit {
        report {
            "agent": "ComplianceWalker",
            "jurisdiction": self.jurisdiction,
            "violations_found": len(self.violations),
            "violations": self.violations
        };
    }
}
