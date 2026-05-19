import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Download } from 'lucide-react'
import ForceGraph from '../ForceGraph'
import VerdictCard from '../visual/VerdictCard'
import StoryBanner from '../showcase/StoryBanner'
import IssueSpotlight from '../showcase/IssueSpotlight'
import FindingRail from '../showcase/FindingRail'
import AgentTimeline from '../showcase/AgentTimeline'
import JacCodePeek from '../visual/JacCodePeek'
import { buildStory } from '../../lib/analysis'

export default function CommandCenter({ results, onRestart, caseId, timeSavedMin }) {
  const [railMode, setRailMode] = useState('overview')
  const [selectedClause, setSelectedClause] = useState(null)
  const [activeIssue, setActiveIssue] = useState(null)
  const [graphFocus, setGraphFocus] = useState(null)

  const story = useMemo(() => buildStory(results), [results])

  const handleIssue = (issue) => {
    setActiveIssue(issue)
    setRailMode('overview')
    if (issue.clauseAId) {
      setSelectedClause(issue.clauseAId)
      setGraphFocus({ a: issue.clauseAId, b: issue.clauseBId })
    }
  }

  const handleNode = (id) => {
    setSelectedClause(id)
    setRailMode('clause')
    setGraphFocus(null)
  }

  return (
    <motion.div className="command-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="intel-toolbar">
        <div>
          <span className="eyebrow">Matter · {caseId}</span>
          <h2>{results.title || 'Contract analysis'}</h2>
          <p className="muted">
            Traversal complete · {results.clauses?.length ?? 0} clauses · audit trail saved
          </p>
        </div>
        <div className="intel-actions">
          <button type="button" className="btn-ghost">
            <Download size={14} /> Export brief
          </button>
          <button type="button" className="btn-secondary" onClick={onRestart}>
            <RefreshCw size={14} /> New matter
          </button>
        </div>
      </div>

      <VerdictCard story={story} results={results} caseId={caseId} timeSavedMin={timeSavedMin} />

      <StoryBanner story={story} />
      <IssueSpotlight issues={story?.issues} activeId={activeIssue?.id} onSelect={handleIssue} />

      <div className="intel-bento">
        <div className="graph-panel panel">
          <div className="graph-panel-head">
            <div>
              <h3>Clause knowledge graph</h3>
              <span className="muted">Drag nodes · crimson edges = contradictions</span>
            </div>
            <span className="badge-meta">
              {results.clauses?.length ?? 0} nodes · {results.contradictions?.length ?? 0} conflicts
            </span>
          </div>
          <ForceGraph
            graphData={results.graph_data}
            clauses={results.clauses}
            contradictions={results.contradictions}
            selectedId={selectedClause}
            highlightPair={graphFocus}
            onSelect={handleNode}
          />
        </div>
        <FindingRail
          mode={railMode}
          onMode={setRailMode}
          results={results}
          selectedClause={selectedClause}
          selectedIssue={activeIssue}
          story={story}
        />
      </div>

      <AgentTimeline auditLog={results.audit_log} />

      <JacCodePeek defaultAgent="contradiction" />
    </motion.div>
  )
}
