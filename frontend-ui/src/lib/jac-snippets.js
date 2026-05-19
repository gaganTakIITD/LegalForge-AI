export const JAC_SNIPPETS = {
  contradiction: `walker walker_contradiction {
    has clause_pairs: list = [];
    has findings: list = [];

    can compare with clause entry {
        # adversarial pairwise check across the graph
        for sibling in here.connected_clauses() {
            if conflicts(here.text, sibling.text) {
                self.findings += [
                    Contradiction(a=here, b=sibling)
                ];
            }
        }
    }

    can report with exit { return self.findings; }
}`,

  parser: `walker walker_parser {
    has graph_root: contract_node;

    can spawn with contract_text entry {
        for clause in segment(here.text) {
            spawn clause_node(
                id=clause.id,
                text=clause.body,
                risk_score=score(clause)
            );
        }
    }
}`,

  risk: `walker walker_risk {
    can score with clause entry {
        here.risk_score = weighted_rubric(
            severity(here.text),
            obligation_count(here),
            jurisdiction(here.contract)
        );
    }
}`,
}

export function tokenizeJac(src) {
  const KEYWORDS = new Set([
    'walker', 'has', 'can', 'with', 'entry', 'exit', 'for', 'in', 'if', 'spawn', 'return', 'self',
    'list', 'str', 'int', 'float', 'bool', 'true', 'false',
  ])
  const out = []
  const re = /(\w+|#[^\n]*|"[^"]*"|\s+|.)/g
  let m
  while ((m = re.exec(src)) !== null) {
    const tok = m[0]
    if (/^#/.test(tok)) out.push({ k: 'comment', v: tok })
    else if (/^"/.test(tok)) out.push({ k: 'string', v: tok })
    else if (KEYWORDS.has(tok)) out.push({ k: 'kw', v: tok })
    else if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(tok)) {
      if (/^[A-Z]/.test(tok)) out.push({ k: 'type', v: tok })
      else out.push({ k: 'ident', v: tok })
    } else if (/^\s+$/.test(tok)) out.push({ k: 'ws', v: tok })
    else out.push({ k: 'punc', v: tok })
  }
  return out
}
