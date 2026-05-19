import { useState } from 'react'
import { motion } from 'framer-motion'
import { Shield, ChevronLeft } from 'lucide-react'
import Ambient from './Ambient'

export default function Login({ onLogin, onBack, error }) {
  const [username, setUsername] = useState('analyst')
  const [password, setPassword] = useState('analyst123')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onLogin(username, password)
    } catch {
      setLoading(false)
    }
  }

  return (
    <motion.div className="login-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Ambient />
      <button type="button" className="login-back" onClick={onBack}>
        <ChevronLeft size={16} /> Back
      </button>
      <motion.div
        className="login-card panel"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="brand-mark lg">
          <Shield size={28} />
        </div>
        <h1>Step into the forge.</h1>
        <p className="login-sub">
          Founder workspace · graph-native contract intelligence · audit trail saved on every run
        </p>
        <form className="login-form" onSubmit={submit}>
          <label className="field">
            <span>Username</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <motion.button
            type="submit"
            className="btn-primary btn-full"
            disabled={loading}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? 'Lighting the forge…' : 'Enter workspace'}
          </motion.button>
        </form>
        <p className="login-hint">
          Demo: <code>analyst</code> / <code>analyst123</code>
        </p>
      </motion.div>
    </motion.div>
  )
}
