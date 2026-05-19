import { motion, AnimatePresence } from 'framer-motion'
import { PERSONAS } from '../../lib/constants'

export default function PersonaSwitch({ persona, onChange }) {
  const active = PERSONAS.find((p) => p.id === persona) || PERSONAS[0]

  return (
    <div className="persona-switch">
      <div className="persona-label">I am a</div>
      <div className="persona-toggle">
        {PERSONAS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`persona-pill ${persona === p.id ? 'active' : ''}`}
            onClick={() => onChange(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.p
          key={active.id}
          className="persona-tagline serif"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.3 }}
        >
          {active.tagline}
        </motion.p>
      </AnimatePresence>
    </div>
  )
}
