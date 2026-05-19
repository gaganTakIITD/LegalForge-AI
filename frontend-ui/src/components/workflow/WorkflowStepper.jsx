import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { PHASES } from '../../lib/constants'

export default function WorkflowStepper({ phase, onPhase }) {
  const idx = PHASES.findIndex((p) => p.id === phase)

  return (
    <motion.div className="workflow-stepper mobile-only" layout>
      {PHASES.map((p, i) => {
        const done = i < idx
        const active = i === idx
        const clickable = i < idx
        return (
          <button
            key={p.id}
            type="button"
            className={`ws-step ${active ? 'active' : ''} ${done ? 'done' : ''}`}
            disabled={!clickable}
            onClick={() => clickable && onPhase?.(p.id)}
          >
            <span className="ws-dot">{done ? <Check size={12} /> : i + 1}</span>
            {p.label}
          </button>
        )
      })}
    </motion.div>
  )
}
