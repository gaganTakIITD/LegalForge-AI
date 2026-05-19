import requests, time

print("Sending analyze request...")
t0 = time.time()
r = requests.post("http://localhost:8000/walker/analyze", json={
    "contract_text": "5. REMEDIES\n5.2 Total liability shall not exceed $10,000.\n\n6. INDEMNIFICATION\n6.1 Recipient shall indemnify Discloser for all losses with no cap.",
    "title": "NDA Quick"
}, timeout=120)
dt = time.time() - t0
d = r.json()
if r.status_code != 200 or "reports" not in d:
    print(f"Time: {dt:.1f}s")
    print(f"Status: {r.status_code}")
    print(f"Error: {d.get('errors', d)[:500] if isinstance(d.get('errors'), str) else d}")
    raise SystemExit(1)
last = d["reports"][-1]
print(f"Time: {dt:.1f}s")
print(f"Status: {r.status_code}")
print(f"Risk: {last.get('risk_score', '?')}")
cr = last.get("contradiction_result", {})
print(f"Contradictions: {cr.get('contradictions_found', '?')}")
print(f"Structural hits: {cr.get('structural_hits', '?')}")
comp = last.get("compliance_result", {})
print(f"Violations: {comp.get('violations_found', '?')}")
neg = last.get("negotiation_result", {})
print(f"Proposals: {neg.get('proposals_generated', '?')}")
pr = last.get("parse_result", {})
print(f"Clauses: {pr.get('clauses', '?')}")
