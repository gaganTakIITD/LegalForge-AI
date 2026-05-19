"""LegalForge AI -- Agent 1: Parser Agent Walker"""

import from graph.nodes {
    Contract, Clause, Definition, Party, AuditEntry,
    contains, defines, involves
}
import from tools.legal_tools { get_timestamp }
import from byllm.lib { Model }

glob llm = Model(model_name="gemini/gemini-pro-latest");
walker ParserAgent {
    """Decomposes raw contract text into a semantic clause graph."""
    has contract_text: str = "";
    has contract_title: str = "Untitled Contract";
    has result: dict = {};
    # All LLM methods return a JSON string; we parse it inside the walker
    # because byllm 0.4 requires fully-typed schemas which legal data resists.
    def parse_into_clauses(text: str) -> str
        by llm(
            incl_info=(self.contract_title,),
            reason="Split this legal contract into individual clauses. Return a JSON array string. Each element MUST have keys: clause_id (string like '1.1'), text (full clause text), section (section name), page_number (int), clause_type (one of: obligation, right, definition, condition, remedy). Return ONLY the JSON array, no prose."
        );

    def extract_definitions(text: str) -> str
        by llm(
            reason="Extract all defined terms and their meanings from this contract. Return ONLY a JSON array of objects with keys: term, meaning, scope (global or section-specific). No prose."
        );

    def identify_parties(text: str) -> str
        by llm(
            reason="Identify all parties in this contract. Return ONLY a JSON array of objects with keys: name, role (buyer, seller, licensor, licensee, guarantor, service_provider, or client), obligations (array of strings), rights (array of strings). No prose."
        );

    can build_graph with `root entry {
        contract_node = Contract(
            title=self.contract_title,
            upload_date=get_timestamp()
        );
        here ++> contract_node;

        # Quota-safe parser path: always use deterministic clause chunking.
        clauses_data = [];
        clause_count = 0;

        fallback_chunks = [];
        ::py::
        import re
        text = (self.contract_text or "").strip()
        rows = []
        if text:
            parts = re.split(r"\n(?=\d+(?:\.\d+)?\s)", text)
            for i, part in enumerate(parts):
                part = part.strip()
                if not part:
                    continue
                m = re.match(r"^(\d+(?:\.\d+)?)\s*(.*)$", part, re.S)
                if m:
                    cid = m.group(1)
                    rest = (m.group(2) or "").strip()
                    section = rest.split("\n")[0][:120] if rest else ""
                    rows.append({
                        "clause_id": cid,
                        "text": part,
                        "section": section,
                        "page_number": 1,
                        "clause_type": "obligation",
                    })
                elif i == 0 and len(parts) > 1:
                    rows.append({
                        "clause_id": "0",
                        "text": part,
                        "section": "Preamble",
                        "page_number": 1,
                        "clause_type": "definition",
                    })
        fallback_chunks = rows
        ::py::
        if fallback_chunks {
            clauses_data = fallback_chunks;
        }

        if clauses_data {
            for c in clauses_data {
                cid = "";
                ctxt = "";
                csec = "";
                cpage = 1;
                ctype = "obligation";
                ::py::
                if isinstance(c, dict):
                    cid = str(c.get("clause_id", ""))
                    ctxt = str(c.get("text", ""))
                    csec = str(c.get("section", ""))
                    cpage = int(c.get("page_number", 1) or 1)
                    ctype = str(c.get("clause_type", "obligation") or "obligation")
                ::py::
                if ctxt {
                    if not cid {
                        cid = str(clause_count + 1);
                    }
                    clause_node = Clause(
                        clause_id=cid,
                        text=ctxt,
                        section=csec,
                        page_number=cpage,
                        clause_type=ctype
                    );
                    contract_node +>:contains:+> clause_node;
                    clause_count += 1;
                }
            }
        }

        # Quota-safe path: keep definitions empty unless deterministic rules are added.
        defs_data = [];
        def_count = 0;
        if defs_data and isinstance(defs_data, list) {
            for d in defs_data {
                if isinstance(d, dict) {
                    def_node = Definition(
                        term=str(d.get("term", "")),
                        meaning=str(d.get("meaning", "")),
                        scope=str(d.get("scope", "global"))
                    );
                    contract_node +>:defines:+> def_node;
                    def_count += 1;
                }
            }
        }

        # Quota-safe path: keep parties empty unless deterministic extraction is added.
        parties_data = [];
        party_count = 0;
        if parties_data and isinstance(parties_data, list) {
            for p in parties_data {
                if isinstance(p, dict) {
                    party_node = Party(
                        name=str(p.get("name", "")),
                        role=str(p.get("role", "")),
                        obligations=p.get("obligations", []),
                        rights=p.get("rights", [])
                    );
                    contract_node +>:involves:+> party_node;
                    party_count += 1;
                }
            }
        }

        # Audit log
        audit = AuditEntry(
            timestamp=get_timestamp(),
            agent_name="ParserAgent",
            action="contract_parsed",
            finding=f"Parsed {clause_count} clauses, {def_count} definitions, {party_count} parties",
            confidence=1.0
        );
        here ++> audit;

        self.result = {
            "status": "parsed",
            "clauses": clause_count,
            "fallback_candidates": len(fallback_chunks),
            "definitions": def_count,
            "parties": party_count
        };
        report self.result;
    }
}
