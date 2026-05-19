import { motion } from 'framer-motion'
import { ShieldAlert, ShieldCheck, Gavel, Stamp } from 'lucide-react'

function deriveVerdict(story, results) {
  const risk = story?.stats?.riskPct ?? 0
  const conflicts = story?.stats?.contradictions ?? 0
  const compliance = story?.stats?.compliance ?? 0
  const proposals = results?.proposals?.length ?? 0

  if (conflicts > 0 || risk >= 65 || compliance >= 2) {
    return {
      label: 'Negotiate',
      tone: 'high',
      headline: conflicts
        ? `${conflicts} direct contradiction${conflicts > 1 ? 's' : ''} detected — signing creates exposure.`
        : `Risk exposure ${risk}% with ${compliance} compliance flag${compliance === 1 ? '' : 's'}.`,
      action: proposals
        ? `${proposals} negotiation redline${proposals > 1 ? 's' : ''} ready for counterparty.`
        : 'Manual negotiation required before counter-signature.',
      Icon: ShieldAlert,
    }
  }
  if (risk >= 35 || compliance >= 1) {
    return {
      label: 'Review',
      tone: 'medium',
      headline: `Moderate exposure at ${risk}% — judgement call required.`,
      action: 'Spot-check flagged clauses before sign-off.',
      Icon: Gavel,
    }
  }
  return {
    label: 'Sign',
    tone: 'low',
    headline: `Risk exposure ${risk}% with no contradictions detected.`,
    action: 'Clean to sign — full audit trail saved for legal.',
    Icon: ShieldCheck,
  }
}

export default function VerdictCard({ story, results, caseId, timeSavedMin }) {
  if (!story) return null
  const v = deriveVerdict(story, results)
  const I = v.Icon

  return (
    <motion.section
      className={`verdict-card panel verdict-${v.tone}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="verdict-stamp-block">
        <span className="verdict-eyebrow">
          <Stamp size={12} /> Forge verdict · {caseId || '—'}
        </span>
        <motion.div
          className="verdict-stamp"
          initial={{ scale: 0.85, opacity: 0, rotate: -4 }}
          animate={{ scale: 1, opacity: 1, rotate: -2 }}
          transition={{ type: 'spring', stiffness: 180, damping: 18, delay: 0.15 }}
        >
          <div className="verdict-stamp-ring">
            <I size={28} strokeWidth={1.6} />
          </div>
          <strong>{v.label}</strong>
          <span className="verdict-stamp-sub">recommendation</span>
        </motion.div>
        <div className="verdict-score">
          <span>Risk score</span>
          <em>{story.stats.riskPct}</em>
          <small>%</small>
        </div>
      </div>
      <div className="verdict-body">
        <h2>{v.headline}</h2>
        <p>{v.action}</p>
        <div className="verdict-stats">
          <span><strong>{story.stats.clauses}</strong> clauses parsed</span>
          <span><strong>{story.stats.contradictions}</strong> contradictions</span>
          <span><strong>{story.stats.compliance}</strong> compliance flags</span>
          <span><strong>{story.stats.proposals}</strong> redlines drafted</span>
          {timeSavedMin && (
            <span className="time-saved">
              <strong>~{timeSavedMin}m</strong> saved vs manual review
            </span>
          )}
        </div>
      </div>
    </motion.section>
  )
}
