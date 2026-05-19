export function riskLevel(score) {
  if (score >= 0.75) return 'critical'
  if (score >= 0.5) return 'high'
  if (score >= 0.25) return 'medium'
  return 'low'
}

export function avgRisk(clauses) {
  if (!clauses?.length) return 0
  return clauses.reduce((s, c) => s + (c.risk_score || 0), 0) / clauses.length
}

export function buildStory(results) {
  if (!results) return null
  const contradictions = results.contradictions || []
  const compliance = results.compliance_issues || []
  const proposals = results.proposals || []
  const clauses = results.clauses || []
  const avg = avgRisk(clauses)

  const topContra = contradictions[0]
  const topCompliance = compliance[0]

  let headline = 'Analysis complete'
  let subhead = `${clauses.length} clauses parsed across the knowledge graph.`
  let severity = avg >= 0.5 ? 'high' : contradictions.length ? 'medium' : 'low'

  if (topContra) {
    headline = `Contradiction: §${topContra.clause_a} conflicts with §${topContra.clause_b}`
    subhead = topContra.description || 'Adversarial walker detected incompatible obligations.'
    severity = topContra.severity === 'direct' ? 'critical' : topContra.severity || 'high'
  } else if (topCompliance) {
    headline = `Compliance: §${topCompliance.clause} may violate ${topCompliance.statute}`
    subhead = topCompliance.issue || 'Regulatory walker flagged a potential violation.'
    severity = topCompliance.severity || 'high'
  } else if (avg >= 0.5) {
    headline = 'Elevated contract risk detected'
    subhead = `Weighted rubric scores overall exposure at ${(avg * 100).toFixed(0)}%.`
    severity = 'high'
  }

  return {
    headline,
    subhead,
    severity,
    stats: {
      clauses: clauses.length,
      contradictions: contradictions.length,
      compliance: compliance.length,
      proposals: proposals.length,
      riskPct: Math.round(avg * 100),
    },
    issues: [
      ...contradictions.slice(0, 4).map((c) => ({
        type: 'contradiction',
        id: `${c.clause_a}-${c.clause_b}`,
        title: `§${c.clause_a} ↔ §${c.clause_b}`,
        body: c.description,
        severity: c.severity,
        clauseAId: c.clause_a_id,
        clauseBId: c.clause_b_id,
      })),
      ...compliance.slice(0, 2).map((c, i) => ({
        type: 'compliance',
        id: `c-${i}`,
        title: `§${c.clause} · ${c.statute}`,
        body: c.issue,
        severity: c.severity,
      })),
    ],
  }
}

export function clauseById(clauses, id) {
  return clauses?.find((c) => c.id === id)
}

export function contradictionsForClause(contradictions, clauseId) {
  return (contradictions || []).filter(
    (c) => c.clause_a_id === clauseId || c.clause_b_id === clauseId,
  )
}
