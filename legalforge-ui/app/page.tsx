'use client'
import { motion } from 'framer-motion'
import { Search, Zap, Scale, BarChart3, Handshake, FileText, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { AGENTS } from './lib/store'

const ICONS: Record<string, React.ElementType> = {
  parser: Search, contradiction: Zap, compliance: Scale,
  risk: BarChart3, negotiation: Handshake, report: FileText,
}

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 22 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] },
})

export default function Landing() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Ambient light pools */}
      <div className="lp lp-1" /><div className="lp lp-2" /><div className="lp lp-3" />

      <div style={{ width: 'var(--page-width)', margin: '0 auto', padding: '24px 0 80px', position: 'relative', zIndex: 2 }}>

        {/* Nav */}
        <motion.header className="glass gw-nav" style={{ borderRadius: 28 }}
          initial={{ y: -24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, ease: [0.16,1,0.3,1] }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="gw-mark"><div className="gw-mark-core" /></div>
            <div>
              <div className="font-display" style={{ fontSize: '1.08rem', fontWeight: 700, letterSpacing: '-0.03em' }}>LegalForge</div>
              <div style={{ color: 'var(--text-tertiary)', fontSize: '0.78rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>AI</div>
            </div>
          </div>
          <nav className="gw-nav-links">
            {['Features', 'Agents', 'Security'].map(l => <a key={l} href="#" className="gw-nav-link">{l}</a>)}
          </nav>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Link href="/dashboard">
              <motion.button className="btn-glass btn-primary" style={{ fontSize: '0.9rem', fontWeight: 500, padding: '0.72rem 1.2rem', borderRadius: 999 }}
                whileHover={{ y: -4 }} whileTap={{ scale: 0.97 }}>
                Launch App <ArrowRight size={15} />
              </motion.button>
            </Link>
          </div>
        </motion.header>

        {/* Hero — full-fold centered layout like GhostWatch */}
        <div style={{ minHeight: 'calc(100svh - 140px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '60px 0 40px', gap: 0, position: 'relative' }}>

          {/* Background hero orb */}
          <motion.div style={{ position: 'absolute', width: 'min(78vmin, 26rem)', height: 'min(78vmin, 26rem)', zIndex: 0 }}
            animate={{ y: [0, -14, 0] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}>
            <div className="hero-orb" style={{ width: '100%', height: '100%' }}>
              <svg width="60%" height="60%" viewBox="0 0 80 80" fill="none" style={{ opacity: 0.35, filter: 'drop-shadow(0 0 20px rgba(125,211,255,0.2))' }}>
                <path d="M40 4L8 16v18c0 20 14 37 32 42 18-5 32-22 32-42V16L40 4z" stroke="rgba(125,211,255,0.9)" strokeWidth="2" fill="rgba(125,211,255,0.06)" />
                <path d="M28 38l8 8 16-16" stroke="rgba(82,229,213,0.9)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </motion.div>

          {/* Orbital agent icons */}
          {AGENTS.map((a, i) => {
            const Icon = ICONS[a.key]
            const angle = (360 / 6) * i - 90
            const r = 200
            const x = Math.cos((angle * Math.PI) / 180) * r
            const y2 = Math.sin((angle * Math.PI) / 180) * r
            return (
              <motion.div key={a.key} style={{ position: 'absolute', left: `calc(50% + ${x}px - 20px)`, top: `calc(50% + ${y2}px - 20px)`, zIndex: 1 }}
                animate={{ scale: [1, 1.12, 1] }} transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.4, ease: 'easeInOut' }}>
                <div className="glass pill" style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderColor: a.color + '40' }}>
                  <Icon size={16} style={{ color: a.color }} />
                </div>
              </motion.div>
            )
          })}

          {/* Hero content — overlaid on orb */}
          <div style={{ position: 'relative', zIndex: 2 }}>
            <motion.div className="kicker" style={{ justifyContent: 'center', marginBottom: 28 }} {...fade(0.15)}>
              AI-POWERED CONTRACT INTELLIGENCE
            </motion.div>
            <motion.h1 className="font-display" style={{ fontSize: 'clamp(3rem, 6vw, 6.4rem)', fontWeight: 800, letterSpacing: '-0.055em', lineHeight: 1.06, marginBottom: 22, textShadow: '0 2px 28px rgba(0,0,0,0.55)' }} {...fade(0.28)}>
              Six Agents.<br />
              <span className="text-gradient">One Graph.</span><br />
              Zero Risk.
            </motion.h1>
            <motion.p style={{ fontSize: 'clamp(0.95rem, 2vw, 1.15rem)', lineHeight: 1.65, color: 'var(--text-secondary)', maxWidth: '52ch', margin: '0 auto 32px', textShadow: '0 1px 18px rgba(0,0,0,0.5)' }} {...fade(0.4)}>
              LegalForge deploys a swarm of 6 specialized AI agents that traverse a knowledge graph to parse clauses, detect contradictions, check compliance, and negotiate better terms — in seconds.
            </motion.p>
            <motion.div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }} {...fade(0.52)}>
              <Link href="/dashboard">
                <motion.button className="btn-glass btn-primary" style={{ fontSize: '1rem', fontWeight: 600, padding: '1rem 2rem', borderRadius: 999 }}
                  whileHover={{ y: -4 }} whileTap={{ scale: 0.97 }}>
                  Launch Platform <ArrowRight size={18} />
                </motion.button>
              </Link>
              <motion.button className="btn-glass" style={{ fontSize: '1rem', fontWeight: 400, padding: '1rem 2rem', borderRadius: 999 }}
                whileHover={{ y: -2 }}>
                View Demo
              </motion.button>
            </motion.div>

            {/* Stat pills */}
            <motion.div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 32, flexWrap: 'wrap' }} {...fade(0.62)}>
              {[['6', 'AI Agents'], ['< 5s', 'Analysis'], ['Graph-Native', 'Jac Backend']].map(([v, l]) => (
                <div key={l} className="pill">
                  <span style={{ color: 'var(--accent-cyan)', fontWeight: 700, fontFamily: 'var(--font-display)' }}>{v}</span>
                  <span style={{ color: 'var(--text-tertiary)' }}>{l}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Feature grid */}
        <motion.div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18, marginTop: 24 }}
          initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.55 }}>
          {AGENTS.map((a, i) => {
            const Icon = ICONS[a.key]
            return (
              <motion.div key={a.key} className="glass" style={{ borderRadius: 22, padding: '28px 26px 24px', cursor: 'default', transition: 'border-color 0.25s' }}
                whileHover={{ y: -5, borderColor: a.color + '40' }}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 + i * 0.08 }}>
                <div style={{ width: 44, height: 44, borderRadius: 13, background: a.color + '14', border: '1px solid ' + a.color + '28', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, color: a.color }}>
                  <Icon size={20} />
                </div>
                <h3 className="font-display" style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 8, letterSpacing: '-0.02em' }}>{a.name}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.65, fontWeight: 300 }}>{a.desc}</p>
              </motion.div>
            )
          })}
        </motion.div>

        <div style={{ textAlign: 'center', padding: '60px 0 0', color: 'var(--text-tertiary)', fontSize: '0.85rem', letterSpacing: '0.02em' }}>
          Built with <span style={{ color: 'var(--accent-violet)', fontWeight: 500 }}>Jac</span> · Graph-Native AI · JacHacks 2025
        </div>
      </div>
    </div>
  )
}
