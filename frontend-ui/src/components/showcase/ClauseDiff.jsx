import { motion } from 'framer-motion'

function tokenize(text) {
  return text ? text.split(/(\s+)/) : []
}

function diffWords(a, b) {
  const aTok = tokenize(a)
  const bTok = tokenize(b)
  const aSet = new Set(aTok.map((t) => t.toLowerCase()))
  const bSet = new Set(bTok.map((t) => t.toLowerCase()))

  const removed = aTok.map((tok) => ({
    text: tok,
    state: bSet.has(tok.toLowerCase()) ? 'same' : 'removed',
  }))
  const added = bTok.map((tok) => ({
    text: tok,
    state: aSet.has(tok.toLowerCase()) ? 'same' : 'added',
  }))
  return { removed, added }
}

export default function ClauseDiff({ original, proposed }) {
  const { removed, added } = diffWords(original, proposed)

  return (
    <motion.div
      className="clause-diff"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="diff-side diff-original">
        <span className="diff-label diff-label-bad">Original · counterparty</span>
        <p>
          {removed.map((tok, i) =>
            tok.state === 'removed' ? (
              <span key={i} className="diff-removed">
                {tok.text}
              </span>
            ) : (
              <span key={i}>{tok.text}</span>
            ),
          )}
        </p>
      </div>
      <div className="diff-side diff-proposed">
        <span className="diff-label diff-label-good">Forge redline · safer</span>
        <p>
          {added.map((tok, i) =>
            tok.state === 'added' ? (
              <span key={i} className="diff-added">
                {tok.text}
              </span>
            ) : (
              <span key={i}>{tok.text}</span>
            ),
          )}
        </p>
      </div>
    </motion.div>
  )
}
