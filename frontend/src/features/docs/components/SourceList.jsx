import { useState } from 'react'
import { FileText, ChevronDown } from 'lucide-react'

// Collapsible, numbered citation cards matching the [n] markers in a Docs-mode answer.
const SourceList = ({ sources }) => {
  const [openIdx, setOpenIdx] = useState(null)
  if (!sources?.length) return null

  return (
    <div className="message-citations">
      <div className="citations-header">Sources</div>
      <div className="citations-list">
        {sources.map((src, i) => {
          const isOpen = openIdx === i
          return (
            <div key={i} className={`citation-card ${isOpen ? 'open' : ''}`}>
              <button type="button" className="citation-head" onClick={() => setOpenIdx(isOpen ? null : i)}>
                <span className="citation-number">{src.index || i + 1}</span>
                <FileText size={13} className="citation-icon" />
                <span className="citation-file" title={src.filename}>{src.filename}</span>
                {src.page ? <span className="citation-meta">p. {src.page}</span> : null}
                {typeof src.score === 'number' && (
                  <span className="citation-score">{Math.round(src.score * 100)}%</span>
                )}
                <ChevronDown size={13} className="citation-chevron" />
              </button>
              {isOpen && <div className="citation-snippet">{src.chunkText}</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default SourceList
