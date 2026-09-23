import { createSlice } from '@reduxjs/toolkit'
import { logout } from '../../auth/state/authSlice'
import { fetchThreads, openThread, deleteThread, renameThread } from './chatThunks'

export const MODES = ['chat', 'doc', 'mentor']

/** The agent/mode a stored thread belongs to (the API tags each thread with `agent`). */
export const threadMode = (thread) => {
  if (thread?.mentorMode) return 'mentor'
  if (thread?.useDocuments) return 'doc'
  return MODES.includes(thread?.agent) ? thread.agent : 'chat'
}

const idleStream = { phase: 'idle', statusText: '' } // phase: idle | waiting (no token yet) | streaming

const emptySession = () => ({
  threadid: '',
  chatId: null,
  messages: [],
  loading: false,
  stream: { ...idleStream }
})

/**
 * Chat, Docs and Mentor are separate conversations: each mode has its own session (open
 * thread, messages, streaming state). `mode` only picks which session is on screen, so a
 * reply still streaming in one mode keeps landing in that mode's session after switching.
 */
const initialState = {
  threads: { items: [], status: 'idle' },
  mode: 'chat',
  sessions: { chat: emptySession(), doc: emptySession(), mentor: emptySession() },
  error: null // non-streaming failures (list/load/rename/delete) → error banner
}

/** The assistant message currently being streamed in a session, creating it if needed. */
const ensureStreamingAssistant = (session, agent) => {
  const last = session.messages[session.messages.length - 1]
  if (last && last.role === 'assistant' && last.streaming) return last
  const msg = { role: 'assistant', content: '', sources: [], agent, streaming: true }
  session.messages.push(msg)
  return msg
}

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    newChatStarted: (state) => {
      state.sessions[state.mode] = emptySession()
      state.error = null
    },
    modeChanged: (state, { payload }) => {
      if (MODES.includes(payload)) state.mode = payload
    },
    threadIdAssigned: (state, { payload: { mode, threadid } }) => {
      state.sessions[mode].threadid = threadid
    },
    userMessageAdded: (state, { payload: { mode, content } }) => {
      const session = state.sessions[mode]
      session.messages.push({ role: 'user', content })
      session.stream = { phase: 'waiting', statusText: '' }
    },
    streamStatusChanged: (state, { payload: { mode, status } }) => {
      state.sessions[mode].stream.statusText = status
    },
    assistantSourcesReceived: (state, { payload: { mode, sources, agent } }) => {
      ensureStreamingAssistant(state.sessions[mode], agent).sources = sources
    },
    assistantChunkReceived: (state, { payload: { mode, content, agent } }) => {
      const session = state.sessions[mode]
      ensureStreamingAssistant(session, agent).content += content
      session.stream.phase = 'streaming'
    },
    streamEnded: (state, { payload: { mode, stopped, error } }) => {
      const session = state.sessions[mode]
      const last = session.messages[session.messages.length - 1]
      const streamingMsg = last?.role === 'assistant' && last.streaming ? last : null

      if (error) {
        const errorText = `⚠️ ${error}`
        if (streamingMsg && streamingMsg.content) {
          streamingMsg.content += `\n\n${errorText}`
        } else if (streamingMsg) {
          streamingMsg.content = errorText
          streamingMsg.isError = true
        } else {
          session.messages.push({ role: 'assistant', content: errorText, isError: true })
        }
      } else if (stopped && streamingMsg?.content) {
        streamingMsg.content += '\n\n_(generation stopped)_'
      }

      session.messages.forEach((m) => { if (m.streaming) m.streaming = false })
      session.stream = { ...idleStream }
    },
    chatErrorCleared: (state) => {
      state.error = null
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchThreads.pending, (state) => {
        if (state.threads.status === 'idle') state.threads.status = 'loading'
      })
      .addCase(fetchThreads.fulfilled, (state, { payload }) => {
        state.threads = { items: payload, status: 'ready' }
        // A brand-new thread only gets a Mongo _id once its first message is saved
        Object.values(state.sessions).forEach((session) => {
          if (session.threadid && !session.chatId) {
            const match = payload.find((t) => t.threadid === session.threadid)
            if (match) session.chatId = match._id
          }
        })
      })
      .addCase(fetchThreads.rejected, (state, { payload }) => {
        state.threads.status = 'failed'
        state.error = payload
      })

      .addCase(openThread.pending, (state, { meta }) => {
        const listed = state.threads.items.find((t) => t._id === meta.arg)
        const mode = listed ? threadMode(listed) : state.mode
        state.mode = mode
        state.sessions[mode] = { ...emptySession(), chatId: meta.arg, loading: true }
        state.error = null
      })
      .addCase(openThread.fulfilled, (state, { payload }) => {
        const mode = threadMode(payload)
        state.mode = mode
        state.sessions[mode] = {
          ...emptySession(),
          threadid: payload.threadid,
          chatId: payload._id,
          messages: (payload.messages || []).map(({ role, content, sources, agent }) => ({ role, content, sources, agent }))
        }
      })
      .addCase(openThread.rejected, (state, { payload }) => {
        state.sessions[state.mode].loading = false
        state.error = payload
      })

      .addCase(deleteThread.fulfilled, (state, { payload }) => {
        state.threads.items = state.threads.items.filter((t) => t._id !== payload._id)
        Object.keys(state.sessions).forEach((mode) => {
          if (state.sessions[mode].threadid === payload.threadid) state.sessions[mode] = emptySession()
        })
      })
      .addCase(deleteThread.rejected, (state, { payload }) => {
        state.error = payload
      })

      .addCase(renameThread.fulfilled, (state, { payload }) => {
        const thread = state.threads.items.find((t) => t._id === payload._id)
        if (thread) thread.title = payload.title
      })
      .addCase(renameThread.rejected, (state, { payload }) => {
        state.error = payload
      })

      .addCase(logout.fulfilled, () => initialState)
  }
})

export const {
  newChatStarted,
  modeChanged,
  threadIdAssigned,
  userMessageAdded,
  streamStatusChanged,
  assistantSourcesReceived,
  assistantChunkReceived,
  streamEnded,
  chatErrorCleared
} = chatSlice.actions

export const selectChat = (state) => state.chat
export const selectActiveSession = (state) => state.chat.sessions[state.chat.mode]
export const selectSession = (mode) => (state) => state.chat.sessions[mode]
export const selectIsGenerating = (state) => selectActiveSession(state).stream.phase !== 'idle'
export const selectModeThreads = (state) => state.chat.threads.items.filter((t) => threadMode(t) === state.chat.mode)

export default chatSlice.reducer
