import { motion, AnimatePresence } from 'framer-motion'
import { useEffect } from 'react'
import { X, ChevronRight, Compass } from 'lucide-react'
import { JUDGE_STEPS } from '../../lib/constants'

export default function JudgeCoach({ active, phase, onDismiss }) {
  useEffect(() => {
    if (!active) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onDismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, onDismiss])

  if (!active) return null
  const step = JUDGE_STEPS.find((s) => s.phase === phase) || JUDGE_STEPS[0]
  const idx = JUDGE_STEPS.indexOf(step)

  return (
    <AnimatePresence>
      <motion.aside
        key={phase}
        className="judge-coach"
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ type: 'spring', stiffness: 220, damping: 26 }}
      >
        <div className="coach-head">
          <span className="coach-eyebrow">
            <Compass size={12} /> Judge mode · step {idx + 1} of {JUDGE_STEPS.length}
          </span>
          <button type="button" className="coach-close" onClick={onDismiss} aria-label="Exit judge mode">
            <X size={14} />
          </button>
        </div>
        <h4>{step.title}</h4>
        <p>{step.body}</p>
        <div className="coach-progress">
          {JUDGE_STEPS.map((s, i) => (
            <span key={s.phase} className={`coach-tick ${i <= idx ? 'on' : ''}`} />
          ))}
        </div>
        <div className="coach-foot">
          <span className="muted">Press <kbd>Esc</kbd> to exit</span>
          <ChevronRight size={14} className="coach-arrow" />
        </div>
      </motion.aside>
    </AnimatePresence>
  )
}
