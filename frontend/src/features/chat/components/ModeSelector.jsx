import { MessageSquare, BookOpen, GraduationCap } from 'lucide-react'

const MODES = [
  { id: 'chat', label: 'Chat', icon: MessageSquare, title: 'Chat Mode: Standard conversational AI' },
  { id: 'doc', label: 'Docs', icon: BookOpen, title: 'Docs Mode: Answers grounded in your uploaded PDFs/Text files, with citations' },
  { id: 'mentor', label: 'Mentor', icon: GraduationCap, title: 'Mentor Mode: Step-by-step project roadmap, one file at a time' }
]

// Each mode is a separate conversation; `busyModes` get a dot while their reply is still streaming.
const ModeSelector = ({ mode, onChange, busyModes = [] }) => (
  <div className="ai-mode-selector" role="tablist">
    {MODES.map(({ id, label, icon: Icon, title }) => (
      <button
        key={id}
        type="button"
        role="tab"
        aria-selected={mode === id}
        className={`mode-btn ${mode === id ? 'active' : ''}`}
        onClick={() => mode !== id && onChange(id)}
        title={busyModes.includes(id) ? `${title} (reply in progress)` : title}
      >
        <Icon size={13} />
        {label}
        {busyModes.includes(id) && mode !== id && <span className="mode-busy-dot" />}
      </button>
    ))}
  </div>
)

export default ModeSelector
