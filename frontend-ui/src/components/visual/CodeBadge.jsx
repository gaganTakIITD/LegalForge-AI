import { motion } from 'framer-motion'

const SAMPLE = `walker contradiction_walker {
  has clauses: list = [];

  can collect with clause entry {
    here.clauses.append(visitor);
  }

  can analyze with clause exit {
    for pair in pairwise(here.clauses) {
      if conflicts(pair) {
        spawn contradiction_edge(pair);
      }
    }
  }
}`

export default function CodeBadge() {
  return (
    <motion.div
      className="code-badge"
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <div className="code-badge-head">
        <div className="code-dots">
          <span />
          <span />
          <span />
        </div>
        <span className="mono">walker_contradiction.jac</span>
        <span className="code-tag mono">jac</span>
      </div>
      <pre className="code-body">
        <code>
          {SAMPLE.split('\n').map((line, i) => (
            <span key={i} className="code-line">
              <span className="code-gutter">{String(i + 1).padStart(2, ' ')}</span>
              <span
                className="code-text"
                dangerouslySetInnerHTML={{
                  __html: highlight(line),
                }}
              />
            </span>
          ))}
        </code>
      </pre>
    </motion.div>
  )
}

function highlight(line) {
  const KEYWORDS = ['walker', 'has', 'can', 'with', 'entry', 'exit', 'for', 'in', 'if', 'spawn']
  const TYPES = ['list', 'clause']
  return line
    .replace(/(\/\/.*$)/g, '<span class="c-com">$1</span>')
    .replace(
      new RegExp(`\\b(${KEYWORDS.join('|')})\\b`, 'g'),
      '<span class="c-kw">$1</span>',
    )
    .replace(
      new RegExp(`\\b(${TYPES.join('|')})\\b`, 'g'),
      '<span class="c-ty">$1</span>',
    )
    .replace(/(\bcontradiction_walker|contradiction_edge|conflicts|pairwise|append\b)/g, '<span class="c-fn">$1</span>')
    .replace(/(\b(?:here|visitor)\b)/g, '<span class="c-self">$1</span>')
}
