import { useCallback, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchThreads, openThread, deleteThread, renameThread } from '../state/chatThunks'
import { selectModeThreads, selectActiveSession } from '../state/chatSlice'

/** Sidebar conversation list for the current mode only. Loads once on mount. */
export const useThreads = () => {
  const dispatch = useDispatch()
  const threads = useSelector(selectModeThreads, (a, b) => a.length === b.length && a.every((t, i) => t === b[i]))
  const status = useSelector((state) => state.chat.threads.status)
  const mode = useSelector((state) => state.chat.mode)
  const activeThreadId = useSelector((state) => selectActiveSession(state).threadid)

  useEffect(() => {
    dispatch(fetchThreads())
  }, [dispatch])

  return {
    mode,
    threads,
    isLoading: status === 'loading',
    activeThreadId,
    open: useCallback((chatId) => dispatch(openThread(chatId)), [dispatch]),
    remove: useCallback((chatId) => dispatch(deleteThread(chatId)), [dispatch]),
    rename: useCallback((chatId, title) => dispatch(renameThread({ chatId, title })), [dispatch])
  }
}

export default useThreads
