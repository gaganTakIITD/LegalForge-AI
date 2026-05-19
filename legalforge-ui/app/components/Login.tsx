'use client'
import { useState, FormEvent } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface Props { onLogin: (u: string, p: string) => Promise<void> }

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] },
})

export function Login({ onLogin }: Props) {
  const [u, setU] = useState('')
  const [p, setP] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const fill = (role: string) => { setU(role); setP(role + '123') }

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr(''); setLoading(true)
    try { await onLogin(u, p) } catch (ex: any) { setErr(ex.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ position: 'relative', minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {/* Light pools */}
      <div className="lp lp-1" /><div className="lp lp-2" />

      {/* Floating glass orbs */}
      <div className="gw-orb anim-float" style={{ width: '10rem', height: '10rem', right: '12%', top: '8%' }} />
      <div className="gw-orb anim-float-alt" style={{ width: '7rem', height: '7rem', left: '10%', bottom: '20%' }} />

      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 460, padding: '0 24px' }}>
        <motion.div className="glass" style={{ borderRadius: 28, padding: '48px 44px 40px', textAlign: 'center' }} {...fade(0)}>

          {/* Mark */}
          <motion.div animate={{ y: [0, -7, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
            <div className="gw-mark" style={{ width: 56, height: 56, borderRadius: 18 }}>
              <div className="gw-mark-core" style={{ width: 22, height: 22 }} />
            </div>
          </motion.div>

          <motion.h1 className="font-display" style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: 8 }} {...fade(0.1)}>
            LegalForge <span className="text-gradient">AI</span>
          </motion.h1>
          <motion.p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem', marginBottom: 36, letterSpacing: '0.02em' }} {...fade(0.18)}>
            Multi-Agent Contract Intelligence
          </motion.p>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'left' }}>
            <motion.div {...fade(0.24)}>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 8 }}>Username</label>
              <input className="auth-input" value={u} onChange={e => setU(e.target.value)} required autoComplete="username" placeholder="e.g. analyst" />
            </motion.div>
            <motion.div {...fade(0.3)}>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 8 }}>Password</label>
              <input className="auth-input" type="password" value={p} onChange={e => setP(e.target.value)} required autoComplete="current-password" placeholder="••••••••" />
            </motion.div>

            {err && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ color: 'var(--accent-red)', fontSize: '0.88rem', textAlign: 'center' }}>{err}</motion.p>
            )}

            <motion.button type="submit" disabled={loading} className="btn-glass btn-primary"
              style={{ width: '100%', borderRadius: 14, padding: '14px', fontSize: '0.98rem', fontWeight: 600, justifyContent: 'center', gap: 8, marginTop: 8 }}
              whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }} {...fade(0.36)}>
              {loading ? 'Authenticating…' : <><span>Authenticate</span> <ArrowRight size={16} /></>}
            </motion.button>
          </form>

          <motion.div style={{ marginTop: 24, fontSize: '0.82rem', color: 'var(--text-tertiary)' }} {...fade(0.44)}>
            Demo accounts:&nbsp;
            {['admin', 'analyst', 'viewer'].map(r => (
              <button key={r} onClick={() => fill(r)} style={{ color: 'var(--accent-cyan)', fontWeight: 500, marginRight: 6, background: 'none', border: 'none', cursor: 'pointer', transition: 'color 150ms', fontSize: 'inherit' }}
                onMouseOver={e => (e.currentTarget.style.color = 'var(--accent-aqua)')}
                onMouseOut={e => (e.currentTarget.style.color = 'var(--accent-cyan)')}>
                {r}
              </button>
            ))}
          </motion.div>

          <motion.div style={{ marginTop: 20 }} {...fade(0.5)}>
            <Link href="/" style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              ← Back to home
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
