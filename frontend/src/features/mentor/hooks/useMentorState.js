import { useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchMentorState, makeSelectMentorView } from '../state/mentorSlice'

/**
 * Backend-driven Mentor roadmap for a thread (GET /api/mentor/state/:threadid).
 * The roadmap only changes when a mentor turn completes, so it is (re)fetched when the
 * thread becomes active in Mentor mode and again each time a reply finishes streaming.
 * It is deliberately not fetched mid-stream: on a brand-new thread the backend hasn't
 * created the project yet, which would just produce a 404.
 */
export const useMentorState = (threadid, enabled) => {
  const dispatch = useDispatch()
  const selector = useMemo(() => makeSelectMentorView(threadid), [threadid])
  const view = useSelector(selector)
  // The mentor session's own stream (the user may be viewing another mode meanwhile)
  const isGenerating = useSelector((state) => state.chat.sessions.mentor.stream.phase !== 'idle')

  useEffect(() => {
    if (enabled && threadid && !isGenerating) dispatch(fetchMentorState(threadid))
  }, [enabled, threadid, isGenerating, dispatch])

  return enabled ? view : null
}

export default useMentorState
