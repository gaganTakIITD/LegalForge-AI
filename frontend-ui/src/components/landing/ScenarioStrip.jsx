import { motion } from 'framer-motion'
import { SAMPLES } from '../../lib/constants'

export default function ScenarioStrip({ onPick }) {
  return (
    <section className="scenario-strip">
      <div className="section-head left">
        <span className="eyebrow">Real moments</span>
        <h2>The contract on your desk right now</h2>
        <p className="muted">
          Three scenarios every founder hits. Pick one — the swarm runs live with the deliberate
          traps preserved so judges can verify each finding.
        </p>
      </div>
      <div className="scenario-grid">
        {SAMPLES.map((s, i) => {
          const Icon = s.momentIcon
          return (
            <motion.button
              key={s.id}
              type="button"
              className="scenario-card panel"
              onClick={() => onPick(s.id)}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              whileHover={{ y: -5 }}
            >
              <div className="scenario-head">
                <div className="scenario-icon"><Icon size={20} /></div>
                <span className={`pill pill-${s.highlight}`}>{s.tag}</span>
              </div>
              <strong className="scenario-moment">{s.moment}</strong>
              <span className="muted small">{s.parties}</span>
              <p>{s.trap}</p>
              <span className="scenario-cta">
                Forge this contract <span aria-hidden>&rarr;</span>
              </span>
            </motion.button>
          )
        })}
      </div>
    </section>
  )
}
