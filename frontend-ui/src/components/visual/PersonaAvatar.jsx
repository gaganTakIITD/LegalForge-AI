import { motion } from 'framer-motion'

export default function PersonaAvatar({ persona, size = 36 }) {
  if (!persona) return null
  return (
    <motion.div
      className="persona-block"
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <div className="persona-avatar" style={{ width: size, height: size }}>
        <span>{persona.initials}</span>
      </div>
      <div className="persona-meta">
        <strong>{persona.name}</strong>
        <span>
          {persona.role} <i>·</i> {persona.firm}
        </span>
      </div>
    </motion.div>
  )
}
