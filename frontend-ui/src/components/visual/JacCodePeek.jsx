import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Code2, ChevronDown } from 'lucide-react'
import { JAC_CODE, AGENTS } from '../../lib/constants'

export default function JacCodePeek({ defaultAgent = 'contradiction' }) {
  const [active, setActive] = useState(defaultAgent)
  const [open, setOpen] = useState(false)
  const code = JAC_CODE[active]
  const agent = AGENTS.find((a) => a.key === active)

  return (
    <div className="jac-peek">
      <button
        type="button"
        className={`jac-peek-toggle ${open ? 'open' : ''}`}
        onClick={() => setOpen((v) => !v)}
      >
        <Code2 size={14} />
        <span>View Jac walker source</span>
        <code className="mono">{agent?.file}</code>
        <ChevronDown size={14} className="chev" />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="jac-peek-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="jac-peek-tabs">
              {Object.keys(JAC_CODE).map((k) => {
                const a = AGENTS.find((x) => x.key === k)
                return (
                  <button
                    key={k}
                    type="button"
                    className={`jac-peek-tab ${active === k ? 'active' : ''}`}
                    onClick={() => setActive(k)}
                    style={active === k ? { color: a?.color, borderColor: `${a?.color}55` } : undefined}
                  >
                    {a?.name || k}
                  </button>
                )
              })}
            </div>
            <pre className="jac-peek-code">
              <code>{code}</code>
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
