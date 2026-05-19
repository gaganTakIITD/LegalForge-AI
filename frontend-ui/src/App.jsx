import { useState, useCallback } from 'react'
import Landing from './components/Landing'
import Login from './components/Login'
import Workspace from './components/Workspace'
import JudgeCoach from './components/visual/JudgeCoach'
import { login as apiLogin } from './lib/api'
import './App.css'

export default function App() {
  const [view, setView] = useState('landing')
  const [token, setToken] = useState(null)
  const [user, setUser] = useState(null)
  const [error, setError] = useState('')
  const [demoSample, setDemoSample] = useState(null)
  const [judgeMode, setJudgeMode] = useState(false)
  const [phase, setPhase] = useState('landing')

  const doLogin = useCallback(async (username, password) => {
    setError('')
    const d = await apiLogin(username, password)
    setToken(d.token)
    setUser({ name: d.name, role: d.role })
    setView('app')
  }, [])

  const quickDemo = useCallback(async () => {
    setDemoSample('nda')
    setJudgeMode(true)
    try {
      await doLogin('analyst', 'analyst123')
    } catch (e) {
      setView('login')
      setError(e.message)
    }
  }, [doLogin])

  const coachPhase = view === 'landing' ? 'landing' : view === 'login' ? 'landing' : phase

  return (
    <>
      {view === 'landing' && (
        <Landing
          onStart={() => setView('login')}
          onDemo={quickDemo}
          onJudgeMode={() => {
            setJudgeMode(true)
            quickDemo()
          }}
        />
      )}
      {view === 'login' && (
        <Login
          onLogin={doLogin}
          onBack={() => {
            setView('landing')
            setError('')
          }}
          error={error}
        />
      )}
      {view === 'app' && (
        <Workspace
          token={token}
          user={user}
          initialSample={demoSample}
          judgeMode={judgeMode}
          onToggleJudge={() => setJudgeMode((j) => !j)}
          onPhaseChange={setPhase}
          onLogout={() => {
            setToken(null)
            setUser(null)
            setView('landing')
            setJudgeMode(false)
            setDemoSample(null)
          }}
        />
      )}
      <JudgeCoach
        active={judgeMode}
        phase={coachPhase}
        onDismiss={() => setJudgeMode(false)}
      />
    </>
  )
}
