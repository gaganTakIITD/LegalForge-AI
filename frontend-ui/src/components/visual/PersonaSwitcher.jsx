import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check } from 'lucide-react'
import { PERSONAS } from '../../lib/constants'

export default function PersonaSwitcher({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const active = PERSONAS.find((p) => p.id === value) || PERSONAS[0]
  const Icon = active.icon

  return (
    <div className="persona-switcher">
      <button
        type="button"
        className="persona-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="persona-trigger-icon" style={{ color: active.color, background: `${active.color}18` }}>
          <Icon size={14} />
        </span>
        <span className="persona-trigger-name">{active.name}</span>
        <ChevronDown size={14} className={open ? 'rot' : ''} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <button
              type="button"
              className="persona-backdrop"
              onClick={() => setOpen(false)}
              aria-label="Close"
            />
            <motion.div
              className="persona-menu"
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.18 }}
            >
              <span className="persona-menu-title">Working as</span>
              {PERSONAS.map((p) => {
                const PIcon = p.icon
                const isActive = p.id === value
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`persona-option ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      onChange(p.id)
                      setOpen(false)
                    }}
                  >
                    <span className="persona-option-icon" style={{ color: p.color, background: `${p.color}18` }}>
                      <PIcon size={14} />
                    </span>
                    <span className="persona-option-text">
                      <strong>{p.name}</strong>
                      <span>{p.tag}</span>
                    </span>
                    {isActive && <Check size={14} className="persona-check" />}
                  </button>
                )
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
