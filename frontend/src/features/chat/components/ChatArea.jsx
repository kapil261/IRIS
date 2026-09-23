import { useChat } from '../hooks/useChat'
import { useUi } from '../../ui/hooks/useUi'
import { useMentorState } from '../../mentor/hooks/useMentorState'
import ChatHeader from './ChatHeader'
import MessageList from './MessageList'
import WelcomeScreen from './WelcomeScreen'
import Composer from './Composer'
import MentorRoadmap from '../../mentor/components/MentorRoadmap'
import MentorActions, { MENTOR_NEXT_PROMPT } from '../../mentor/components/MentorActions'
import ErrorBanner from '../../../shared/components/ErrorBanner'
import MessageSkeleton from '../../../shared/components/MessageSkeleton'

/** Main conversation column: header, messages, composer, plus the Mentor roadmap panel. */
const ChatArea = () => {
  const {
    threadid, mode, messages, loadingThread, isWaiting, isGenerating, streamStatus, busyModes, error,
    send, stop, setMode, newChat, clearError
  } = useChat()
  const { roadmapOpen, roadmapWidth } = useUi()

  const isMentor = mode === 'mentor'
  const mentorView = useMentorState(threadid, isMentor)
  const hasRoadmap = isMentor && mentorView?.roadmap?.length > 0
  const showRoadmap = hasRoadmap && roadmapOpen
  const offsetStyle = showRoadmap ? { marginRight: `${roadmapWidth}px` } : undefined

  // Mentor "next / change code" buttons go under the latest assistant reply once a roadmap exists.
  const renderFooter = (msg, index) => {
    const isLast = index === messages.length - 1
    if (!hasRoadmap || !isLast || msg.role !== 'assistant' || msg.streaming || msg.isError) return null
    const hasFiles = mentorView.roadmap.some((t) => t.files.some((f) => f.status === 'done'))
    return <MentorActions onSend={send} disabled={isGenerating} isComplete={mentorView.phase === 'done'} hasFiles={hasFiles} />
  }

  let body
  if (loadingThread) body = <MessageSkeleton rows={4} />
  else if (messages.length === 0) body = <WelcomeScreen mode={mode} onSuggestion={send} disabled={isGenerating} />
  else body = <MessageList messages={messages} isWaiting={isWaiting} streamStatus={streamStatus} renderFooter={renderFooter} />

  return (
    <div className="main-content">
      <ChatHeader
        mode={mode}
        onModeChange={setMode}
        onNewChat={newChat}
        isGenerating={isGenerating}
        busyModes={busyModes}
        mentorProgress={hasRoadmap ? mentorView.progress : null}
      />

      <div className={`chat-scroll-container ${showRoadmap ? 'with-roadmap' : ''}`} style={offsetStyle}>
        <ErrorBanner message={error} onDismiss={clearError} className="chat-error-banner" />
        {body}
      </div>

      <div className={`footer-area ${showRoadmap ? 'with-roadmap' : ''}`} style={offsetStyle}>
        <Composer mode={mode} isGenerating={isGenerating} onSend={send} onStop={stop} />
        <p className="disclaimer">
          IRIS can make mistakes. Verify important info. <span className="kbd-hint">Shift + Enter for a new line</span>
        </p>
      </div>

      {showRoadmap && (
        <MentorRoadmap view={mentorView} disabled={isGenerating} onGenerateCurrent={() => send(MENTOR_NEXT_PROMPT)} />
      )}
    </div>
  )
}

export default ChatArea
