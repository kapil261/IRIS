import { useEffect, useRef } from 'react'
import MessageItem from './MessageItem'
import TypingIndicator from './TypingIndicator'

/**
 * Renders the conversation, the typing indicator and keeps the view pinned to the bottom.
 * `renderFooter(message, index)` lets the host inject per-message UI (mentor actions).
 */
const MessageList = ({ messages, isWaiting, streamStatus, renderFooter }) => {
  const endRef = useRef(null)
  const lastContentLength = messages[messages.length - 1]?.content?.length || 0

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length, lastContentLength, isWaiting])

  return (
    <div className="messages-list">
      {messages.map((msg, index) => (
        <MessageItem key={index} message={msg} footer={renderFooter?.(msg, index)} />
      ))}
      {isWaiting && <TypingIndicator status={streamStatus} />}
      <div ref={endRef} />
    </div>
  )
}

export default MessageList
