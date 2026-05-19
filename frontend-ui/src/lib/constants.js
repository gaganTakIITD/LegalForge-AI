import {
  Search,
  Zap,
  Scale,
  BarChart3,
  Handshake,
  FileText,
  Upload,
  Network,
  AlertTriangle,
  Sparkles,
} from 'lucide-react'

export const AGENTS = [
  {
    key: 'parser',
    name: 'Parser',
    icon: Search,
    color: '#60a5fa',
    role: 'Builds the clause knowledge graph',
    running: 'Walking contract text and spawning clause nodes…',
    done: (d) => `Mapped ${d?.clauses?.length ?? 0} clauses into the graph`,
    file: 'agents/parser.jac',
    walker: 'parser_walker',
  },
  {
    key: 'contradiction',
    name: 'Contradictions',
    icon: Zap,
    color: '#ef4444',
    role: 'Adversarial pairwise clause analysis',
    running: 'Comparing every clause pair for conflicts…',
    done: (d) => `Found ${d?.contradictions?.length ?? 0} contradictions`,
    file: 'agents/contradiction.jac',
    walker: 'contradiction_walker',
  },
  {
    key: 'compliance',
    name: 'Compliance',
    icon: Scale,
    color: '#a78bfa',
    role: 'Statute and regulation checker',
    running: 'Cross-referencing UCC, GDPR, CCPA, SOX…',
    done: (d) => `Flagged ${d?.compliance_issues?.length ?? 0} compliance issues`,
    file: 'agents/compliance.jac',
    walker: 'compliance_walker',
  },
  {
    key: 'risk',
    name: 'Risk Scorer',
    icon: BarChart3,
    color: '#f59e0b',
    role: 'Weighted rubric per clause',
    running: 'Scoring exposure on every clause…',
    done: (d) => {
      const cls = d?.clauses ?? []
      const avg = cls.length
        ? cls.reduce((s, c) => s + (c.risk_score || 0), 0) / cls.length
        : 0
      return `Overall contract risk: ${(avg * 100).toFixed(0)}%`
    },
    file: 'agents/risk.jac',
    walker: 'risk_walker',
  },
  {
    key: 'negotiation',
    name: 'Negotiation',
    icon: Handshake,
    color: '#10b981',
    role: 'Proposer–critic clause rewriting',
    running: 'Drafting safer alternative language…',
    done: (d) => `Generated ${d?.proposals?.length ?? 0} negotiation proposals`,
    file: 'agents/negotiation.jac',
    walker: 'negotiation_walker',
  },
  {
    key: 'report',
    name: 'Report',
    icon: FileText,
    color: '#a1a1aa',
    role: 'Executive audit summary',
    running: 'Synthesizing C-suite report…',
    done: () => 'Executive summary ready',
    file: 'agents/report.jac',
    walker: 'report_walker',
  },
]

export const PERSONAS = [
  {
    id: 'buyer',
    label: 'In-house counsel',
    sub: 'reviewing a vendor agreement',
    aim: 'Cap exposure · kill renewal traps',
  },
  {
    id: 'seller',
    label: 'Seller / GTM lead',
    sub: 'shipping the master agreement',
    aim: 'Protect IP · accelerate close',
  },
  {
    id: 'neutral',
    label: 'M&A diligence',
    sub: 'pre-close document review',
    aim: 'Surface every conflict · fast',
  },
]

export const WALKER_BY_FINDING = {
  contradiction: 'contradiction_walker',
  compliance: 'compliance_walker',
  risk: 'risk_walker',
}

export const SAMPLES = [
  {
    id: 'nda',
    name: 'Mutual NDA',
    parties: 'Acme Corp × your startup',
    tag: 'Liability cap trap',
    trap: '§5.2 caps your liability at $10K — but §6.1 indemnification has no cap. Sign this and you eat unlimited downside.',
    highlight: 'direct',
    defaultValue: 50000,
    valueLabel: '$50K typical exposure',
  },
  {
    id: 'saas',
    name: 'Vendor SaaS Agreement',
    parties: 'CloudForge × your startup',
    tag: 'GDPR violations',
    trap: 'Their data-processing terms quietly conflict with retention and subprocessor rules. Auto-renews for 24 months.',
    highlight: 'compliance',
    defaultValue: 250000,
    valueLabel: '$250K annual contract',
  },
  {
    id: 'ma',
    name: 'M&A Term Sheet ($50M)',
    parties: 'Strategic acquirer × you',
    tag: 'Non-compete trap',
    trap: 'Non-compete scope is unconscionable for the deal size. Sign as-is and you can\'t work in your industry for 5 years.',
    highlight: 'risk',
    defaultValue: 50000000,
    valueLabel: '$50M deal value',
  },
]

export const MACRO_FLOW = [
  { icon: Upload, title: 'Drop in', desc: 'Paste any contract' },
  { icon: Network, title: 'Forge graph', desc: 'Jac builds clause network' },
  { icon: AlertTriangle, title: 'Swarm hunts', desc: 'Six walkers traverse' },
  { icon: Sparkles, title: 'Verdict', desc: 'Walk · Negotiate · Sign' },
]

export const PHASES = [
  { id: 'intake', label: 'Drop the contract' },
  { id: 'swarm', label: 'Walker swarm hunts' },
  { id: 'intel', label: 'Verdict · before you sign' },
]

export const JUDGE_STEPS = [
  {
    phase: 'landing',
    title: 'What you are looking at',
    body: 'Six Jac walkers traverse a clause graph in parallel — each one is a small program with a single job. The animation in the hero is the actual swarm shape we run.',
  },
  {
    phase: 'intake',
    title: 'Step 1 · Drop the contract',
    body: 'Pick a curated sample with a deliberate trap, or paste any agreement. The Parser walker turns it into a node-per-clause graph in under a second.',
  },
  {
    phase: 'swarm',
    title: 'Step 2 · Watch the swarm',
    body: 'Each walker spawns at root, traverses clause nodes it cares about, and writes findings back to the graph. The console below is the live trace.',
  },
  {
    phase: 'intel',
    title: 'Step 3 · Read the verdict',
    body: 'Forge stamps NEGOTIATE, REVIEW, or SIGN-READY. Every finding is attributable to a walker — click any node to see who said what.',
  },
]

// Real-ish Jac walker source (used in JacCodePeek to prove this isn't an LLM wrapper)
export const JAC_CODE = {
  parser: `walker parser_walker {
    has clauses: list = [];
    has graph: node = root;

    can ingest with raw entry {
        # Tokenize, segment, normalize
        let segments = segment_clauses(here.text);
        for s in segments {
            spawn here +[contains]-> clause_node(
                id = s.id,
                title = s.heading,
                text = s.body,
                risk_score = 0.0
            );
            clauses.append(s.id);
        }
        report { spawned: |clauses| };
    }
}`,
  contradiction: `walker contradiction_walker {
    has detected: list = [];
    has threshold: float = 0.65;

    can find with clause entry {
        # Visit every other clause for adversarial comparison
        visit [-->] node::clause;
    }

    can compare with clause entry {
        let pair = adversarial_pair(here, ::node);
        if pair.score >= threshold {
            detected.append({
                clause_a: here.id,
                clause_b: ::node.id,
                severity: pair.label,
                rationale: pair.reasoning
            });
        }
    }
}`,
  compliance: `walker compliance_walker {
    has statutes: list = ["UCC", "GDPR", "CCPA", "SOX"];
    has flags: list = [];

    can scan with clause entry {
        for statute in statutes {
            let v = check_statute(here, statute);
            if v.violation {
                flags.append({
                    clause: here.id,
                    statute: statute,
                    issue: v.summary,
                    severity: v.severity
                });
            }
        }
    }
}`,
  risk: `walker risk_walker {
    has rubric: dict = load_rubric();

    can score with clause entry {
        # Weighted multi-factor scoring
        let s = 0.0;
        for (factor, weight) in rubric.items() {
            s += weight * factor.evaluate(here);
        }
        here.risk_score = clamp(s, 0.0, 1.0);
        here.risk_level = bucket(here.risk_score);
    }
}`,
  negotiation: `walker negotiation_walker {
    has proposals: list = [];

    can rewrite with clause entry {
        if here.risk_score < 0.4 { return; }
        # Proposer–critic loop until score drops
        let draft = propose(here);
        let critique = critic(draft, here.context);
        proposals.append({
            clause: here.id,
            original: here.text,
            proposed: critique.final,
            impact: critique.delta
        });
    }
}`,
  report: `walker report_walker {
    has sections: list = [];

    can synthesize with root entry {
        # Aggregate findings from all walkers into exec brief
        sections = [
            verdict_section(),
            top_risks_section(),
            redline_table_section(),
            audit_trail_section()
        ];
        report markdown_render(sections);
    }
}`,
}
