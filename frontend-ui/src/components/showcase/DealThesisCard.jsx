import { motion } from 'framer-motion'
import { Sparkles, Target, CheckCircle2 } from 'lucide-react'

function formatDocType(type) {
  if (!type) return null
  return String(type)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function DealThesisCard({ intent, documentType, demoMode }) {
  if (!intent || (!intent.deal_thesis && !intent.why_parties_enter)) {
    return null
  }

  const priorities = Array.isArray(intent.review_priorities)
    ? intent.review_priorities
    : []

  const docLabel = formatDocType(documentType || intent.document_type)

  return (
    <motion.div
      className="deal-thesis-card glass-card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <motion.div
        className="deal-thesis-card__header"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.3 }}
      >
        <motion.div className="deal-thesis-card__icon" aria-hidden>
          <Sparkles size={18} />
        </motion.div>
        <div>
          <span className="eyebrow">Deal thesis</span>
          <h3 className="deal-thesis-card__title">Why this agreement exists</h3>
        </div>
        {demoMode && <span className="deal-thesis-card__badge">Demo analysis</span>}
      </motion.div>

      <motion.p
        className="deal-thesis-card__thesis"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.35 }}
      >
        {intent.deal_thesis || intent.why_parties_enter}
      </motion.p>

      {intent.why_parties_enter &&
        intent.deal_thesis &&
        intent.why_parties_enter !== intent.deal_thesis && (
          <p className="deal-thesis-card__sub">{intent.why_parties_enter}</p>
        )}

      <div className="deal-thesis-card__meta">
        {docLabel && <span className="deal-thesis-pill">{docLabel}</span>}
        {intent.party_perspective && (
          <span className="deal-thesis-pill">
            <Target size={12} aria-hidden />
            {intent.party_perspective} lens
          </span>
        )}
        {intent.jurisdiction && (
          <span className="deal-thesis-pill mono">{intent.jurisdiction}</span>
        )}
      </div>

      {intent.party_stake && (
        <div className="deal-thesis-card__block">
          <strong>Your stake</strong>
          <p>{intent.party_stake}</p>
        </div>
      )}

      {intent.success_criteria && (
        <div className="deal-thesis-card__block">
          <strong>Clean signature looks like</strong>
          <p>{intent.success_criteria}</p>
        </div>
      )}

      {priorities.length > 0 && (
        <div className="deal-thesis-card__block">
          <strong>Review priorities</strong>
          <ul className="deal-thesis-list">
            {priorities.map((item, i) => (
              <li key={i}>
                <CheckCircle2 size={14} aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  )
}
