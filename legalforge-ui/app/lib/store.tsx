'use client'
import { createContext, useContext, useState, ReactNode } from 'react'

export interface User { name: string; role: string; permissions: string[] }
export interface Clause { id: string; title: string; text: string; risk_score: number; type: string }
export interface Contradiction { clause_a: string; clause_b: string; clause_a_id: string; clause_b_id: string; severity: string; description: string }
export interface ComplianceIssue { clause: string; statute: string; severity: string; issue: string }
export interface Proposal { clause: string; original: string; proposed: string; impact: string }
export interface AuditEntry { timestamp: string; agent: string; action: string; details: string }
export interface AnalysisResult {
  title: string; clauses: Clause[]; contradictions: Contradiction[]
  compliance_issues: ComplianceIssue[]; proposals: Proposal[]
  report: string; audit_log: AuditEntry[]
}

interface AppCtx {
  token: string | null; user: User | null; results: AnalysisResult | null
  agentStatus: Record<string, 'idle'|'running'|'done'>
  setToken: (t: string|null) => void; setUser: (u: User|null) => void
  setResults: (r: AnalysisResult|null) => void
  setAgentStatus: (s: Record<string, 'idle'|'running'|'done'>) => void
}

const Ctx = createContext<AppCtx>({} as AppCtx)
export const useApp = () => useContext(Ctx)

export function AppProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string|null>(null)
  const [user, setUser] = useState<User|null>(null)
  const [results, setResults] = useState<AnalysisResult|null>(null)
  const [agentStatus, setAgentStatus] = useState<Record<string,'idle'|'running'|'done'>>({})
  return <Ctx.Provider value={{ token, user, results, agentStatus, setToken, setUser, setResults, setAgentStatus }}>{children}</Ctx.Provider>
}

export const AGENTS = [
  { key: 'parser',        name: 'Parser',         color: '#67e8f9', desc: 'Semantic clause decomposition' },
  { key: 'contradiction', name: 'Contradictions',  color: '#fb7185', desc: 'Adversarial conflict detection' },
  { key: 'compliance',    name: 'Compliance',      color: '#a78bfa', desc: 'Statute & regulation checking' },
  { key: 'risk',          name: 'Risk Scorer',     color: '#fbbf24', desc: 'Weighted rubric scoring' },
  { key: 'negotiation',   name: 'Negotiation',     color: '#6ee7b7', desc: 'AI-powered clause rewriting' },
  { key: 'report',        name: 'Report',          color: '#c4b5fd', desc: 'Executive summary generation' },
] as const
