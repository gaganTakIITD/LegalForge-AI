"""Cross-clause structural rules -- deterministic, not LLM fallbacks."""

def has_liability_cap(text: str) -> bool {
    t = text.lower();
    if "liability" not in t {
        return False;
    }
    return "shall not exceed" in t or ("cap" in t and "$" in t) or "aggregate liability" in t;
}

def has_uncapped_indemnity(text: str) -> bool {
    t = text.lower();
    if "indemnif" not in t {
        return False;
    }
    return "no cap" in t or "without limit" in t or "uncapped" in t or "unlimited" in t;
}

def detect_liability_indemnity_conflict(text_a: str, kind_a: str, text_b: str, kind_b: str) -> dict {
    cap_text = "";
    ind_text = "";
    if kind_a == "liability" and kind_b == "indemnification" {
        cap_text = text_a;
        ind_text = text_b;
    } elif kind_b == "liability" and kind_a == "indemnification" {
        cap_text = text_b;
        ind_text = text_a;
    } else {
        if has_liability_cap(text_a) {
            cap_text = text_a;
        } elif has_liability_cap(text_b) {
            cap_text = text_b;
        }
        if has_uncapped_indemnity(text_a) {
            ind_text = text_a;
        } elif has_uncapped_indemnity(text_b) {
            ind_text = text_b;
        }
    }
    if not cap_text or not ind_text {
        return {};
    }
    if not has_liability_cap(cap_text) or not has_uncapped_indemnity(ind_text) {
        return {};
    }
    return {
        "contradicts": True,
        "severity": "direct",
        "explanation": "Liability is capped but indemnification is uncapped -- indemnity can exceed the liability limit.",
        "confidence": 0.94,
        "rule": "liability_cap_vs_uncapped_indemnity"
    };
}

def detect_ownership_conflict(text_a: str, text_b: str) -> dict {
    parties_a = ["client", "buyer", "developer", "vendor"];
    targets = ["the work", "work product", "deliverables"];
    for p1 in parties_a {
        for p2 in parties_a {
            if p1 == p2 {
                continue;
            }
            for tgt in targets {
                owns1 = (p1 in text_a.lower() and "own" in text_a.lower() and tgt in text_a.lower());
                owns2 = (p2 in text_b.lower() and "own" in text_b.lower() and tgt in text_b.lower());
                if owns1 and owns2 {
                    return {
                        "contradicts": True,
                        "severity": "direct",
                        "explanation": f"Opposing ownership of {tgt}: {p1} vs {p2}.",
                        "confidence": 0.97,
                        "rule": "ownership_literal"
                    };
                }
            }
        }
    }
    return {};
}

def adjudicate_structural_pair(text_a: str, kind_a: str, text_b: str, kind_b: str) -> dict {
    r = detect_ownership_conflict(text_a, text_b);
    if r {
        return r;
    }
    r = detect_liability_indemnity_conflict(text_a, kind_a, text_b, kind_b);
    if r {
        return r;
    }
    return {};
}
