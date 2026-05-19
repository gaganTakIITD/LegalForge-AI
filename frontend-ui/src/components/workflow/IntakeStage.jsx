import { motion } from 'framer-motion'
import { Play, FileText, ChevronRight, AlertCircle, Sparkles, Briefcase } from 'lucide-react'
import { SAMPLES, PERSONAS } from '../../lib/constants'
import CaseFile, { makeCaseId } from '../visual/CaseFile'
import { useMemo } from 'react'

export default function IntakeStage({
  sample,
  text,
  title,
  jurisdiction,
  perspective,
  loadMsg,
  onSelectSample,
  onText,
  onTitle,
  onJurisdiction,
  onPerspective,
  onLaunch,
  canLaunch,
  caseId,
}) {
  const selected = SAMPLES.find((s) => s.id === sample)
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0
  const draftCaseId = useMemo(() => caseId || makeCaseId(), [caseId])
  const persona = PERSONAS.find((p) => p.id === perspective) || PERSONAS[0]

  return (
    <motion.div
      className="intake-stage"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      <header className="stage-header">
        <span className="eyebrow">Step 1 · Matter intake</span>
        <h2>Open the matter file</h2>
        <p>
          Tell us who you are reviewing as. The Parser walker turns the contract into a clause graph
          everything else runs on.
        </p>
      </header>

      <CaseFile
        caseId={draftCaseId}
        title={title || (selected ? selected.name : 'Untitled matter')}
        jurisdiction={jurisdiction}
        perspective={persona.label}
        status="Drafting"
      />

      <div className="persona-grid">
        <div className="persona-grid-head">
          <Briefcase size={14} />
          <span className="eyebrow">Reviewing as</span>
        </div>
        {PERSONAS.map((p, i) => (
          <motion.button
            key={p.id}
            type="button"
            className={`persona-card panel ${perspective === p.id ? 'selected' : ''}`}
            onClick={() => onPerspective(p.id)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <strong>{p.label}</strong>
            <span className="persona-sub">{p.sub}</span>
            <span className="persona-aim mono">→ {p.aim}</span>
          </motion.button>
        ))}
      </div>

      <div className="intake-layout">
        <div className="intake-samples">
          <div className="section-subhead">
            <Sparkles size={14} />
            <h3>Curated samples</h3>
            <span className="muted">judges' favorite traps</span>
          </div>
          <div className="sample-grid">
            {SAMPLES.map((s, i) => (
              <motion.button
                key={s.id}
                type="button"
                className={`sample-tile panel ${sample === s.id ? 'selected' : ''}`}
                onClick={() => onSelectSample(s.id)}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -3 }}
              >
                <div className="sample-tile-top">
                  <FileText size={18} />
                  <span className={`pill pill-${s.highlight}`}>{s.tag}</span>
                </div>
                <strong>{s.name}</strong>
                <span className="muted">{s.parties}</span>
                <p>{s.trap}</p>
                {s.valueLabel && <span className="sample-value mono">{s.valueLabel}</span>}
              </motion.button>
            ))}
          </div>
          {selected && (
            <motion.div
              className="trap-panel"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              key={selected.id}
            >
              <AlertCircle size={16} />
              <div>
                <strong>Judge checkpoint · {selected.name}</strong>
                <p>{selected.trap}</p>
              </div>
            </motion.div>
          )}
        </div>

        <div className="intake-editor panel">
          <div className="editor-toolbar">
            <div>
              <h3>Contract body</h3>
              <span className="muted">paste or load a sample — Jac handles the rest</span>
            </div>
            {loadMsg ? (
              <span className="hint">{loadMsg}</span>
            ) : (
              <span className="word-count mono">{wordCount} words</span>
            )}
          </div>
          <textarea
            value={text}
            onChange={(e) => onText(e.target.value)}
            placeholder="Paste full agreement text here…"
            spellCheck={false}
          />
          <div className="editor-meta">
            <input
              value={title}
              onChange={(e) => onTitle(e.target.value)}
              placeholder="Matter title (e.g. Acme × TechStart NDA)"
            />
            <select value={jurisdiction} onChange={(e) => onJurisdiction(e.target.value)}>
              <option value="US">US jurisdiction</option>
              <option value="UK">UK jurisdiction</option>
              <option value="EU">EU jurisdiction</option>
            </select>
          </div>
          <button
            type="button"
            className="btn-primary btn-launch"
            disabled={!canLaunch}
            onClick={onLaunch}
          >
            <Play size={18} fill="currentColor" />
            Dispatch walker swarm
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
