"""QA matrix for Jac migration — mirrors backend/qa_smoke.py trap expectations."""
import json
import sys
import requests

BASE = "http://127.0.0.1:8000"

EXPECT = {
    "nda": {"contradiction_kw": ["liability", "indemn"], "compliance_kw": [], "min_contra": 1},
    "saas": {"contradiction_kw": [], "compliance_kw": ["data"], "min_comp": 1},
    "ma": {
        "contradiction_kw": ["compete"],
        "compliance_kw": ["non-compete", "compete"],
        "min_comp": 1,
    },
}


def main():
    login = requests.post(
        f"{BASE}/walker/login",
        json={"username": "analyst", "password": "analyst123"},
        timeout=10,
    ).json()["reports"][0]
    token = login["token"]

    all_ok = True
    print("JAC MIGRATION QA (walker/*)")
    print(f"{'sample':6} {'OK':4} {'contra':6} {'comp':5} {'props':5} risk")
    for sid in ["nda", "saas", "ma"]:
        sample = requests.post(
            f"{BASE}/walker/get_sample", json={"sample_id": sid}, timeout=10
        ).json()["reports"][0]
        r = requests.post(
            f"{BASE}/walker/analyze",
            json={
                "contract_text": sample["text"],
                "title": sample["title"],
                "token": token,
                "jurisdiction": "US",
                "party_perspective": "buyer",
            },
            timeout=60,
        )
        if r.status_code != 200:
            print(sid, "HTTP", r.status_code, r.text[:200])
            all_ok = False
            continue
        d = r.json()["reports"][-1]
        contras = d.get("contradictions", [])
        comp = d.get("compliance_issues", [])
        props = d.get("proposals", [])
        blob = json.dumps(contras + comp + props).lower()
        exp = EXPECT[sid]
        ok = d.get("runtime") == "jac-walkers" and len(d.get("clauses", [])) >= 3
        for kw in exp.get("contradiction_kw", []):
            ok = ok and kw in blob
        for kw in exp.get("compliance_kw", []):
            ok = ok and kw in blob
        if "min_contra" in exp:
            ok = ok and len(contras) >= exp["min_contra"]
        if "min_comp" in exp:
            ok = ok and len(comp) >= exp["min_comp"]
        all_ok = all_ok and ok
        print(
            f"{sid:6} {'YES' if ok else 'NO':4} {len(contras):6} {len(comp):5} {len(props):5} "
            f"{d.get('risk_score', 0):.2f}"
        )
        if not ok:
            for c in contras[:2]:
                print("  contra:", c.get("clause_a"), c.get("clause_b"), (c.get("description") or "")[:60])
            for c in comp[:3]:
                print("  comp:", c.get("clause"), (c.get("issue") or "")[:60])

    print("OVERALL:", "COMPLETE" if all_ok else "INCOMPLETE")
    sys.exit(0 if all_ok else 1)


if __name__ == "__main__":
    main()
