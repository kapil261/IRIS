import { memo, useState } from 'react'
import { Bot, User, Copy, Check, BookOpen, GraduationCap } from 'lucide-react'
import MarkdownContent from './MarkdownContent'
import SourceList from '../../docs/components/SourceList'

const AGENT_LABELS = {
  doc: { label: 'Docs', className: 'docs', icon: <BookOpen size={11} /> },
  mentor: { label: 'Mentor', className: 'mentor', icon: <GraduationCap size={11} /> }
}

const CopyMessageButton = ({ text }) => {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (err) {
      console.error('Failed to copy message: ', err)
    }
  }
  return (
    <button type="button" className="message-action-btn" onClick={handleCopy} title="Copy response">
      {copied ? <Check size={13} /> : <Copy size={13} />}
      <span>{copied ? 'Copied' : 'Copy'}</span>
    </button>
  )
}

/** One chat message. `footer` renders extra UI inside the bubble (e.g. mentor actions). */
const MessageItem = ({ message, footer }) => {
  const isUser = message.role === 'user'
  const badge = !isUser && AGENT_LABELS[message.agent]

  return (
    <div className={`message-wrapper ${message.role} ${message.isError ? 'error' : ''}`}>
      <div className="message-avatar">{isUser ? <User size={18} /> : <Bot size={18} />}</div>
      <div className="message-bubble-container">
        <div className="message-sender">
          {isUser ? 'You' : 'IRIS'}
          {badge && (
            <span className={`agent-badge ${badge.className}`}>
              {badge.icon}
              {badge.label}
            </span>
          )}
        </div>
        <div className="message-bubble">
          <MarkdownContent content={message.content} />
          {message.streaming && <span className="stream-cursor" />}
          {footer}
          <SourceList sources={message.sources} />
        </div>
        {!isUser && !message.streaming && message.content && !message.isError && (
          <div className="message-actions">
            <CopyMessageButton text={message.content} />
          </div>
        )}
      </div>
    </div>
  )
}

// Memoised: while streaming, only the last message's props change, so earlier
// (potentially long, syntax-highlighted) messages don't re-render on every token.
export default memo(MessageItem)
