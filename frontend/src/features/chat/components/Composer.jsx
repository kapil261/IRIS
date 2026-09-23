import { useEffect, useRef, useState } from 'react'
import { Send, Square } from 'lucide-react'

const PLACEHOLDERS = {
  chat: 'What is in your mind today?',
  doc: 'Ask a question about your documents…',
  mentor: 'Describe the project, ask a question, or say "next"…'
}

/** Message input: auto-growing textarea, Enter to send, Shift+Enter for a newline, Stop while generating. */
const Composer = ({ mode, isGenerating, onSend, onStop }) => {
  const [value, setValue] = useState('')
  const textareaRef = useRef(null)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [value])

  const submit = (e) => {
    e.preventDefault()
    if (!value.trim() || isGenerating) return
    onSend(value)
    setValue('')
  }

  return (
    <form onSubmit={submit} className="chat-form">
      <div className="input-container">
        <textarea
          ref={textareaRef}
          rows={1}
          placeholder={PLACEHOLDERS[mode] || PLACEHOLDERS.chat}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) submit(e)
          }}
        />
        {isGenerating ? (
          <button type="button" className="send-button stop-button" onClick={onStop} title="Stop generating">
            <Square size={14} fill="currentColor" />
          </button>
        ) : (
          <button type="submit" className="send-button" disabled={!value.trim()} title="Send (Enter)">
            <Send size={18} />
          </button>
        )}
      </div>
    </form>
  )
}

export default Composer
