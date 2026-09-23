import { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { selectActiveSession, chatErrorCleared } from '../state/chatSlice'
import { sendMessage, stopGeneration, changeMode, startNewChat } from '../state/chatThunks'

/** Modes with a reply currently streaming (for the mode switcher's activity dots). */
const selectBusyModes = (state) =>
  Object.entries(state.chat.sessions).filter(([, s]) => s.stream.phase !== 'idle').map(([mode]) => mode).join(',')

/** The conversation for the current mode: messages, streaming state and actions. */
export const useChat = () => {
  const dispatch = useDispatch()
  const mode = useSelector((state) => state.chat.mode)
  const session = useSelector(selectActiveSession)
  const error = useSelector((state) => state.chat.error)
  const busyModes = useSelector(selectBusyModes)

  return {
    mode,
    threadid: session.threadid,
    messages: session.messages,
    loadingThread: session.loading,
    isWaiting: session.stream.phase === 'waiting', // sent, no token yet → typing indicator
    isGenerating: session.stream.phase !== 'idle', // sent until the stream closes → Stop button
    streamStatus: session.stream.statusText,
    busyModes: busyModes ? busyModes.split(',') : [],
    error,
    send: useCallback((text) => dispatch(sendMessage(text)), [dispatch]),
    stop: useCallback(() => dispatch(stopGeneration()), [dispatch]),
    setMode: useCallback((m) => dispatch(changeMode(m)), [dispatch]),
    newChat: useCallback(() => dispatch(startNewChat()), [dispatch]),
    clearError: useCallback(() => dispatch(chatErrorCleared()), [dispatch])
  }
}

export default useChat
