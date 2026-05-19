import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Terminal } from 'lucide-react'
import { AGENTS } from '../../lib/constants'

const TEMPLATES = {
  parser: [
    'walker parser_walker spawned at root',
    'visiting node §1 — definitions',
    'visiting node §3 — term',
    'visiting node §5.2 — liability cap',
    'visiting node §6.1 — indemnity',
    'visiting node §11 — data',
    'visiting node §14 — termination',
    'parser exit · 6 clause nodes attached',
  ],
  contradiction: [
    'walker contradiction_walker spawned',
    'pair (§5.2 ↔ §6.1) → embedding similarity 0.81',
    'pair (§5.2 ↔ §6.1) → semantic conflict detected',
    'CONFLICT severity=direct registered on edge',
    'pair (§3 ↔ §14) → no conflict',
    'contradiction exit · 1 conflict edge',
  ],
  compliance: [
    'walker compliance_walker spawned',
    'cross-ref UCC §2-719 against §5.2',
    'cross-ref GDPR Art. 28 against §11',
    'flag: §11 lacks subprocessor disclosure',
    'compliance exit · 1 statute issue',
  ],
  risk: [
    'walker risk_walker spawned',
    'rubric.weight = {liability:0.4, term:0.2, data:0.4}',
    '§5.2 risk = 0.84 (critical)',
    '§6.1 risk = 0.78 (high)',
    '§11 risk = 0.62 (high)',
    'avg risk = 0.71',
  ],
  negotiation: [
    'walker negotiation_walker spawned',
    'proposer drafting redline for §5.2',
    'critic scoring redline · pass',
    'proposer drafting redline for §6.1',
    'critic scoring redline · pass',
    'negotiation exit · 2 proposals',
  ],
  report: [
    'walker report_walker spawned',
    'aggregating findings across nodes',
    'building executive summary',
    'audit log persisted · 18 entries',
    'report exit · ready',
  ],
}

const COLOR_MAP = Object.fromEntries(AGENTS.map((a) => [a.key, a.color]))

function fmtTime(d) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${String(
    d.getMilliseconds(),
  ).padStart(3, '0')}`
}

export default function JacConsole({ agentStatus }) {
  const [lines, setLines] = useState([])
  const lastStatus = useRef({})
  const lastEmit = useRef({})
  const containerRef = useRef(null)

  useEffect(() => {
    const next = []
    AGENTS.forEach((a) => {
      const prev = lastStatus.current[a.key]
      const cur = agentStatus[a.key]
      if (cur && cur !== prev) {
        const tpl = TEMPLATES[a.key] || []
        const slice = tpl.slice(0, cur === 'done' ? tpl.length : Math.max(1, tpl.length - 2))
        const fromIdx = lastEmit.current[a.key] ?? 0
        const newLines = slice.slice(fromIdx).map((text, i) => ({
          id: `${a.key}-${fromIdx + i}-${Date.now()}-${i}`,
          agent: a.key,
          name: a.name,
          color: COLOR_MAP[a.key],
          text,
          ts: new Date(Date.now() + i * 30),
        }))
        next.push(...newLines)
        lastEmit.current[a.key] = slice.length
        lastStatus.current[a.key] = cur
      }
    })
    if (next.length) {
      setLines((prev) => [...prev, ...next].slice(-60))
    }
  }, [agentStatus])

  useEffect(() => {
    const el = containerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lines])

  return (
    <section className="jac-console panel">
      <header className="console-head">
        <div>
          <Terminal size={14} />
          <span>jac runtime · walker traces</span>
        </div>
        <span className="console-pid mono">pid 0x7f3a · graph_root</span>
      </header>
      <div className="console-body" ref={containerRef}>
        <AnimatePresence initial={false}>
          {lines.length === 0 && (
            <motion.div
              key="idle"
              className="console-line idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <span className="console-ts mono">--:--:--.---</span>
              <span className="console-arrow">›</span>
              <span className="console-text">awaiting walker spawn…</span>
            </motion.div>
          )}
          {lines.map((l) => (
            <motion.div
              key={l.id}
              className="console-line"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <span className="console-ts mono">{fmtTime(l.ts)}</span>
              <span className="console-agent mono" style={{ color: l.color }}>
                {l.agent.padEnd(13, ' ')}
              </span>
              <span className="console-arrow" style={{ color: l.color }}>
                ›
              </span>
              <span className="console-text">{l.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  )
}
