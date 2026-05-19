import { motion } from 'framer-motion'
import {
  Shield,
  ChevronRight,
  Play,
  Eye,
  Code2,
  ArrowRight,
  Briefcase,
  Clock,
} from 'lucide-react'
import Ambient from './Ambient'
import WalkerSwarmCanvas from './visual/WalkerSwarmCanvas'
import CaseFile from './visual/CaseFile'
import JacCodePeek from './visual/JacCodePeek'
import CodeBadge from './visual/CodeBadge'
import { MACRO_FLOW, AGENTS } from '../lib/constants'

const COMPARISON = [
  {
    title: 'Manual review',
    sub: 'Senior counsel, 4–6 hours',
    points: [
      'Linear text scan',
      'Misses cross-clause conflicts',
      'No audit trail',
      'Charges by the hour',
    ],
    tone: 'old',
  },
  {
    title: 'Single-pass LLM',
    sub: 'GPT-4 prompt, $$$ tokens',
    points: [
      'One agent does everything',
      'Hallucinates citations',
      'Black box reasoning',
      'No graph attribution',
    ],
    tone: 'mid',
  },
  {
    title: 'LegalForge',
    sub: 'Six Jac walkers · graph-native',
    points: [
      'Pairwise clause comparison',
      'Verifiable graph traversal',
      'Walker-attributed findings',
      'Immutable audit trail',
    ],
    tone: 'new',
  },
]

const STATS = [
  { value: '~4h', label: 'Saved per matter' },
  { value: '6', label: 'Specialized walkers' },
  { value: '100%', label: 'Findings attributable' },
  { value: '0', label: 'Black boxes' },
]

export default function Landing({ onStart, onDemo }) {
  return (
    <div className="landing">
      <Ambient />
      <div className="landing-inner">
        <motion.nav
          className="landing-nav"
          initial={{ y: -16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <div className="brand">
            <div className="brand-mark">
              <Shield size={18} />
            </div>
            <div>
              <strong>LegalForge AI</strong>
              <span>Jac graph-native contract intelligence</span>
            </div>
          </div>
          <div className="nav-actions">
            <a
              className="btn-ghost"
              href="https://github.com/jaseci-labs/jaseci"
              target="_blank"
              rel="noreferrer"
            >
              <Code2 size={14} /> Built on Jac
            </a>
            <button type="button" className="btn-secondary" onClick={onDemo}>
              <Eye size={16} /> Judge demo
            </button>
            <button type="button" className="btn-primary" onClick={onStart}>
              Open workspace <ChevronRight size={16} />
            </button>
          </div>
        </motion.nav>

        <section className="hero">
          <motion.div
            className="hero-copy"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <span className="eyebrow">
              <Briefcase size={12} /> For in-house counsel · founders · M&A teams
            </span>
            <h1>
              Don't read the contract.<br />
              <em>Forge it</em> into a living graph.
            </h1>
            <p className="lede">
              LegalForge is the contract co-pilot for the team that has to sign Monday morning.
              Drop any agreement — we forge a clause-level knowledge graph in Jac, dispatch six
              specialized walkers across it, and hand you back a verdict, the redlines, and an
              audit trail. Every finding is traceable to the walker that produced it.
            </p>
            <div className="hero-ctas">
              <button type="button" className="btn-primary btn-xl" onClick={onDemo}>
                <Play size={18} fill="currentColor" /> Run a live NDA demo
              </button>
              <button type="button" className="btn-secondary btn-xl" onClick={onStart}>
                Open workspace <ArrowRight size={16} />
              </button>
            </div>
            <ol className="pipeline-strip">
              {MACRO_FLOW.map((step, i) => {
                const I = step.icon
                return (
                  <motion.li
                    key={step.title}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 + i * 0.07 }}
                  >
                    <I size={14} />
                    <span>{step.title}</span>
                  </motion.li>
                )
              })}
            </ol>
          </motion.div>

          <motion.div
            className="hero-visual"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15 }}
          >
            <div className="hero-visual-frame">
              <div className="visual-corner corner-tl" />
              <div className="visual-corner corner-tr" />
              <div className="visual-corner corner-bl" />
              <div className="visual-corner corner-br" />
              <WalkerSwarmCanvas mode="idle" />
              <div className="hero-visual-meta">
                <span className="badge-live">
                  <span className="dot-pulse" /> walker swarm
                </span>
                <span className="badge-meta">6 agents · 6 nodes · 2 conflicts</span>
              </div>
            </div>
            <div className="hero-side">
              <CaseFile
                caseId="LF-2026-0042"
                title="Acme × TechStart NDA"
                jurisdiction="US"
                perspective="In-house counsel"
                status="Sample"
                walkerCount={6}
                clauseCount={14}
                compact
              />
              <div className="time-saved-card">
                <Clock size={14} />
                <div>
                  <strong>4h 12m</strong>
                  <span>saved vs manual review</span>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        <motion.section
          className="stats-strip"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          {STATS.map((s) => (
            <div key={s.label}>
              <strong>{s.value}</strong>
              <span>{s.label}</span>
            </div>
          ))}
        </motion.section>

        <motion.section
          className="code-strip"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="code-strip-copy">
            <span className="eyebrow">Built on Jac</span>
            <h2>One walker per agent. The graph is the source of truth.</h2>
            <p>
              Every agent in LegalForge is a Jac walker — a small, composable program that traverses
              clause nodes, reads context, and writes findings back to the graph. No glue code, no
              orchestration framework. The graph itself coordinates the swarm.
            </p>
            <ul className="code-feature-list">
              <li>
                <strong>Pairwise contradiction detection</strong> as native graph traversal
              </li>
              <li>
                <strong>Immutable audit trail</strong> — every walker action is a graph edge
              </li>
              <li>
                <strong>Composable</strong> — drop a new walker into the swarm in &lt;50 lines
              </li>
            </ul>
          </div>
          <CodeBadge />
        </motion.section>

        <motion.section
          className="comparison"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="section-head">
            <span className="eyebrow">Why graph-native matters</span>
            <h2>The same contract, three ways</h2>
          </div>
          <div className="comparison-grid">
            {COMPARISON.map((c, i) => (
              <motion.article
                key={c.title}
                className={`comparison-card panel tone-${c.tone}`}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <div className="comparison-head">
                  <strong>{c.title}</strong>
                  <span>{c.sub}</span>
                </div>
                <ul>
                  {c.points.map((p) => (
                    <li key={p}>
                      <span className="bullet" />
                      {p}
                    </li>
                  ))}
                </ul>
              </motion.article>
            ))}
          </div>
        </motion.section>

        <motion.section
          className="agents-section"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="section-head">
            <span className="eyebrow">The swarm</span>
            <h2>Six walkers, one graph</h2>
            <p>
              Each agent is a single Jac walker definition. The UI shows what each one contributed —
              no black boxes.
            </p>
          </div>
          <div className="agents-grid">
            {AGENTS.map((a, i) => {
              const I = a.icon
              return (
                <motion.article
                  key={a.key}
                  className="agent-tile panel"
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04 }}
                  whileHover={{ y: -4 }}
                  style={{ '--agent-color': a.color }}
                >
                  <div
                    className="agent-tile-icon"
                    style={{ color: a.color, background: `${a.color}1f`, borderColor: `${a.color}55` }}
                  >
                    <I size={20} />
                  </div>
                  <div className="agent-tile-meta">
                    <span className="agent-num">0{i + 1}</span>
                    <h3>{a.name}</h3>
                  </div>
                  <p>{a.role}</p>
                  <span className="agent-tile-tag mono">{a.file}</span>
                </motion.article>
              )
            })}
          </div>
          <div className="jac-peek-wrap">
            <JacCodePeek defaultAgent="contradiction" />
          </div>
        </motion.section>

        <motion.section
          className="cta-section panel"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div>
            <span className="eyebrow">Ready for judges</span>
            <h2>One click. Full demo. Audit trail included.</h2>
            <p>
              The judge demo signs you in, opens a sample matter with deliberate traps, and walks
              the swarm in front of you — verdict, redlines, and graph in under a minute.
            </p>
          </div>
          <button type="button" className="btn-primary btn-xl" onClick={onDemo}>
            <Play size={18} fill="currentColor" /> Start judge demo
          </button>
        </motion.section>

        <footer className="landing-footer">
          <span>
            Built on <span className="accent">Jac</span> · Six walkers · One graph · JacHacks Spring
            2026
          </span>
        </footer>
      </div>
    </div>
  )
}
