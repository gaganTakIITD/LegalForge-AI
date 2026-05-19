"""Agent 2: Contradiction Walker -- graph-mesh cross-clause analysis."""

import from graph.nodes { Contract, Clause, contradicts }
import from tools.clause_classifier { classify_clause, FOUNDATIONAL_KINDS }
import from tools.structural_rules { adjudicate_structural_pair }
import from byllm.lib { Model }

glob llm = Model(model_name="gemini/gemini-pro-latest");
glob COMPLEMENTARY_PAIRS = [
    ["ip_assignment", "indemnification"],
    ["warranty", "indemnification"],
    ["confidentiality", "indemnification"],
    ["liability", "insurance"],
    ["data_processing", "confidentiality"],
];

walker ContradictionWalker {
    has findings: list = [];
    has visited: list = [];
    has comparisons: int = 0;
    has structural_hits: int = 0;
    has all_clauses: list = [];

    can start with Contract entry {
        self.all_clauses = [-->(`?Clause)];
        visit [-->];
    }

    def classify_clause(clause_text: str, clause_section: str) -> str
        by llm(
            reason=(
                "Classify into ONE category: liability, indemnification, ip_assignment, "
                "data_processing, non_compete, termination, renewal, warranty, confidentiality, "
                "governing_law, definition, party_block, recital, signature, notices, "
                "force_majeure, general. Return ONLY the lowercase category name."
            )
        );

    def detect_contradiction(text_a: str, kind_a: str, text_b: str, kind_b: str) -> str
        by llm(
            reason=(
                "Decide if two clauses CONTRADICT (opposing obligations), not merely overlap. "
                "DEFINITE contradictions: capped liability vs uncapped indemnity; fixed term vs "
                "auto-renewal; survival vs wipe-all on termination. "
                "NOT contradictions: IP assignment + IP indemnity; warranty + indemnity. "
                f"Clause A kind={kind_a}, Clause B kind={kind_b}. "
                "Return ONLY JSON: {contradicts: bool, severity: direct|implicit|potential, "
                "explanation: string, confidence: 0.0-1.0}."
            )
        );

    def _pair_match(k1: str, k2: str, pairs: list) -> bool {
        for p in pairs {
            if len(p) == 2 and k1 in p and k2 in p {
                return True;
            }
        }
        return False;
    }

    def _should_compare(kind_a: str, kind_b: str, linked: bool) -> bool {
        if kind_a in FOUNDATIONAL_KINDS or kind_b in FOUNDATIONAL_KINDS { return False; }
        if kind_a == kind_b and kind_a != "ip_assignment" { return False; }
        if self._pair_match(kind_a, kind_b, COMPLEMENTARY_PAIRS) { return False; }
        if linked { return True; }
        cross_pairs = [
            ["liability", "indemnification"],
            ["liability", "warranty"],
            ["termination", "renewal"],
            ["termination", "confidentiality"],
            ["ip_assignment", "ip_assignment"]
        ];
        if self._pair_match(kind_a, kind_b, cross_pairs) { return True; }
        if kind_a == "general" or kind_b == "general" { return True; }
        return False;
    }

    def _is_mesh_linked(a: Clause, b: Clause) -> bool {
        if b.clause_id and b.clause_id in a.text { return True; }
        if a.clause_id and a.clause_id in b.text { return True; }
        return False;
    }

    can analyze with Clause entry {
        if not here.clause_kind {
            here.clause_kind = classify_clause(here.text, here.section);
        }

        all_clauses = self.all_clauses;
        for (prev_id, prev_kind) in self.visited {
            prev_clause = None;
            for c in all_clauses {
                if c.clause_id == prev_id { prev_clause = c; break; }
            }
            if not prev_clause { continue; }

            linked = self._is_mesh_linked(here, prev_clause);
            if not self._should_compare(here.clause_kind, prev_kind, linked) {
                continue;
            }

            self.comparisons += 1;
            structural = adjudicate_structural_pair(
                here.text, here.clause_kind,
                prev_clause.text, prev_kind
            );
            if structural and structural.get("contradicts", False) {
                result = structural;
                self.structural_hits += 1;
            } else {
                result = {};
                llm_raw = self.detect_contradiction(
                    here.text, here.clause_kind,
                    prev_clause.text, prev_kind
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
            }

            if isinstance(result, dict) and result.get("contradicts", False) {
                here +>:contradicts(
                    severity=str(result.get("severity", "potential")),
                    explanation=str(result.get("explanation", "")),
                    confidence=float(result.get("confidence", 0.85))
                ):+> prev_clause;
                here.flagged = True;
                prev_clause.flagged = True;
                self.findings.append({
                    "clause_a": here.clause_id,
                    "clause_b": prev_id,
                    "kind_a": here.clause_kind,
                    "kind_b": prev_kind,
                    "severity": result.get("severity", "potential"),
                    "explanation": result.get("explanation", ""),
                    "confidence": result.get("confidence", 0.85)
                });
            }
        }
        self.visited.append((here.clause_id, here.clause_kind));
        visit [-->];
    }

    can summarize with Contract exit {
        report {
            "agent": "ContradictionWalker",
            "comparisons": self.comparisons,
            "structural_hits": self.structural_hits,
            "contradictions_found": len(self.findings),
            "findings": self.findings
        };
    }
}
