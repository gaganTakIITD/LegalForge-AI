import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, X as XIcon } from 'lucide-react'
import { AGENTS } from '../../lib/constants'
import ClauseDiff from './ClauseDiff'
import DealThesisCard from './DealThesisCard'

function Sev({ s }) {
  const c = (s || 'medium').toLowerCase()
  return <span className={`sev sev-${c}`}>{s || 'Medium'}</span>
}

export default function FindingRail({ mode, onMode, results, selectedClause, selectedIssue, story }) {
  const cls = results?.clauses || []
  const clause = cls.find((c) => c.id === selectedClause)

  return (
    <motion.aside className="finding-rail panel" layout>
      <div className="rail-tabs" role="tablist">
        {[
          ['overview', 'Overview'],
          ['clause', 'Clause'],
          ['negotiate', 'Negotiate'],
          ['report', 'Report'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={mode === id}
            className={mode === id ? 'active' : ''}
            onClick={() => onMode(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${mode}-${selectedClause}-${selectedIssue?.id}`}
          className="rail-pane"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
        >
          {mode === 'overview' && (
            <>
              <h4>Swarm summary</h4>
              <p className="muted">{story?.subhead}</p>
              <div className="contrib-grid">
                {AGENTS.map((a) => {
                  const I = a.icon
                  let count = '—'
                  if (a.key === 'parser') count = cls.length
                  if (a.key === 'contradiction') count = results.contradictions?.length ?? 0
                  if (a.key === 'compliance') count = results.compliance_issues?.length ?? 0
                  if (a.key === 'negotiation') count = results.proposals?.length ?? 0
                  if (a.key === 'risk') count = `${story?.stats?.riskPct ?? 0}%`
                  if (a.key === 'report') count = 'Ready'
                  return (
                    <div
                      key={a.key}
                      className="contrib-cell"
                      style={{ borderColor: `${a.color}40` }}
                    >
                      <I size={15} style={{ color: a.color }} />
                      <strong>{a.name}</strong>
                      <span className="contrib-val">{count}</span>
                    </div>
                  )
                })}
              </div>
              {selectedIssue && (
                <motion.div className="rail-focus">
                  <span className="eyebrow">Selected issue</span>
                  <strong>{selectedIssue.title}</strong>
                  <p>{selectedIssue.body}</p>
                </motion.div>
              )}
            </>
          )}

          {mode === 'clause' &&
            (clause ? (
              <>
                <div className="clause-meta">
                  <span className="mono">{clause.clause_id}</span>
                  <Sev s={clause.risk_level} />
                </div>
                <h4>{clause.title}</h4>
                <p className="clause-text">{clause.text}</p>
                <div className="risk-bar">
                  <span style={{ width: `${(clause.risk_score || 0) * 100}%` }} />
                </div>
              </>
            ) : (
              <p className="muted">Click a graph node or issue card to inspect clause text.</p>
            ))}

          {mode === 'negotiate' && (
            <div className="proposals-list">
              <h4>Redline proposals</h4>
              <p className="muted">
                Side-by-side diff. Strikethrough is removed, gold is added by the Negotiation walker.
              </p>
              {(results.proposals || []).length === 0 && (
                <p className="muted" style={{ marginTop: 16 }}>
                  No negotiation proposals for this contract.
                </p>
              )}
              {(results.proposals || []).map((p, i) => (
                <motion.div
                  key={i}
                  className="redline-card"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="redline-head">
                    <div>
                      <span className="mono">{p.clause}</span>
                      <Sev s={p.impact} />
                    </div>
                    <div className="redline-actions">
                      <button type="button" className="redline-btn good">
                        <CheckCircle2 size={13} /> Accept
                      </button>
                      <button type="button" className="redline-btn bad">
                        <XIcon size={13} /> Reject
                      </button>
                    </div>
                  </div>
                  <ClauseDiff original={p.original} proposed={p.proposed} />
                  {p.rationale && <p className="redline-rationale">{p.rationale}</p>}
                </motion.div>
              ))}
            </div>
          )}

          {mode === 'report' && (
            <div className="report-pane">
              <DealThesisCard
                intent={results.contract_intent}
                documentType={results.document_type}
                demoMode={results.demo_mode}
              />
              <motion.div
                className="report-html glass-card"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08, duration: 0.35 }}
                dangerouslySetInnerHTML={{
                  __html: (results.report || 'No report generated.')
                    .replace(/### (.*)/g, '<h3>$1</h3>')
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\n/g, '<br/>'),
                }}
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.aside>
  )
}
