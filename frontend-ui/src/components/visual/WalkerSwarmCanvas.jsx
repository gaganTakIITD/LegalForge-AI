import { motion } from 'framer-motion'
import { useMemo } from 'react'
import { AGENTS } from '../../lib/constants'

const RADIUS = 38
const CENTER = { x: 50, y: 50 }

const CLAUSE_LABELS = [
  'Liability §5.2',
  'Indemnity §6.1',
  'Term §3',
  'IP §8',
  'Data §11',
  'Termination §14',
]

function nodePos(i, total) {
  const angle = (i / total) * Math.PI * 2 - Math.PI / 2
  return {
    x: CENTER.x + Math.cos(angle) * RADIUS,
    y: CENTER.y + Math.sin(angle) * RADIUS,
  }
}

export default function WalkerSwarmCanvas({
  mode = 'idle',
  walkerStatus = {},
  className = '',
  showLabels = false,
}) {
  const clauses = useMemo(
    () =>
      CLAUSE_LABELS.map((label, i) => ({
        id: i,
        label,
        risk: i === 0 || i === 1 || i === 4,
        ...nodePos(i, CLAUSE_LABELS.length),
      })),
    [],
  )

  const conflictEdges = useMemo(
    () => [
      [0, 1],
      [4, 5],
    ],
    [],
  )

  return (
    <div className={`walker-canvas ${mode} ${className}`}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className="walker-svg">
        <defs>
          <radialGradient id="rootGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.55" />
            <stop offset="60%" stopColor="#10b981" stopOpacity="0.18" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <radialGradient id="riskGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <pattern id="dotGrid" width="6" height="6" patternUnits="userSpaceOnUse">
            <circle cx="0.5" cy="0.5" r="0.4" fill="rgba(161,161,170,0.18)" />
          </pattern>
        </defs>

        <rect x="0" y="0" width="100" height="100" fill="url(#dotGrid)" opacity="0.4" />

        <circle cx={CENTER.x} cy={CENTER.y} r="20" fill="url(#rootGlow)" />

        {clauses.map((c) => (
          <line
            key={`spoke-${c.id}`}
            x1={CENTER.x}
            y1={CENTER.y}
            x2={c.x}
            y2={c.y}
            stroke="rgba(161,161,170,0.22)"
            strokeWidth="0.35"
          />
        ))}

        {conflictEdges.map(([a, b], i) => {
          const A = clauses[a]
          const B = clauses[b]
          return (
            <motion.line
              key={`conflict-${i}`}
              x1={A.x}
              y1={A.y}
              x2={B.x}
              y2={B.y}
              stroke="#ef4444"
              strokeWidth="0.6"
              strokeDasharray="1.4 0.9"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.4, 0.95, 0.4] }}
              transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.6 }}
            />
          )
        })}

        {clauses.map((c, i) => (
          <g key={`node-${c.id}`}>
            {c.risk && (
              <motion.circle
                cx={c.x}
                cy={c.y}
                r="6"
                fill="url(#riskGlow)"
                animate={{ opacity: [0.3, 0.75, 0.3], scale: [0.9, 1.15, 0.9] }}
                transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.25 }}
                style={{ transformOrigin: `${c.x}px ${c.y}px` }}
              />
            )}
            <motion.circle
              cx={c.x}
              cy={c.y}
              r={c.risk ? 2.4 : 2}
              fill={c.risk ? '#ef4444' : '#60a5fa'}
              stroke={c.risk ? '#fca5a5' : '#93c5fd'}
              strokeWidth="0.4"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1 + i * 0.06, type: 'spring', stiffness: 220 }}
              style={{ transformOrigin: `${c.x}px ${c.y}px` }}
            />
            {showLabels && (
              <text
                x={c.x}
                y={c.y - 4.5}
                textAnchor="middle"
                fontSize="2.2"
                fill="rgba(250,250,250,0.7)"
                fontFamily="'JetBrains Mono', monospace"
              >
                {c.label}
              </text>
            )}
          </g>
        ))}

        <motion.circle
          cx={CENTER.x}
          cy={CENTER.y}
          r="4"
          fill="#10b981"
          stroke="#fafafa"
          strokeWidth="0.5"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ transformOrigin: `${CENTER.x}px ${CENTER.y}px` }}
        />
        <text
          x={CENTER.x}
          y={CENTER.y + 8.5}
          textAnchor="middle"
          fontSize="2.3"
          fill="rgba(16,185,129,0.85)"
          fontFamily="'JetBrains Mono', monospace"
          letterSpacing="0.2"
        >
          CONTRACT
        </text>

        {AGENTS.map((agent, i) => {
          const target = clauses[i % clauses.length]
          const status = walkerStatus[agent.key]
          const speed = mode === 'active' ? 2.2 : 4.5
          const delay = i * 0.35
          const isDone = status === 'done'
          const isRunning = status === 'running'
          const opacity = mode === 'idle' ? 0.85 : isDone ? 0.5 : isRunning ? 1 : 0.3

          return (
            <motion.circle
              key={`walker-${agent.key}`}
              r={isRunning ? 1.6 : 1.2}
              fill={agent.color}
              stroke="rgba(255,255,255,0.85)"
              strokeWidth="0.25"
              initial={{ cx: CENTER.x, cy: CENTER.y, opacity: 0 }}
              animate={{
                cx: [CENTER.x, target.x, CENTER.x],
                cy: [CENTER.y, target.y, CENTER.y],
                opacity,
              }}
              transition={{
                duration: speed,
                repeat: Infinity,
                delay,
                ease: 'easeInOut',
              }}
              style={{
                filter: `drop-shadow(0 0 1.2px ${agent.color})`,
              }}
            />
          )
        })}
      </svg>
    </div>
  )
}
