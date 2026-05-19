import { useState, useEffect, useCallback, useMemo } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Shield, LogOut } from 'lucide-react'
import Ambient from './Ambient'
import PhaseRail from './workflow/PhaseRail'
import WorkflowStepper from './workflow/WorkflowStepper'
import IntakeStage from './workflow/IntakeStage'
import SwarmStage from './workflow/SwarmStage'
import CommandCenter from './workflow/CommandCenter'
import JacRuntimePill from './visual/JacRuntimePill'
import { makeCaseId } from './visual/CaseFile'
import { AGENTS } from '../lib/constants'
import { fetchSample, analyze } from '../lib/api'

export default function Workspace({ token, user, onLogout, initialSample }) {
  const [phase, setPhase] = useState('intake')
  const [sample, setSample] = useState(initialSample || null)
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  const [jurisdiction, setJurisdiction] = useState('US')
  const [perspective, setPerspective] = useState('buyer')
  const [loadMsg, setLoadMsg] = useState('')
  const [results, setResults] = useState(null)
  const [agentStatus, setAgentStatus] = useState({})
  const [agentLogs, setAgentLogs] = useState({})
  const [swarmProgress, setSwarmProgress] = useState(0)
  const [caseId, setCaseId] = useState(() => makeCaseId())
  const [analysisStartedAt, setAnalysisStartedAt] = useState(null)
  const [analysisDurationSec, setAnalysisDurationSec] = useState(null)

  const timeSavedMin = useMemo(() => {
    if (!results?.clauses?.length) return null
    const baseline = 30 + results.clauses.length * 6
    const actualMin = analysisDurationSec ? Math.max(1, Math.round(analysisDurationSec / 60)) : 1
    return Math.max(15, baseline - actualMin)
  }, [results, analysisDurationSec])

  const loadSample = useCallback(
    async (id) => {
      setSample(id)
      setLoadMsg('Loading sample…')
      try {
        const d = await fetchSample(id, token)
        setText(d.text)
        setTitle(d.title)
      } catch (e) {
        console.error(e)
      } finally {
        setLoadMsg('')
      }
    },
    [token],
  )

  useEffect(() => {
    if (initialSample && token) loadSample(initialSample)
  }, [initialSample, token, loadSample])

  const runAnalyze = async () => {
    if (!text.trim()) return
    setPhase('swarm')
    setResults(null)
    setSwarmProgress(0)
    setAnalysisStartedAt(Date.now())
    const st = {}
    AGENTS.forEach((a) => {
      st[a.key] = 'pending'
    })
    setAgentStatus({ ...st })
    setAgentLogs({})

    try {
      const fetchPromise = analyze(
        {
          contract_text: text,
          title: title || 'Untitled',
          jurisdiction,
          party_perspective: perspective,
        },
        token,
      )

      for (let i = 0; i < AGENTS.length; i++) {
        const a = AGENTS[i]
        setAgentStatus((prev) => ({ ...prev, [a.key]: 'running' }))
        setAgentLogs((prev) => ({ ...prev, [a.key]: a.running }))
        setSwarmProgress(Math.round(((i + 0.5) / AGENTS.length) * 100))
        await new Promise((r) => setTimeout(r, 650 + i * 100))
        setAgentStatus((prev) => ({ ...prev, [a.key]: 'done' }))
        setSwarmProgress(Math.round(((i + 1) / AGENTS.length) * 100))
      }

      const data = await fetchPromise
      const logs = {}
      AGENTS.forEach((a) => {
        logs[a.key] = a.done(data)
      })
      setAgentLogs(logs)
      setResults(data)
      setAnalysisDurationSec(Math.round((Date.now() - (analysisStartedAt || Date.now())) / 1000))
      await new Promise((r) => setTimeout(r, 400))
      setPhase('intel')
    } catch (e) {
      alert(`Analysis error: ${e.message}`)
      setPhase('intake')
    }
  }

  const restart = () => {
    setPhase('intake')
    setResults(null)
    setAgentStatus({})
    setAgentLogs({})
    setSwarmProgress(0)
    setCaseId(makeCaseId())
    setAnalysisStartedAt(null)
    setAnalysisDurationSec(null)
  }

  return (
    <div className="workspace">
      <Ambient />
      <header className="workspace-header">
        <div className="brand compact">
          <div className="brand-mark sm">
            <Shield size={16} />
          </div>
          <strong>
            LegalForge <span>AI</span>
          </strong>
        </div>
        <div className="header-mid">
          <span className="case-tag mono">{caseId}</span>
          <JacRuntimePill phase={phase} />
        </div>
        <div className="header-user">
          <span>{user?.name}</span>
          <span className="role-pill">{user?.role}</span>
          <button type="button" className="btn-ghost" onClick={onLogout}>
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </header>

      <div className="workspace-grid">
        <PhaseRail phase={phase} />
        <main className="workspace-main">
          <WorkflowStepper
            phase={phase}
            onPhase={(p) => {
              if (p === 'intake') restart()
              if (p === 'intel' && results) setPhase('intel')
            }}
          />
          <AnimatePresence mode="wait">
            {phase === 'intake' && (
              <IntakeStage
                key="intake"
                sample={sample}
                text={text}
                title={title}
                jurisdiction={jurisdiction}
                perspective={perspective}
                loadMsg={loadMsg}
                onSelectSample={loadSample}
                onText={setText}
                onTitle={setTitle}
                onJurisdiction={setJurisdiction}
                onPerspective={setPerspective}
                onLaunch={runAnalyze}
                canLaunch={!!text.trim()}
                caseId={caseId}
              />
            )}
            {phase === 'swarm' && (
              <SwarmStage
                key="swarm"
                title={title}
                agentStatus={agentStatus}
                agentLogs={agentLogs}
                progress={swarmProgress}
                caseId={caseId}
              />
            )}
            {phase === 'intel' && results && (
              <CommandCenter
                key="intel"
                results={results}
                onRestart={restart}
                caseId={caseId}
                timeSavedMin={timeSavedMin}
              />
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
