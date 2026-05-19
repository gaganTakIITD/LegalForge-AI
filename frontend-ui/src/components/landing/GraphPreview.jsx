import { motion } from 'framer-motion'

export default function GraphPreview() {
  return (
    <motion.div
      className="graph-preview"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.25, duration: 0.6 }}
    >
      <svg viewBox="0 0 100 100" className="graph-preview-svg" aria-hidden>
        <line x1="50" y1="50" x2="22" y2="28" className="link" />
        <line x1="50" y1="50" x2="78" y2="32" className="link" />
        <line x1="50" y1="50" x2="28" y2="72" className="link" />
        <line x1="50" y1="50" x2="72" y2="68" className="link" />
        <line x1="78" y1="32" x2="72" y2="68" className="link-hot" />
        <circle cx="50" cy="50" r="18" className="node-root" />
        <circle cx="22" cy="28" r="9" className="node" />
        <circle cx="78" cy="32" r="9" className="node-risk" />
        <circle cx="28" cy="72" r="9" className="node" />
        <circle cx="72" cy="68" r="9" className="node-risk" />
      </svg>
      <div className="graph-preview-legend">
        <span><i className="dot cyan" /> Clause node</span>
        <span><i className="dot rose" /> Conflict edge</span>
      </div>
      <div className="graph-preview-badge">
        <span className="pulse" />
        Walker swarm active
      </div>
    </motion.div>
  )
}
