import { motion } from 'framer-motion'
import { Loader2, Check, Network } from 'lucide-react'
import { AGENTS } from '../../lib/constants'
import WalkerSwarmCanvas from '../visual/WalkerSwarmCanvas'
import JacConsole from '../visual/JacConsole'

export default function SwarmStage({ title, agentStatus, agentLogs, progress }) {
  const activeAgent = AGENTS.find((a) => agentStatus[a.key] === 'running')
  const completedCount = AGENTS.filter((a) => agentStatus[a.key] === 'done').length

  return (
    <motion.div
      className="swarm-stage"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="swarm-grid">
        <div className="swarm-canvas-wrap panel">
          <div className="swarm-canvas-head">
            <div>
              <span className="eyebrow">Live traversal</span>
              <h2>{title || 'Contract'}</h2>
            </div>
            <div className="swarm-canvas-meta">
              <div className="meta-stat">
                <span>Walkers</span>
                <strong>{completedCount}/{AGENTS.length}</strong>
              </div>
              <div className="meta-stat">
                <span>Active</span>
                <strong style={{ color: activeAgent?.color || '#94a3b8' }}>
                  {activeAgent?.name || 'Standby'}
                </strong>
              </div>
              <div className="meta-stat">
                <span>Progress</span>
                <strong>{progress}%</strong>
              </div>
            </div>
          </div>
          <WalkerSwarmCanvas mode="active" walkerStatus={agentStatus} className="full" />
          <div className="swarm-progress-track">
            <motion.div
              className="swarm-progress-fill"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>

        <div className="swarm-feed panel">
          <div className="feed-header">
            <Network size={16} />
            <h3>Walker activity</h3>
          </div>
          <ul className="agent-feed-list">
            {AGENTS.map((a, i) => {
              const I = a.icon
              const st = agentStatus[a.key]
              const log = agentLogs[a.key]
              return (
                <motion.li
                  key={a.key}
                  className={`feed-row ${st || ''}`}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <div className="feed-icon" style={{ color: a.color, background: `${a.color}14` }}>
                    {st === 'running' ? (
                      <Loader2 size={16} className="spin" />
                    ) : st === 'done' ? (
                      <Check size={16} />
                    ) : (
                      <I size={16} />
                    )}
                  </div>
                  <div className="feed-body">
                    <div className="feed-top">
                      <strong>{a.name}</strong>
                      <span className="mono">walker_{a.key}</span>
                    </div>
                    <p>{log || (st === 'running' ? a.running : st === 'done' ? a.role : 'Queued')}</p>
                  </div>
                  <div className="feed-status-pill">
                    {st === 'done' ? 'done' : st === 'running' ? 'running' : 'idle'}
                  </div>
                </motion.li>
              )
            })}
          </ul>
        </div>
      </div>

      <JacConsole agentStatus={agentStatus} />
    </motion.div>
  )
}
