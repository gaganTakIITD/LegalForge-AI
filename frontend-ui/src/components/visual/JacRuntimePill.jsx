import { motion } from 'framer-motion'

export default function JacRuntimePill({ phase = 'idle' }) {
  const dotClass =
    phase === 'swarm' ? 'dot-pulse warn' : phase === 'intel' ? 'dot-pulse good' : 'dot-pulse'
  const label =
    phase === 'swarm'
      ? 'Walkers traversing'
      : phase === 'intel'
      ? 'Graph intelligence ready'
      : 'Jac runtime ready'

  return (
    <motion.span
      className="runtime-pill"
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
    >
      <span className={dotClass} />
      <span className="rt-label">{label}</span>
      <span className="rt-mono">jac · v0.1</span>
    </motion.span>
  )
}
