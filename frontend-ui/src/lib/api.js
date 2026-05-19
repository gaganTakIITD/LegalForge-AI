// LegalForge AI — Jac Cloud runtime (`jac serve service.jac`)
// Walkers: POST /walker/<name> → { status, reports: [...] }

const API = ''

async function safeJson(r, fallback) {
  const text = await r.text()
  try {
    return JSON.parse(text)
  } catch {
    return { detail: text.slice(0, 240) || fallback }
  }
}

function unwrap(d) {
  if (!d || !Array.isArray(d.reports) || d.reports.length === 0) return d
  const reports = d.reports
  const rich = reports.filter(
    (r) =>
      r &&
      (r.contradiction_result ||
        r.graph_data ||
        (Array.isArray(r.clauses) && Array.isArray(r.contradictions))),
  )
  if (rich.length > 0) return rich[rich.length - 1]
  const complete = reports.filter((r) => r && r.status === 'complete')
  if (complete.length > 0) return complete[complete.length - 1]
  const withClauses = reports.filter((r) => r && Array.isArray(r.clauses))
  if (withClauses.length > 0) return withClauses[withClauses.length - 1]
  return reports[reports.length - 1]
}

function explainErr(d, fallback) {
  if (!d) return fallback
  if (typeof d.detail === 'string') return d.detail
  if (Array.isArray(d.errors) && d.errors.length) return String(d.errors[0]).split('\n')[0]
  if (typeof d.error === 'string') return d.error
  return fallback
}

export async function login(username, password) {
  const r = await fetch(`${API}/walker/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const d = await safeJson(r, 'Authentication failed')
  if (!r.ok) throw new Error(explainErr(d, 'Authentication failed'))
  const inner = unwrap(d)
  if (!inner || !inner.authenticated) throw new Error(explainErr(inner, 'Invalid credentials'))
  return inner
}

export async function fetchSample(id, token) {
  const r = await fetch(`${API}/walker/get_sample`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ sample_id: id }),
  })
  const d = await safeJson(r, 'Failed to load sample')
  if (!r.ok) throw new Error(explainErr(d, 'Failed to load sample'))
  return unwrap(d)
}

export async function analyze(payload, token) {
  const controller = new AbortController()
  const tid = setTimeout(() => controller.abort(), 300000)
  const r = await fetch(`${API}/walker/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ ...payload, token }),
    signal: controller.signal,
  })
  clearTimeout(tid)
  const d = await safeJson(
    r,
    'Analysis failed — run `jac serve service.jac` on port 8000.',
  )
  if (!r.ok) {
    const hint = r.status === 500 ? ' (see jac serve terminal for stack trace)' : ''
    throw new Error((explainErr(d, `HTTP ${r.status}`)) + hint)
  }
  return unwrap(d)
}
