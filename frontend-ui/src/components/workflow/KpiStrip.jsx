import { motion } from 'framer-motion'
import { TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react'

export default function KpiStrip({ kpis }) {
  if (!kpis?.length) return null
  return (
    <motion.div
      className="kpi-strip"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {kpis.map((k, i) => {
        let TrendIcon = null
        if (k.trend === 'good') TrendIcon = TrendingDown
        if (k.trend === 'warn') TrendIcon = AlertTriangle
        if (k.delta && k.delta.startsWith('+')) TrendIcon = TrendingUp
        return (
          <motion.div
            key={k.label}
            className={`kpi-cell ${k.trend ? `trend-${k.trend}` : ''}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <span className="kpi-label">{k.label}</span>
            <div className="kpi-row">
              <strong>{k.value}</strong>
              {k.delta && <span className="kpi-delta">{k.delta}</span>}
              {TrendIcon && <TrendIcon size={13} className="kpi-trend" />}
            </div>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
