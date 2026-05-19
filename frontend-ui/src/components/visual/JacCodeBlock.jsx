import { motion } from 'framer-motion'
import { useState } from 'react'
import { JAC_SNIPPETS, tokenizeJac } from '../../lib/jac-snippets'

const TABS = [
  { key: 'contradiction', label: 'walker_contradiction.jac' },
  { key: 'parser', label: 'walker_parser.jac' },
  { key: 'risk', label: 'walker_risk.jac' },
]

export default function JacCodeBlock() {
  const [active, setActive] = useState('contradiction')
  const tokens = tokenizeJac(JAC_SNIPPETS[active])

  return (
    <motion.div
      className="jac-code panel"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <div className="jac-code-bar">
        <div className="jac-dots">
          <span /><span /><span />
        </div>
        <div className="jac-tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`jac-tab mono ${active === t.key ? 'active' : ''}`}
              onClick={() => setActive(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <span className="jac-runtime mono">jac · runtime</span>
      </div>
      <pre className="jac-pre">
        <code>
          {tokens.map((t, i) => (
            <span key={i} className={`tok-${t.k}`}>
              {t.v}
            </span>
          ))}
        </code>
      </pre>
    </motion.div>
  )
}
