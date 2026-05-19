'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield } from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { Login } from '../components/Login'

export default function Dashboard() {
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<{ name: string; role: string } | null>(null)

  const handleLogin = async (username: string, password: string) => {
    const r = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    const d = await r.json()
    if (!r.ok) throw new Error(d.detail || 'Login failed')
    setToken(d.token)
    setUser({ name: d.name, role: d.role })
  }

  return (
    <AnimatePresence mode="wait">
      {!token ? (
        <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <Login onLogin={handleLogin} />
        </motion.div>
      ) : (
        <motion.div key="app" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <AppShell token={token} user={user!} onLogout={() => { setToken(null); setUser(null) }} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
