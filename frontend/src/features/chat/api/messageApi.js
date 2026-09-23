import streamSSE from '../../../shared/api/sseClient'

// Each assistant mode has its own backend agent route (see Backend/routes/*.routes.js).
export const MODE_ROUTES = {
  chat: '/chat/message',
  doc: '/docs/message',
  mentor: '/mentor/message'
}

/**
 * Send one message to the agent for `mode` and stream the reply.
 * handlers: { onMeta, onStatus, onSources, onChunk }
 */
export const sendMessageStream = ({ mode, threadid, message, signal }, handlers) =>
  streamSSE(MODE_ROUTES[mode] || MODE_ROUTES.chat, { threadid, message }, handlers, signal)

export default sendMessageStream
