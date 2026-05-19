'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Zap, Scale, BarChart3, Handshake, FileText, LogOut, Loader2, Check } from 'lucide-react'
import { AGENTS } from '../lib/store'

const ICONS: Record<string, React.ElementType> = {
  parser: Search, contradiction: Zap, compliance: Scale,
  risk: BarChart3, negotiation: Handshake, report: FileText,
}
const TABS = ['graph','heatmap','contradictions','compliance','proposals','report','audit'] as const
const TAB_LABELS: Record<string,string> = {
  graph:'Graph View', heatmap:'Risk Heatmap', contradictions:'Contradictions',
  compliance:'Compliance', proposals:'Proposals', report:'Report', audit:'Audit Log'
}

export function AppShell({ token, user, onLogout }: { token: string; user: { name: string; role: string }; onLogout: () => void }) {
  const [sample, setSample] = useState('')
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<Record<string,string>>({})
  const [results, setResults] = useState<any>(null)
  const [tab, setTab] = useState('graph')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const loadSample = async (id: string) => {
    setSample(id)
    try {
      const r = await fetch(`/api/samples/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      const d = await r.json(); setText(d.text || ''); setTitle(d.title || id)
    } catch { setText('Sample contract text for ' + id); setTitle(id.toUpperCase()) }
  }

  const analyze = async () => {
    if (!text.trim()) return
    setLoading(true); setResults(null); setTab('graph')
    const st: Record<string,string> = {}; AGENTS.forEach(a => { st[a.key] = 'running' }); setStatus({...st})
    try {
      const r = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ contract_text: text, title: title || 'Untitled' }) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.detail || 'Analysis failed')
      for (let i = 0; i < AGENTS.length; i++) {
        await new Promise(res => setTimeout(res, 300))
        setStatus(prev => ({ ...prev, [AGENTS[i].key]: 'done' }))
      }
      await new Promise(res => setTimeout(res, 400)); setResults(d)
    } catch (e: any) { alert(e.message) } finally { setLoading(false) }
  }

  const drawGraph = useCallback(() => {
    const c = canvasRef.current; if (!c || !results) return
    const ctx = c.getContext('2d')!
    const el = c.parentElement!; c.width = el.offsetWidth * 2; c.height = el.offsetHeight * 2
    c.style.width = el.offsetWidth + 'px'; c.style.height = el.offsetHeight + 'px'
    ctx.scale(2, 2); const W = el.offsetWidth, H = el.offsetHeight; ctx.clearRect(0, 0, W, H)
    const cls = results.clauses || []
    const nodes: any[] = [{ id: 'root', l: results.title || 'Contract', x: W/2, y: H/2, r: 22, col: '#c4b5fd' }]
    cls.forEach((cl: any, i: number) => {
      const a = (2*Math.PI*i/Math.max(cls.length,1)) - Math.PI/2, rad = Math.min(W,H)*.33
      const rs = cl.risk_score||0, col = rs>=.7?'#ff7b90':rs>=.5?'#f97316':rs>=.25?'#ffbf69':'#7dd3ff'
      nodes.push({ id: cl.id||'c'+i, l: cl.title||'Clause '+(i+1), x: W/2+Math.cos(a)*rad, y: H/2+Math.sin(a)*rad, r: 14, col })
    })
    nodes.slice(1).forEach(n => {
      ctx.beginPath(); ctx.strokeStyle='rgba(220,239,255,0.08)'; ctx.lineWidth=1
      ctx.moveTo(nodes[0].x, nodes[0].y); ctx.lineTo(n.x, n.y); ctx.stroke()
    })
    ;(results.contradictions||[]).forEach((cn: any) => {
      const a=nodes.find(n=>n.id===cn.clause_a_id), b=nodes.find(n=>n.id===cn.clause_b_id)
      if(a&&b){ctx.beginPath();ctx.strokeStyle='rgba(255,123,144,.45)';ctx.lineWidth=1.5;ctx.setLineDash([6,4]);ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.setLineDash([])}
    })
    nodes.forEach(n => {
      const g=ctx.createRadialGradient(n.x,n.y,0,n.x,n.y,n.r*2.5);g.addColorStop(0,n.col+'22');g.addColorStop(1,'transparent')
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(n.x,n.y,n.r*2.5,0,Math.PI*2);ctx.fill()
      ctx.beginPath();ctx.arc(n.x,n.y,n.r,0,Math.PI*2);ctx.fillStyle=n.col+'14';ctx.fill()
      ctx.strokeStyle=n.col;ctx.lineWidth=1.5;ctx.stroke()
      ctx.beginPath();ctx.arc(n.x,n.y,4,0,Math.PI*2);ctx.fillStyle=n.col;ctx.fill()
      ctx.fillStyle='var(--text-secondary)';ctx.font='300 9px Manrope,sans-serif';ctx.textAlign='center'
      ctx.fillText(n.l.length>22?n.l.slice(0,20)+'…':n.l, n.x, n.y+n.r+13)
    })
  }, [results])

  useEffect(() => { if (tab==='graph'&&results) setTimeout(drawGraph,80) }, [tab,results,drawGraph])

  const cls = results?.clauses||[], avg = cls.length ? cls.reduce((s:number,c:any)=>s+(c.risk_score||0),0)/cls.length : 0

  return (
    <div style={{ display:'grid', gridTemplateColumns:'260px 1fr', gridTemplateRows:'58px 1fr', height:'100svh', overflow:'hidden' }}>
      {/* Light pools */}
      <div className="lp lp-1" style={{ opacity:0.3 }} />

      {/* Topbar */}
      <header style={{ gridColumn:'1/3', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px', borderBottom:'1px solid var(--glass-stroke)', background:'rgba(10,12,16,0.8)', backdropFilter:'blur(20px)', zIndex:20, position:'relative' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div className="gw-mark" style={{ width:34, height:34, borderRadius:10, flexShrink:0 }}><div className="gw-mark-core" style={{ width:13, height:13 }} /></div>
          <span className="font-display" style={{ fontSize:'0.95rem', fontWeight:700, letterSpacing:'-0.03em' }}>LegalForge <span style={{ color:'var(--text-tertiary)', fontWeight:300, fontFamily:'var(--font-body)' }}>AI</span></span>
        </div>
        {/* Agent status chips */}
        <div style={{ display:'flex', gap:6 }}>
          {AGENTS.map(a => {
            const s = status[a.key]
            const Icon = ICONS[a.key]
            return (
              <div key={a.key} className="pill" style={{ gap:6, fontSize:'0.68rem', borderColor: s==='done'?'rgba(167,243,176,.2)':s==='running'?'rgba(255,191,105,.2)':'var(--glass-stroke)', color: s==='done'?'var(--accent-lime)':s==='running'?'var(--accent-amber)':'var(--text-tertiary)' }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background: s==='done'?'var(--accent-lime)':s==='running'?'var(--accent-amber)':'currentColor', display:'inline-block', ...(s==='running'?{animation:'pulseDot 1.2s ease-in-out infinite'}:{}) }} />
                {a.name}
              </div>
            )
          })}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:'0.88rem', color:'var(--text-secondary)' }}>{user.name}</span>
          <span className="pill" style={{ background:'rgba(125,211,255,.08)', borderColor:'rgba(125,211,255,.2)', color:'var(--accent-cyan)', fontSize:'0.68rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em' }}>{user.role}</span>
          <button onClick={onLogout} className="btn-glass" style={{ padding:'7px 14px', borderRadius:10, fontSize:'0.82rem', display:'flex', alignItems:'center', gap:6, color:'var(--text-secondary)' }}>
            <LogOut size={13}/> Out
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <aside style={{ borderRight:'1px solid var(--glass-stroke)', background:'rgba(10,12,16,0.4)', backdropFilter:'blur(16px)', display:'flex', flexDirection:'column', padding:'16px 14px', gap:16, overflowY:'auto', position:'relative', zIndex:10 }}>
        <div>
          <div style={{ fontSize:'0.62rem', fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--text-tertiary)', marginBottom:10 }}>Samples</div>
          {[['nda','Mutual NDA'],['saas','SaaS Agreement'],['ma','M&A Letter of Intent']].map(([id,name]) => (
            <motion.button key={id} onClick={()=>loadSample(id)} whileHover={{ x:3 }} transition={{ duration:.15 }}
              style={{ width:'100%', textAlign:'left', padding:'10px 12px', borderRadius:12, fontSize:'0.88rem', marginBottom:4, border:'1px solid', cursor:'pointer', transition:'all .18s', background: sample===id?'rgba(125,211,255,.06)':'transparent', borderColor: sample===id?'rgba(125,211,255,.22)':'transparent', color: sample===id?'var(--accent-cyan)':'var(--text-secondary)' }}>
              {name}
            </motion.button>
          ))}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:'0.62rem', fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--text-tertiary)', marginBottom:10 }}>Contract Text</div>
          <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Paste contract text here…" className="auth-input font-mono" style={{ height:140, resize:'vertical', fontSize:'0.78rem', lineHeight:1.6, borderRadius:12 }} />
          <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Contract title" className="auth-input" style={{ marginTop:8, borderRadius:12, padding:'10px 14px', fontSize:'0.88rem' }} />
        </div>
        <motion.button onClick={analyze} disabled={loading||!text.trim()} whileHover={{ y:-3 }} whileTap={{ scale:.97 }}
          className="btn-glass btn-primary" style={{ width:'100%', padding:'13px', borderRadius:14, fontSize:'0.92rem', fontWeight:600, justifyContent:'center', gap:8, opacity: loading||!text.trim()?0.45:1 }}>
          {loading ? <><Loader2 size={16} className="anim-spin"/>Analyzing…</> : <><Search size={15}/>Launch Agent Swarm</>}
        </motion.button>
      </aside>

      {/* Main content */}
      <main style={{ overflowY:'auto', padding:'20px', position:'relative', zIndex:10 }}>
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="load" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'70vh' }} initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
              <div className="glass" style={{ borderRadius:28, padding:'48px 44px', textAlign:'center', maxWidth:380, width:'100%' }}>
                <Loader2 size={40} className="anim-spin" style={{ color:'var(--accent-cyan)', margin:'0 auto 16px', display:'block' }} />
                <h3 className="font-display" style={{ fontSize:'1.15rem', fontWeight:700, marginBottom:8 }}>Agent Swarm Active</h3>
                <p style={{ color:'var(--text-secondary)', fontSize:'0.88rem', marginBottom:28, fontWeight:300 }}>6 specialized agents traversing knowledge graph</p>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {AGENTS.map((a,i) => {
                    const Icon = ICONS[a.key]; const s = status[a.key]
                    return (
                      <motion.div key={a.key} className="glass" style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:12, borderColor: s==='done'?'rgba(167,243,176,.15)':'var(--glass-stroke)' }}
                        initial={{ opacity:0, x:-16 }} animate={{ opacity:1, x:0 }} transition={{ delay:i*.08 }}>
                        <Icon size={14} style={{ color:a.color, flexShrink:0 }} />
                        <span style={{ flex:1, fontSize:'0.82rem', color:'var(--text-secondary)', textAlign:'left' }}>{a.name}</span>
                        <div style={{ width:64, height:3, borderRadius:2, background:'rgba(28,36,46,0.8)', overflow:'hidden' }}>
                          <motion.div style={{ height:'100%', borderRadius:2, background:s==='done'?'var(--accent-lime)':a.color }} animate={{ width:s==='done'?'100%':s==='running'?'65%':'0%' }} transition={{ duration:.5 }} />
                        </div>
                        {s==='done' && <Check size={13} style={{ color:'var(--accent-lime)', flexShrink:0 }} />}
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          ) : results ? (
            <motion.div key="results" initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ duration:.4 }}>
              {/* Stats row */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
                {[['Clauses',cls.length,'parsed','var(--accent-cyan)'],['Contradictions',(results.contradictions||[]).length,'found','var(--accent-red)'],['Compliance',(results.compliance_issues||[]).length,'issues','var(--accent-amber)'],['Risk Score',`${(avg*100).toFixed(0)}%`,'overall',avg>=.5?'var(--accent-red)':'var(--accent-lime)']].map(([l,v,s,c])=>(
                  <motion.div key={String(l)} className="glass" style={{ borderRadius:18, padding:'18px 20px' }} whileHover={{ y:-3 }}>
                    <div style={{ fontSize:'0.65rem', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--text-tertiary)', marginBottom:6 }}>{l}</div>
                    <div className="font-display" style={{ fontSize:'1.6rem', fontWeight:800, color:String(c), letterSpacing:'-0.04em' }}>{v}</div>
                    <div style={{ fontSize:'0.7rem', color:'var(--text-tertiary)', marginTop:2 }}>{s}</div>
                  </motion.div>
                ))}
              </div>
              {/* Tabs */}
              <div style={{ display:'flex', gap:4, padding:'6px', borderRadius:16, background:'rgba(16,20,26,0.7)', border:'1px solid var(--glass-stroke)', marginBottom:14, overflowX:'auto' }}>
                {TABS.map(t=>(
                  <button key={t} onClick={()=>setTab(t)} style={{ padding:'8px 16px', borderRadius:10, fontSize:'0.82rem', fontWeight: tab===t?600:400, color: tab===t?'var(--text-primary)':'var(--text-tertiary)', background: tab===t?'rgba(28,36,46,0.9)':'transparent', border:'none', cursor:'pointer', whiteSpace:'nowrap', transition:'all .18s', boxShadow: tab===t?'0 2px 12px rgba(0,0,0,.2)':'' }}>
                    {TAB_LABELS[t]}
                  </button>
                ))}
              </div>
              {/* Tab content */}
              <AnimatePresence mode="wait">
                <motion.div key={tab} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} transition={{ duration:.2 }}>
                  {tab==='graph' && (
                    <div className="glass" style={{ borderRadius:18, height:440, overflow:'hidden', position:'relative' }}>
                      <canvas ref={canvasRef} style={{ display:'block' }} />
                      <div style={{ position:'absolute', bottom:12, left:12, display:'flex', gap:8 }}>
                        {[['Contract','#c4b5fd'],['Clause','#7dd3ff'],['Risk','#ff7b90']].map(([n,c])=>(
                          <span key={n} className="pill" style={{ fontSize:'0.65rem', background:'rgba(10,12,16,.75)' }}>
                            <span style={{ width:7,height:7,borderRadius:'50%',background:c,display:'inline-block' }}/>{n}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {tab==='heatmap' && (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(195px,1fr))', gap:12 }}>
                      {cls.map((c:any,i:number)=>{
                        const rs=c.risk_score||0
                        const rc=rs>=.75?'risk-crit':rs>=.5?'risk-high':rs>=.25?'risk-med':'risk-low'
                        return (
                          <motion.div key={i} className={`glass ${rc}`} style={{ borderRadius:16, padding:'18px 16px' }} whileHover={{ y:-4 }} initial={{ opacity:0,scale:.92 }} animate={{ opacity:1,scale:1 }} transition={{ delay:i*.04 }}>
                            <div className="font-mono" style={{ fontSize:'0.65rem', color:'var(--text-tertiary)', marginBottom:6 }}>{c.id||`C-${i+1}`}</div>
                            <div style={{ fontSize:'0.9rem', fontWeight:500, marginBottom:10 }}>{c.title||'Clause '+(i+1)}</div>
                            <div style={{ height:3, borderRadius:2, background:'rgba(28,36,46,.8)', overflow:'hidden' }}>
                              <div className="risk-fill" style={{ height:'100%', borderRadius:2, width:`${rs*100}%`, transition:'width .6s' }} />
                            </div>
                            <div style={{ fontSize:'0.7rem', color:'var(--text-tertiary)', marginTop:6 }}>{(rs*100).toFixed(0)}% risk</div>
                          </motion.div>
                        )
                      })}
                    </div>
                  )}
                  {tab==='contradictions' && <PTable cols={['Clause A','Clause B','Severity','Description']} rows={(results.contradictions||[]).map((x:any)=>[x.clause_a,x.clause_b,<Sev key="s" s={x.severity}/>,x.description])} />}
                  {tab==='compliance' && <PTable cols={['Clause','Statute','Severity','Issue']} rows={(results.compliance_issues||[]).map((x:any)=>[x.clause,<span key="st" className="font-mono" style={{ fontSize:'0.8rem' }}>{x.statute}</span>,<Sev key="s" s={x.severity}/>,x.issue])} />}
                  {tab==='proposals' && (
                    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                      {(results.proposals||[]).map((p:any,i:number)=>(
                        <motion.div key={i} className="glass" style={{ borderRadius:20, overflow:'hidden' }} initial={{ opacity:0,y:12 }} animate={{ opacity:1,y:0 }} transition={{ delay:i*.07 }}>
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', borderBottom:'1px solid var(--glass-stroke)', background:'rgba(255,255,255,.015)' }}>
                            <span className="font-mono" style={{ fontSize:'0.88rem', fontWeight:500 }}>{p.clause}</span><Sev s={p.impact}/>
                          </div>
                          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr' }}>
                            <div style={{ padding:'18px 20px', borderRight:'1px solid var(--glass-stroke)', background:'rgba(255,123,144,.02)' }}>
                              <div style={{ fontSize:'0.65rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--accent-red)', marginBottom:10 }}>✕ Original</div>
                              <p style={{ fontSize:'0.88rem', color:'var(--text-secondary)', lineHeight:1.65, fontWeight:300 }}>{p.original}</p>
                            </div>
                            <div style={{ padding:'18px 20px', background:'rgba(82,229,213,.02)' }}>
                              <div style={{ fontSize:'0.65rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--accent-aqua)', marginBottom:10 }}>✓ Proposed</div>
                              <p style={{ fontSize:'0.88rem', color:'var(--text-secondary)', lineHeight:1.65, fontWeight:300 }}>{p.proposed}</p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                  {tab==='report' && (
                    <div className="glass" style={{ borderRadius:20, padding:'28px 32px', fontSize:'0.92rem', lineHeight:1.85, color:'var(--text-secondary)', fontWeight:300 }}
                      dangerouslySetInnerHTML={{ __html:(results.report||'No report').replace(/### (.*)/g,'<h3 style="font-family:var(--font-display);font-weight:700;font-size:1.05rem;color:var(--text-primary);margin:20px 0 8px;letter-spacing:-0.02em">$1</h3>').replace(/\*\*(.*?)\*\*/g,'<strong style="color:var(--text-primary);font-weight:600">$1</strong>').replace(/\n/g,'<br/>') }} />
                  )}
                  {tab==='audit' && <PTable cols={['Time','Agent','Action','Details']} rows={(results.audit_log||[]).map((x:any)=>[<span key="t" className="font-mono" style={{ fontSize:'0.75rem' }}>{x.timestamp}</span>,x.agent,x.action,x.details])} />}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div key="empty" style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'70vh', textAlign:'center', gap:20 }} initial={{ opacity:0 }} animate={{ opacity:1 }}>
              <motion.div className="hero-orb" style={{ width:88, height:88, fontSize:'2rem', display:'flex', alignItems:'center', justifyContent:'center' }} animate={{ y:[0,-10,0] }} transition={{ duration:4,repeat:Infinity,ease:'easeInOut' }}>
                ⚖️
              </motion.div>
              <h2 className="font-display" style={{ fontSize:'1.5rem', fontWeight:800, letterSpacing:'-0.04em' }}>Ready to Analyze</h2>
              <p style={{ color:'var(--text-secondary)', fontSize:'0.92rem', maxWidth:'38ch', lineHeight:1.65, fontWeight:300 }}>Select a sample or paste a contract to launch the 6-agent AI swarm</p>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginTop:8, width:'100%', maxWidth:400 }}>
                {AGENTS.map((a,i)=>{ const Icon=ICONS[a.key]; return (
                  <motion.div key={a.key} className="glass" style={{ borderRadius:16, padding:'18px 16px', textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}
                    whileHover={{ y:-5, borderColor:a.color+'40' }} initial={{ opacity:0,y:18 }} animate={{ opacity:1,y:0 }} transition={{ delay:i*.08 }}>
                    <Icon size={18} style={{ color:a.color }} /><span style={{ fontSize:'0.75rem', color:'var(--text-secondary)', fontWeight:500 }}>{a.name}</span>
                  </motion.div>
                )})}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

function PTable({ cols, rows }: { cols: string[]; rows: any[][] }) {
  if (!rows.length) return <p style={{ color:'var(--text-tertiary)', padding:'20px', fontSize:'0.88rem' }}>No data</p>
  return (
    <div className="glass" style={{ borderRadius:18, overflow:'hidden' }}>
      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead><tr style={{ background:'rgba(20,27,35,.6)' }}>{cols.map(c=><th key={c} style={{ padding:'12px 18px', textAlign:'left', fontSize:'0.65rem', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--text-tertiary)', borderBottom:'1px solid var(--glass-stroke)' }}>{c}</th>)}</tr></thead>
        <tbody>{rows.map((row,i)=>(
          <motion.tr key={i} style={{ borderBottom:'1px solid rgba(255,255,255,.03)' }} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:i*.03 }}
            onMouseOver={e=>(e.currentTarget.style.background='rgba(255,255,255,.012)')} onMouseOut={e=>(e.currentTarget.style.background='')}>
            {row.map((cell,j)=><td key={j} style={{ padding:'12px 18px', fontSize:'0.88rem', color:'var(--text-secondary)', fontWeight:300 }}>{cell}</td>)}
          </motion.tr>
        ))}</tbody>
      </table>
    </div>
  )
}

function Sev({ s }: { s: string }) {
  const k = (s||'medium').toLowerCase()
  return <span className={`sev sev-${k}`}>{s||'Medium'}</span>
}
