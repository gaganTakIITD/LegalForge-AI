import { motion } from 'framer-motion'
import { AlertTriangle, Shield } from 'lucide-react'

export default function StoryBanner({ story }) {
  if (!story) return null
  const sev = story.severity || 'medium'
  const hot = sev === 'critical' || sev === 'high' || sev === 'direct'

  return (
    <motion.article className={`story-banner panel sev-${sev}`} layout>
      <motion.div className={`story-icon ${hot ? 'hot' : ''}`}>
        {hot ? <AlertTriangle size={26} /> : <Shield size={26} />}
      </motion.div>
      <motion.div className="story-copy">
        <span className="eyebrow">Primary finding</span>
        <h2>{story.headline}</h2>
        <p>{story.subhead}</p>
      </motion.div>
      <motion.dl className="story-metrics">
        {[
          ['Clauses', story.stats.clauses],
          ['Conflicts', story.stats.contradictions],
          ['Compliance', story.stats.compliance],
          ['Risk', `${story.stats.riskPct}%`],
        ].map(([k, v]) => (
          <motion.div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </motion.div>
        ))}
      </motion.dl>
    </motion.article>
  )
}
