import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Code2, ChevronDown } from 'lucide-react'
import { AGENTS } from '../../lib/constants'

export default function AgentTilesShowcase() {
  const [open, setOpen] = useState(null)

  return (
    <div className="agents-grid">
      {AGENTS.map((a, i) => {
        const I = a.icon
        const expanded = open === a.key
        return (
          <motion.article
            key={a.key}
            className={`agent-tile panel ${expanded ? 'expanded' : ''}`}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.04 }}
            style={{ '--agent-color': a.color }}
          >
            <button
              type="button"
              className="agent-tile-button"
              onClick={() => setOpen(expanded ? null : a.key)}
              aria-expanded={expanded}
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
              <div className="agent-tile-foot">
                <span className="agent-tile-tag mono">walker_{a.key}</span>
                <span className="agent-tile-cta">
                  <Code2 size={12} /> {expanded ? 'hide' : 'view'} jac
                  <ChevronDown
                    size={12}
                    style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                  />
                </span>
              </div>
            </button>
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.pre
                  className="agent-jac-snippet"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <code>{a.jacCode}</code>
                </motion.pre>
              )}
            </AnimatePresence>
          </motion.article>
        )
      })}
    </div>
  )
}
