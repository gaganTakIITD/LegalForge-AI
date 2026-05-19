import { motion } from 'framer-motion'
import { Check, FileInput, Network, Gavel } from 'lucide-react'
import { PHASES } from '../../lib/constants'

const ICONS = { intake: FileInput, swarm: Network, intel: Gavel }

const DESC = {
  intake: 'Paste contract text or pick a curated sample.',
  swarm: 'Six Jac walkers — Reader, Litigator, Regulator, Underwriter, Negotiator, Counsel.',
  intel: 'Plain-English verdict, stakes, and counter-language to send back.',
}

export default function PhaseRail({ phase }) {
  const idx = PHASES.findIndex((p) => p.id === phase)

  return (
    <aside className="phase-rail">
      <p className="phase-rail-title">Workflow</p>
      {PHASES.map((p, i) => {
        const Icon = ICONS[p.id]
        const done = i < idx
        const active = i === idx
        return (
          <motion.div
            key={p.id}
            className={`phase-item ${active ? 'active' : ''} ${done ? 'done' : ''}`}
            layout
          >
            <span className="phase-marker">
              {done ? <Check size={14} /> : <Icon size={14} />}
            </span>
            <div>
              <strong>{p.label}</strong>
              <span>{DESC[p.id]}</span>
            </div>
          </motion.div>
        )
      })}
      <div className="phase-rail-footer">
        <span className="mono">jac · v0.1</span>
        <span>graph-native</span>
      </div>
    </aside>
  )
}
