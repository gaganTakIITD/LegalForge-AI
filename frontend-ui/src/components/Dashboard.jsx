import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield,
  LogOut,
  Search,
  Loader2,
  Check,
  Zap,
  Scale,
  BarChart3,
  Handshake,
  FileText,
  Sparkles,
} from 'lucide-react'
import Ambient from './Ambient'
import ForceGraph from './ForceGraph'
import DealThesisCard from './showcase/DealThesisCard'
import { fetchSample, analyze } from '../lib/api'

const AGENTS = [
  { key: 'parser', name: 'Parser', icon: Search, color: '#67e8f9' },
  { key: 'contradiction', name: 'Contradictions', icon: Zap, color: '#fb7185' },
  { key: 'compliance', name: 'Compliance', icon: Scale, color: '#a78bfa' },
  { key: 'risk', name: 'Risk', icon: BarChart3, color: '#fbbf24' },
  { key: 'negotiation', name: 'Negotiation', icon: Handshake, color: '#6ee7b7' },
  { key: 'report', name: 'Report', icon: FileText, color: '#c4b5fd' },
]

const SAMPLES = [
  { id: 'nda', emoji: 'ðŸ“‹', name: 'Mutual NDA', tag: 'Liability cap trap' },
  { id: 'saas', emoji: 'â˜ï¸', name: 'SaaS Agreement', tag: 'GDPR issues' },
  { id: 'ma', emoji: 'ðŸ¢', name: 'M&A LOI ($50M)', tag: 'Non-compete risk' },
]

const TABS = [
  { id: 'graph', label: 'Knowledge graph' },
  { id: 'heatmap', label: 'Risk heatmap' },
  { id: 'contradictions', label: 'Contradictions' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'proposals', label: 'Proposals' },
  { id: 'report', label: 'Report' },
  { id: 'audit', label: 'Audit trail' },
]

function Sev({ s }) {
  const c = (s || 'medium').toLowerCase()
  return <span className={`sev ${c}`}>{s || 'Medium'}</span>
}

function DataTable({ cols, rows }) {
  if (!rows?.length) return <p className="empty-msg">No findings in this category.</p>
  return (
    <div className="table-wrap glass-card">
      <table>
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <motion.tr key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
              {r.map((c, j) => (
                <td key={j}>{c}</td>
              ))}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Dashboard({ token, user, onLogout, initialSample }) {
  const [sample, setSample] = useState(initialSample || null)
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  const [jurisdiction, setJurisdiction] = useState('US')
  const [perspective, setPerspective] = useState('buyer')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [agentStatus, setAgentStatus] = useState({})
  const [tab, setTab] = useState('graph')
  const [selectedClause, setSelectedClause] = useState(null)
  const [loadMsg, setLoadMsg] = useState('')

  useEffect(() => {
    if (initialSample && token) loadSample(initialSample)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSample, token])

  const loadSample = async (id) => {
    setSample(id)
    setLoadMsg('Loading sampleâ€¦')
    try {
      const d = await fetchSample(id, token)
      setText(d.text)
      setTitle(d.title)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadMsg('')
    }
  }

  const runAnalyze = async () => {
    if (!text.trim()) return
    setLoading(true)
    setResults(null)
    setTab('graph')
    setSelectedClause(null)
    const st = {}
    AGENTS.forEach((a) => {
      st[a.key] = 'running'
    })
    setAgentStatus(st)

    try {
      const d = await analyze(
        {
          contract_text: text,
          title: title || 'Untitled',
          jurisdiction,
          party_perspective: perspective,
        },
        token,
      )
      for (let i = 0; i < AGENTS.length; i++) {
        await new Promise((r) => setTimeout(r, 280))
        setAgentStatus((prev) => ({ ...prev, [AGENTS[i].key]: 'done' }))
      }
      await new Promise((r) => setTimeout(r, 350))
      setResults(d)
    } catch (e) {
      alert(`Analysis error: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const cls = results?.clauses || []
  const avg = cls.length ? cls.reduce((s, c) => s + (c.risk_score || 0), 0) / cls.length : 0
  const riskColor = avg >= 0.75 ? 'var(--ro)' : avg >= 0.5 ? '#f97316' : avg >= 0.25 ? 'var(--am)' : 'var(--em)'

  const selected = useMemo(
    () => cls.find((c) => c.id === selectedClause),
    [cls, selectedClause],
  )

  const statusLabel = loading ? 'Swarm running' : results ? 'Analysis complete' : 'Ready'

  return (
    <div className="app-shell">
      <Ambient />
      <header className="topbar">
        <motion.div className="tb-brand" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}>
          <motion.div className="tb-logo" whileHover={{ rotate: 8 }}>
            <Shield size={17} />
          </motion.div>
          <div>
            <span className="tb-name">
              LegalForge <span>AI</span>
            </span>
            <span className="tb-tag">Graph contract intelligence</span>
          </div>
        </motion.div>

        <div className="agent-chips">
          {AGENTS.map((a) => {
            const s = agentStatus[a.key]
            return (
              <motion.div
                key={a.key}
                className={`chip ${s || ''}`}
                layout
                whileHover={{ y: -2 }}
              >
                <span className="chip-dot" style={s === 'done' ? { background: a.color } : undefined} />
                {a.name}
              </motion.div>
            )
          })}
        </div>

        <div className="tb-user">
          <span className={`status-pill ${loading ? 'warn' : results ? 'good' : 'info'}`}>
            <Sparkles size={12} /> {statusLabel}
          </span>
          <span>{user?.name}</span>
          <span className="role-badge">{user?.role}</span>
          <button type="button" className="btn-ghost" onClick={onLogout}>
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </header>

      <aside className="sidebar">
        <div className="sb-section">
          <div className="sb-label">Sample contracts</div>
          {SAMPLES.map((s) => (
            <motion.button
              key={s.id}
              type="button"
              className={`sb-btn ${sample === s.id ? 'active' : ''}`}
              onClick={() => loadSample(s.id)}
              whileHover={{ x: 4 }}
            >
              <span className="sb-emoji">{s.emoji}</span>
              <span className="sb-btn-text">
                <strong>{s.name}</strong>
                <small>{s.tag}</small>
              </span>
            </motion.button>
          ))}
        </div>

        <motion.div className="sb-section">
          <div className="sb-label">Contract input</div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste contract text or load a sampleâ€¦"
          />
          <input
            className="sb-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contract title"
          />
          {loadMsg && <p className="sb-hint">{loadMsg}</p>}
        </motion.div>

        <motion.div className="sb-section">
          <div className="sb-label">Analysis settings</div>
          <div className="sb-row">
            <span>Jurisdiction</span>
            <select value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)}>
              <option value="US">ðŸ‡ºðŸ‡¸ United States</option>
              <option value="UK">ðŸ‡¬ðŸ‡§ United Kingdom</option>
              <option value="EU">ðŸ‡ªðŸ‡º European Union</option>
            </select>
          </div>
          <div className="sb-row">
            <span>Perspective</span>
            <select value={perspective} onChange={(e) => setPerspective(e.target.value)}>
              <option value="buyer">Buyer</option>
              <option value="seller">Seller</option>
              <option value="neutral">Neutral</option>
            </select>
          </div>
        </motion.div>

        <motion.button
          type="button"
          className={`btn-launch ${loading ? 'running' : ''}`}
          onClick={runAnalyze}
          disabled={loading || !text.trim()}
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.98 }}
        >
          {loading ? (
            <>
              <Loader2 size={16} className="spin" /> Agent swarm runningâ€¦
            </>
          ) : (
            <>
              <Search size={16} /> Launch agent swarm
            </>
          )}
        </motion.button>
      </aside>

      <main className="main-content">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              className="loading-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div className="loading-card glass-card" layout>
                <Loader2 size={44} className="spin" style={{ color: 'var(--ac)' }} />
                <h3>Walker swarm in progress</h3>
                <p>Six specialized agents traversing the clause graph</p>
                <div className="agent-progress">
                  {AGENTS.map((a, i) => {
                    const I = a.icon
                    const s = agentStatus[a.key]
                    return (
                      <motion.div
                        key={a.key}
                        className={`ap-row ${s}`}
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                      >
                        <I size={16} style={{ color: a.color }} />
                        <span>{a.name}</span>
                        <motion.div className="ap-bar">
                          <motion.div
                            className="ap-fill"
                            animate={{ width: s === 'done' ? '100%' : s === 'running' ? '55%' : '8%' }}
                            style={{ background: s === 'done' ? '#6ee7b7' : a.color }}
                            transition={{ duration: 0.45 }}
                          />
                        </motion.div>
                        {s === 'done' && <Check size={14} style={{ color: '#6ee7b7' }} />}
                      </motion.div>
                    )
                  })}
                </motion.div>
              </motion.div>
            </motion.div>
          ) : results ? (
            <motion.div key="results" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <div className="page-header">
                <div>
                  <h2>{results.title || 'Analysis results'}</h2>
                  <p>
                    {cls.length} clauses Â· {(results.contradictions || []).length} contradictions Â·{' '}
                    {(results.compliance_issues || []).length} compliance flags
                  </p>
                </div>
              </div>

              <div className="stat-row">
                {[
                  ['Clauses', cls.length, 'Parsed', 'var(--cy)'],
                  ['Contradictions', (results.contradictions || []).length, 'Detected', 'var(--ro)'],
                  ['Compliance', (results.compliance_issues || []).length, 'Issues', 'var(--am)'],
                  ['Risk score', `${(avg * 100).toFixed(0)}%`, 'Overall', riskColor],
                ].map(([l, v, s, c], i) => (
                  <motion.div
                    key={l}
                    className="stat-card glass-card"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    whileHover={{ y: -3 }}
                  >
                    <div className="stat-label">{l}</div>
                    <div className="stat-value" style={{ color: c }}>
                      {v}
                    </div>
                    <div className="stat-sub">{s}</div>
                  </motion.div>
                ))}
              </div>

              <div className="tab-bar">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`tab ${tab === t.id ? 'active' : ''}`}
                    onClick={() => setTab(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22 }}
                >
                  {tab === 'graph' && (
                    <div className="graph-layout">
                      <ForceGraph
                        graphData={results.graph_data}
                        clauses={cls}
                        contradictions={results.contradictions}
                        selectedId={selectedClause}
                        onSelect={setSelectedClause}
                      />
                      <motion.div className="clause-inspector glass-card" layout>
                        {selected ? (
                          <>
                            <div className="ci-head">
                              <span className="ci-id">{selected.clause_id}</span>
                              <Sev s={selected.risk_level} />
                            </div>
                            <h4>{selected.title}</h4>
                            <p className="ci-text">{selected.text}</p>
                          </>
                        ) : (
                          <p className="ci-placeholder">Select a node on the graph to inspect clause text and risk.</p>
                        )}
                      </motion.div>
                    </div>
                  )}

                  {tab === 'heatmap' && (
                    <div className="heatmap-grid">
                      {cls.map((c, i) => {
                        const r = c.risk_score || 0
                        const rk = r >= 0.75 ? 'crit' : r >= 0.5 ? 'high' : r >= 0.25 ? 'med' : 'low'
                        return (
                          <motion.button
                            type="button"
                            key={c.id}
                            className={`heat-cell risk-${rk} ${selectedClause === c.id ? 'selected' : ''}`}
                            onClick={() => {
                              setSelectedClause(c.id)
                              setTab('graph')
                            }}
                            initial={{ opacity: 0, scale: 0.92 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.04 }}
                            whileHover={{ y: -4 }}
                          >
                            <motion.div className="hc-id">{c.clause_id}</motion.div>
                            <div className="hc-title">{c.title}</div>
                            <div className="hc-bar">
                              <motion.div
                                className="hc-fill"
                                initial={{ width: 0 }}
                                animate={{ width: `${r * 100}%` }}
                                transition={{ duration: 0.6, delay: i * 0.03 }}
                              />
                            </motion.div>
                          </motion.button>
                        )
                      })}
                    </div>
                  )}

                  {tab === 'contradictions' && (
                    <DataTable
                      cols={['Clause A', 'Clause B', 'Severity', 'Description']}
                      rows={(results.contradictions || []).map((i) => [
                        i.clause_a,
                        i.clause_b,
                        <Sev s={i.severity} />,
                        i.description,
                      ])}
                    />
                  )}

                  {tab === 'compliance' && (
                    <DataTable
                      cols={['Clause', 'Statute', 'Severity', 'Issue']}
                      rows={(results.compliance_issues || []).map((i) => [
                        i.clause,
                        <code className="mono">{i.statute}</code>,
                        <Sev s={i.severity} />,
                        i.issue,
                      ])}
                    />
                  )}

                  {tab === 'proposals' && (
                    <div className="proposals">
                      {(results.proposals || []).map((p, i) => (
                        <motion.div
                          key={i}
                          className="proposal-card glass-card"
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.06 }}
                        >
                          <div className="prop-header">
                            <span className="prop-clause">{p.clause}</span>
                            <Sev s={p.impact} />
                          </div>
                          <div className="prop-body">
                            <div className="prop-side original">
                              <div className="prop-label">Original</div>
                              <p>{p.original}</p>
                            </div>
                            <motion.div className="prop-side proposed">
                              <div className="prop-label">Proposed</div>
                              <p>{p.proposed}</p>
                            </motion.div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {tab === 'report' && (
                    <div className="report-pane">
                      <DealThesisCard
                        intent={results.contract_intent}
                        documentType={results.document_type}
                        demoMode={results.demo_mode}
                      />
                      <motion.div
                        className="report-box glass-card report-html"
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

                  {tab === 'audit' && (
                    <DataTable
                      cols={['Time', 'Agent', 'Action', 'Details']}
                      rows={(results.audit_log || []).map((i) => [
                        <span className="mono">{i.timestamp}</span>,
                        i.agent,
                        i.action,
                        i.details,
                      ])}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              className="empty-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div
                className="empty-icon"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              >
                âš–ï¸
              </motion.div>
              <h2>Ready to analyze</h2>
              <p>Load a sample contract or paste your own â€” then launch the six-agent walker swarm.</p>
              <div className="agent-grid">
                {AGENTS.map((a, i) => {
                  const I = a.icon
                  return (
                    <motion.div
                      key={a.key}
                      className="agent-card glass-card"
                      whileHover={{ y: -5, borderColor: `${a.color}45` }}
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.07 }}
                    >
                      <I size={22} style={{ color: a.color }} />
                      <span>{a.name}</span>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </motion.div>
  )
}

