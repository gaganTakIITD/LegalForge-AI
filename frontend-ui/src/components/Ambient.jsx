import { motion } from 'framer-motion'

export default function Ambient() {
  return (
    <div className="ambient" aria-hidden>
      <div
        className="ambient-grid"
        style={{
          backgroundImage:
            'linear-gradient(rgba(214,205,182,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(214,205,182,0.04) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }}
      />
      <motion.div
        className="orb orb-a"
        animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="orb orb-b"
        animate={{ x: [0, -50, 0], y: [0, -20, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="ember-field" aria-hidden>
        {[...Array(14)].map((_, i) => (
          <motion.span
            key={i}
            className="ember"
            initial={{ y: '110vh', opacity: 0 }}
            animate={{
              y: '-10vh',
              opacity: [0, 0.85, 0],
              x: [0, (i % 2 ? 14 : -14), 0],
            }}
            transition={{
              duration: 14 + (i % 5) * 3,
              repeat: Infinity,
              delay: i * 1.4,
              ease: 'linear',
            }}
            style={{ left: `${(i * 7.3) % 100}%` }}
          />
        ))}
      </div>
      <div className="ambient-vignette" />
    </div>
  )
}
