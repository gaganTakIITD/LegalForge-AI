import { motion } from 'framer-motion'
import { ScrollText } from 'lucide-react'

export function makeCaseId() {
  const yr = new Date().getFullYear()
  const seed = Math.floor(Math.random() * 9000 + 1000)
  return `LF-${yr}-${String(seed).padStart(4, '0')}`
}

export default function CaseFile({
  caseId,
  title = 'Pending intake',
  jurisdiction = '—',
  perspective = '—',
  status = 'Drafting',
  walkerCount,
  clauseCount,
  compact = false,
}) {
  return (
    <motion.div
      className={`case-file ${compact ? 'compact' : ''}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="case-file-header">
        <div className="case-file-seal">
          <ScrollText size={14} />
        </div>
        <div>
          <span className="case-file-eyebrow">Matter file</span>
          <span className="case-file-id mono">{caseId || 'LF-────-────'}</span>
        </div>
        <span className="case-file-status mono">{status}</span>
      </div>
      <div className="case-file-meta">
        <div>
          <span>Title</span>
          <strong>{title}</strong>
        </div>
        <div>
          <span>Jurisdiction</span>
          <strong>{jurisdiction}</strong>
        </div>
        <div>
          <span>Lens</span>
          <strong>{perspective}</strong>
        </div>
        {typeof walkerCount === 'number' && (
          <div>
            <span>Walkers</span>
            <strong>{walkerCount}/6</strong>
          </div>
        )}
        {typeof clauseCount === 'number' && (
          <div>
            <span>Clauses</span>
            <strong>{clauseCount}</strong>
          </div>
        )}
      </div>
    </motion.div>
  )
}
