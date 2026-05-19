import { motion } from 'framer-motion'

function deriveVerdict(story, results) {
  const risk = story?.stats?.riskPct ?? 0
  const conflicts = story?.stats?.contradictions ?? 0
  const compliance = story?.stats?.compliance ?? 0
  const proposals = results?.proposals?.length ?? 0

  if (conflicts > 0 || risk >= 65 || compliance >= 2) {
    return {
      stamp: 'NEGOTIATE',
      tone: 'high',
      ring: 'DO NOT SIGN · NEGOTIATE · DO NOT SIGN · NEGOTIATE',
      headline: conflicts
        ? `${conflicts} direct contradiction${conflicts > 1 ? 's' : ''} would create unbounded exposure if signed as-is.`
        : `Risk exposure measured at ${risk}% with ${compliance} compliance flag${compliance === 1 ? '' : 's'}.`,
      action: proposals
        ? `${proposals} redline${proposals > 1 ? 's' : ''} drafted by walker_negotiation — ready to send to counterparty.`
        : 'Walker_negotiation could not produce safe redlines automatically — manual review required.',
    }
  }
  if (risk >= 35 || compliance >= 1) {
    return {
      stamp: 'REVIEW',
      tone: 'medium',
      ring: 'JUDGEMENT CALL · REVIEW · JUDGEMENT CALL · REVIEW',
      headline: `Moderate exposure at ${risk}% — judgement call required before signature.`,
      action: 'Spot-check the flagged clauses, then proceed.',
    }
  }
  return {
    stamp: 'SIGN-READY',
    tone: 'low',
    ring: 'CLEAN PASS · SIGN-READY · CLEAN PASS · SIGN-READY',
    headline: `Risk ${risk}% with no contradictions detected by walker_contradiction.`,
    action: 'No blocking issues. Audit trail preserved for legal records.',
  }
}

export default function VerdictStamp({ story, results }) {
  if (!story) return null
  const v = deriveVerdict(story, results)

  return (
    <motion.section
      className={`verdict-stamp panel verdict-${v.tone}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55 }}
    >
      <motion.div
        className="seal-wrap"
        initial={{ scale: 0.7, rotate: -18, opacity: 0 }}
        animate={{ scale: 1, rotate: -8, opacity: 1 }}
        transition={{ duration: 0.7, type: 'spring', stiffness: 140, damping: 14 }}
      >
        <svg viewBox="0 0 200 200" className="seal-svg">
          <defs>
            <path id="seal-ring" d="M 100,100 m -78,0 a 78,78 0 1,1 156,0 a 78,78 0 1,1 -156,0" />
            <radialGradient id="seal-bg" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="var(--seal-light)" />
              <stop offset="100%" stopColor="var(--seal-dark)" />
            </radialGradient>
          </defs>
          <circle cx="100" cy="100" r="92" className="seal-outer" />
          <circle cx="100" cy="100" r="84" className="seal-inner" fill="url(#seal-bg)" />
          <circle cx="100" cy="100" r="62" className="seal-line" />
          <text className="seal-ring-text">
            <textPath href="#seal-ring" startOffset="0">
              {v.ring}
            </textPath>
          </text>
          <text x="100" y="98" textAnchor="middle" className="seal-stamp">
            {v.stamp}
          </text>
          <text x="100" y="118" textAnchor="middle" className="seal-meta">
            {story.stats.riskPct}% risk
          </text>
        </svg>
      </motion.div>

      <motion.div
        className="verdict-text"
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.25 }}
      >
        <span className="eyebrow">Forge verdict</span>
        <h2>{v.headline}</h2>
        <p>{v.action}</p>
        <div className="verdict-strip">
          <span><strong>{story.stats.clauses}</strong> clauses parsed</span>
          <span><strong>{story.stats.contradictions}</strong> contradictions</span>
          <span><strong>{story.stats.compliance}</strong> compliance flags</span>
          <span><strong>{story.stats.proposals}</strong> redlines drafted</span>
        </div>
      </motion.div>

      <motion.div
        className="verdict-signature"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <span className="sig-line" />
        <span className="sig-meta">
          <em>LegalForge AI</em>
          <span className="mono">jac · {new Date().toISOString().slice(0, 10)}</span>
        </span>
      </motion.div>
    </motion.section>
  )
}
