import { motion } from 'framer-motion'

export default function AgentTimeline({ auditLog }) {
  const items = auditLog || []
  if (!items.length) return null

  return (
    <motion.section className="audit-section panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h3>Immutable audit trail</h3>
      <p className="muted">Every walker action logged for legal provenance.</p>
      <motion.div className="audit-grid">
        {items.slice(-12).reverse().map((e, i) => (
          <motion.article
            key={`${e.timestamp}-${i}`}
            className="audit-card"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            <motion.div className="audit-top">
              <strong>{e.agent}</strong>
              <span className="mono">{e.timestamp?.slice(11, 19) || ''}</span>
            </motion.div>
            <span className="audit-action">{e.action}</span>
            <p>{e.details}</p>
          </motion.article>
        ))}
      </motion.div>
    </motion.section>
  )
}
