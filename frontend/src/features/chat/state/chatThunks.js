import { createAsyncThunk } from '@reduxjs/toolkit'
import threadsApi from '../api/threadsApi'
import { sendMessageStream } from '../api/messageApi'
import { getErrorMessage } from '../../../shared/api/apiClient'
import {
  newChatStarted,
  modeChanged,
  threadIdAssigned,
  userMessageAdded,
  streamStatusChanged,
  assistantSourcesReceived,
  assistantChunkReceived,
  streamEnded,
  threadMode
} from './chatSlice'

// AbortControllers aren't serializable, so in-flight requests live here, one per mode.
const activeRequests = { chat: null, doc: null, mentor: null } // { controller, threadid }

const abortRequest = (mode, reason) => {
  const req = activeRequests[mode]
  if (req) {
    req.controller.abort(reason)
    activeRequests[mode] = null
  }
}

const newThreadId = () => `thread_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`

/* ───────────────────────────── Threads ───────────────────────────── */

export const fetchThreads = createAsyncThunk('chat/fetchThreads', async (_, { rejectWithValue }) => {
  try {
    return await threadsApi.list() // newest first, each tagged with its agent
  } catch (err) {
    return rejectWithValue(getErrorMessage(err, 'Could not load conversations'))
  }
})

export const openThread = createAsyncThunk('chat/openThread', async (chatId, { getState, rejectWithValue }) => {
  const listed = getState().chat.threads.items.find((t) => t._id === chatId)
  if (listed) abortRequest(threadMode(listed), 'switch')
  try {
    return await threadsApi.get(chatId)
  } catch (err) {
    return rejectWithValue(getErrorMessage(err, 'Could not open this conversation'))
  }
})

export const deleteThread = createAsyncThunk('chat/deleteThread', async (chatId, { getState, rejectWithValue }) => {
  const thread = getState().chat.threads.items.find((t) => t._id === chatId)
  if (thread) {
    const mode = threadMode(thread)
    if (activeRequests[mode]?.threadid === thread.threadid) abortRequest(mode, 'switch')
  }
  try {
    await threadsApi.remove(chatId)
    return { _id: chatId, threadid: thread?.threadid }
  } catch (err) {
    return rejectWithValue(getErrorMessage(err, 'Could not delete conversation'))
  }
})

export const renameThread = createAsyncThunk('chat/renameThread', async ({ chatId, title }, { rejectWithValue }) => {
  try {
    await threadsApi.rename(chatId, title)
    return { _id: chatId, title }
  } catch (err) {
    return rejectWithValue(getErrorMessage(err, 'Could not rename conversation'))
  }
})

/** Fresh conversation in the current mode (other modes' sessions are untouched). */
export const startNewChat = () => (dispatch, getState) => {
  abortRequest(getState().chat.mode, 'switch')
  dispatch(newChatStarted())
}

/** Switch which mode's session is shown. Nothing is aborted or converted. */
export const changeMode = (mode) => (dispatch) => {
  dispatch(modeChanged(mode))
}

/* ───────────────────────────── Messaging ─────────────────────────── */

export const stopGeneration = () => (dispatch, getState) => abortRequest(getState().chat.mode, 'stopped')

/**
 * Send a message to the current mode's agent and stream the reply into that mode's session.
 * If the session moves to another thread mid-stream (New chat / opened another thread in the
 * same mode), the remaining events are dropped.
 */
export const sendMessage = (text) => async (dispatch, getState) => {
  const content = text.trim()
  const { chat } = getState()
  const mode = chat.mode
  const session = chat.sessions[mode]
  if (!content || session.stream.phase !== 'idle') return

  let threadid = session.threadid
  if (!threadid) {
    threadid = newThreadId()
    dispatch(threadIdAssigned({ mode, threadid }))
  }

  const controller = new AbortController()
  activeRequests[mode] = { controller, threadid }
  const stillActive = () => getState().chat.sessions[mode].threadid === threadid

  dispatch(userMessageAdded({ mode, content }))

  let agent = mode
  try {
    await sendMessageStream(
      { mode, threadid, message: content, signal: controller.signal },
      {
        onMeta: (meta) => { if (meta.agent) agent = meta.agent },
        onStatus: (status) => stillActive() && dispatch(streamStatusChanged({ mode, status })),
        onSources: (sources) => stillActive() && dispatch(assistantSourcesReceived({ mode, sources, agent })),
        onChunk: (chunk) => stillActive() && dispatch(assistantChunkReceived({ mode, content: chunk, agent }))
      }
    )
    if (stillActive()) dispatch(streamEnded({ mode }))
  } catch (err) {
    if (stillActive()) {
      if (controller.signal.aborted) dispatch(streamEnded({ mode, stopped: true }))
      else dispatch(streamEnded({ mode, error: err.message || 'Sorry, something went wrong. Please try again.' }))
    }
  } finally {
    if (activeRequests[mode]?.controller === controller) activeRequests[mode] = null
    dispatch(fetchThreads()) // the Mentor roadmap hook refetches on its own once the stream ends
  }
}
