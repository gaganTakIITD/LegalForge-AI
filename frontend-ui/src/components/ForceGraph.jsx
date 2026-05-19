import { useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'

const TYPE_COLOR = {
  contract: '#a78bfa',
  clause: '#67e8f9',
  definition: '#fbbf24',
  party: '#6ee7b7',
}

const RISK_COLOR = (r) =>
  r >= 0.75 ? '#ef4444' : r >= 0.5 ? '#f97316' : r >= 0.25 ? '#fbbf24' : '#67e8f9'

export default function ForceGraph({
  graphData,
  clauses,
  contradictions,
  selectedId,
  highlightPair,
  onSelect,
}) {
  const canvasRef = useRef(null)
  const stateRef = useRef({ nodes: [], links: [], drag: null, hover: null })

  const buildGraph = useCallback(() => {
    if (graphData?.nodes?.length) {
      const nodes = graphData.nodes.map((n) => ({
        id: n.id,
        label: n.label || n.id,
        type: n.type || 'clause',
        risk: n.risk ?? 0,
        r: n.type === 'contract' ? 28 : n.type === 'party' ? 14 : 16,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
      }))
      const links = (graphData.links || []).map((l) => ({
        source: l.source,
        target: l.target,
        type: l.type || 'contains',
        severity: l.severity,
      }))
      return { nodes, links }
    }

    const list = clauses || []
    const nodes = [
      { id: 'root', label: 'Contract', type: 'contract', risk: 0, r: 26, x: 0, y: 0, vx: 0, vy: 0 },
      ...list.map((c, i) => ({
        id: c.id,
        label: c.title || c.clause_id || `Clause ${i + 1}`,
        type: 'clause',
        risk: c.risk_score || 0,
        r: 15,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
      })),
    ]
    const links = list.map((c) => ({ source: 'root', target: c.id, type: 'contains' }))
    ;(contradictions || []).forEach((co) => {
      if (co.clause_a_id && co.clause_b_id) {
        links.push({
          source: co.clause_a_id,
          target: co.clause_b_id,
          type: 'contradicts',
          severity: co.severity,
        })
      }
    })
    return { nodes, links }
  }, [graphData, clauses, contradictions])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const parent = canvas.parentElement
    const W = parent.clientWidth
    const H = parent.clientHeight
    const dpr = window.devicePixelRatio || 1
    canvas.width = W * dpr
    canvas.height = H * dpr
    canvas.style.width = `${W}px`
    canvas.style.height = `${H}px`
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)

    const { nodes, links } = buildGraph()
    const cx = W / 2
    const cy = H / 2
    nodes.forEach((n, i) => {
      const a = (2 * Math.PI * i) / Math.max(nodes.length, 1) - Math.PI / 2
      const rad = n.type === 'contract' ? 0 : Math.min(W, H) * 0.32
      n.x = cx + Math.cos(a) * rad
      n.y = cy + Math.sin(a) * rad
    })

    stateRef.current = { nodes, links, drag: null, hover: null }
    const nodeMap = () => Object.fromEntries(nodes.map((n) => [n.id, n]))

    const tick = () => {
      const nm = nodeMap()
      links.forEach((l) => {
        const a = nm[l.source]
        const b = nm[l.target]
        if (!a || !b) return
        const dx = b.x - a.x
        const dy = b.y - a.y
        const dist = Math.hypot(dx, dy) || 1
        const target = l.type === 'contradicts' ? 120 : 90
        const f = (dist - target) * 0.02
        a.vx += (dx / dist) * f
        a.vy += (dy / dist) * f
        b.vx -= (dx / dist) * f
        b.vy -= (dy / dist) * f
      })
      nodes.forEach((n, i) => {
        if (n.type === 'contract') {
          n.x += (cx - n.x) * 0.08
          n.y += (cy - n.y) * 0.08
        }
        nodes.forEach((m, j) => {
          if (i === j) return
          const dx = n.x - m.x
          const dy = n.y - m.y
          const d2 = dx * dx + dy * dy || 1
          const rep = 800 / d2
          n.vx += (dx / Math.sqrt(d2)) * rep * 0.02
          n.vy += (dy / Math.sqrt(d2)) * rep * 0.02
        })
        n.vx += (cx - n.x) * 0.001
        n.vy += (cy - n.y) * 0.001
        if (stateRef.current.drag?.id !== n.id) {
          n.vx *= 0.85
          n.vy *= 0.85
          n.x += n.vx
          n.y += n.vy
        }
      })
    }

    const draw = () => {
      tick()
      ctx.clearRect(0, 0, W, H)
      const nm = nodeMap()

      const hp = highlightPair
      links.forEach((l) => {
        const a = nm[l.source]
        const b = nm[l.target]
        if (!a || !b) return
        const isContra = l.type === 'contradicts'
        const isHighlight =
          hp &&
          ((l.source === hp.a && l.target === hp.b) ||
            (l.source === hp.b && l.target === hp.a))
        ctx.beginPath()
        ctx.strokeStyle = isHighlight
          ? 'rgba(251,113,133,0.95)'
          : isContra
            ? 'rgba(251,113,133,0.45)'
            : 'rgba(167,139,250,0.18)'
        ctx.lineWidth = isHighlight ? 3 : isContra ? 2 : 1.2
        if (isContra || isHighlight) ctx.setLineDash([6, 5])
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
        ctx.setLineDash([])
      })

      nodes.forEach((n) => {
        const col =
          n.type === 'clause' ? RISK_COLOR(n.risk) : TYPE_COLOR[n.type] || '#a78bfa'
        const sel = selectedId === n.id
        const inPair = hp && (n.id === hp.a || n.id === hp.b)
        const hov = stateRef.current.hover === n.id

        const glow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 3)
        glow.addColorStop(0, col + (hov || sel ? '44' : '22'))
        glow.addColorStop(1, 'transparent')
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r * 3, 0, Math.PI * 2)
        ctx.fill()

        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r + (sel || inPair ? 4 : 0), 0, Math.PI * 2)
        ctx.fillStyle = col + '22'
        ctx.fill()
        ctx.strokeStyle = col
        ctx.lineWidth = sel ? 2.5 : 1.8
        ctx.stroke()

        ctx.beginPath()
        ctx.arc(n.x, n.y, 4, 0, Math.PI * 2)
        ctx.fillStyle = col
        ctx.fill()

        ctx.fillStyle = '#e8eef8'
        ctx.font = `${n.type === 'contract' ? 600 : 500} ${n.type === 'contract' ? 11 : 9}px Manrope, sans-serif`
        ctx.textAlign = 'center'
        const label = n.label.length > 22 ? `${n.label.slice(0, 20)}…` : n.label
        ctx.fillText(label, n.x, n.y + n.r + 14)
      })
    }

    let frame = 0
    const loop = () => {
      draw()
      frame = requestAnimationFrame(loop)
    }
    loop()

    const hit = (mx, my) => {
      for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i]
        if (Math.hypot(mx - n.x, my - n.y) < n.r + 8) return n
      }
      return null
    }

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const n = hit(mx, my)
      stateRef.current.hover = n?.id || null
      canvas.style.cursor = n ? 'pointer' : 'default'
      if (stateRef.current.drag) {
        stateRef.current.drag.x = mx
        stateRef.current.drag.y = my
        stateRef.current.drag.vx = 0
        stateRef.current.drag.vy = 0
      }
    }

    const onDown = (e) => {
      const rect = canvas.getBoundingClientRect()
      const n = hit(e.clientX - rect.left, e.clientY - rect.top)
      if (n) {
        stateRef.current.drag = n
        onSelect?.(n.id === 'root' ? null : n.id)
      }
    }

    const onUp = () => {
      stateRef.current.drag = null
    }

    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup', onUp)

    return () => {
      cancelAnimationFrame(frame)
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
    }
  }, [buildGraph, selectedId, highlightPair, onSelect])

  return (
    <div className="graph-box">
      <canvas ref={canvasRef} />
      <motion.div
        className="graph-hint"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        Drag nodes · Click to inspect clause
      </motion.div>
    </div>
  )
}
