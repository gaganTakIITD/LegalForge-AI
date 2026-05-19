import { motion } from 'framer-motion'
import { Network, Flame, AlertOctagon } from 'lucide-react'

export default function WorkspaceMetrics({ phase, agentStatus = {}, results }) {
  const walkersDone = Object.values(agentStatus).filter((s) => s === 'done').length
  const walkersRunning = Object.values(agentStatus).filter((s) => s === 'running').length
  const conflicts = results?.contradictions?.length ?? 0
  const compliance = results?.compliance_issues?.length ?? 0

  return (
    <motion.div
      className="workspace-metrics"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="ws-metric">
        <Flame size={13} />
        <span>Walkers</span>
        <strong>
          {walkersRunning > 0
            ? `${walkersRunning} live`
            : walkersDone > 0
            ? `${walkersDone} done`
            : '6 ready'}
        </strong>
      </div>
      <div className="ws-metric">
        <Network size={13} />
        <span>Phase</span>
        <strong>
          {phase === 'intake' && 'Awaiting contract'}
          {phase === 'swarm' && 'Traversing graph'}
          {phase === 'intel' && 'Verdict ready'}
        </strong>
      </div>
      <div className="ws-metric">
        <AlertOctagon size={13} />
        <span>Threats</span>
        <strong className={conflicts + compliance > 0 ? 'hot' : ''}>
          {phase === 'intel' ? `${conflicts + compliance} caught` : 'standby'}
        </strong>
      </div>
    </motion.div>
  )
}
