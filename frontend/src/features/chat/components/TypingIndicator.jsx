import { Bot } from 'lucide-react'

// Shown after sending, until the first token arrives. `status` is the agent's progress text.
const TypingIndicator = ({ status }) => (
  <div className="message-wrapper assistant loading">
    <div className="message-avatar">
      <Bot size={18} />
    </div>
    <div className="message-bubble-container">
      <div className="message-sender">IRIS</div>
      <div className="message-bubble typing-bubble">
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
        {status && <span className="typing-status">{status}</span>}
      </div>
    </div>
  </div>
)

export default TypingIndicator
