import { motion } from 'framer-motion'
import { Zap, Scale, GitBranch } from 'lucide-react'
import { WALKER_BY_FINDING } from '../../lib/constants'

export default function IssueSpotlight({ issues, activeId, onSelect }) {
  if (!issues?.length) {
    return (
      <motion.div className="issues-empty panel">
        <p>No critical issues in the top layer — open the Report tab for the full executive summary.</p>
      </motion.div>
    )
  }

  return (
    <motion.section className="issues-section">
      <div className="issues-head">
        <h3>Issues spotlight</h3>
        <span className="muted">Click to inspect on the graph</span>
      </div>
      <div className="issues-scroller">
        {issues.map((issue, i) => {
          const Icon = issue.type === 'compliance' ? Scale : Zap
          const walker = WALKER_BY_FINDING[issue.type] || `${issue.type}_walker`
          return (
            <motion.button
              key={issue.id}
              type="button"
              className={`issue-chip panel ${activeId === issue.id ? 'active' : ''} kind-${issue.type}`}
              onClick={() => onSelect(issue)}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              whileHover={{ y: -2 }}
            >
              <div className="issue-chip-row">
                <span className={`issue-kind ${issue.type}`}>
                  <Icon size={14} /> {issue.type}
                </span>
                <span className={`sev sev-${(issue.severity || 'medium').toLowerCase()}`}>
                  {issue.severity || 'flagged'}
                </span>
              </div>
              <strong>{issue.title}</strong>
              <p>{issue.body}</p>
              <span className="walker-trace mono">
                <GitBranch size={11} /> found by {walker}
              </span>
            </motion.button>
          )
        })}
      </div>
    </motion.section>
  )
}
