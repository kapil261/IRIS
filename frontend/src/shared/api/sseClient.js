import { API_BASE_URL, SERVER_UNREACHABLE_MESSAGE } from './apiClient'
import tokenStorage from '../utils/tokenStorage'

/**
 * POST a JSON body and consume the backend's Server-Sent Events stream.
 *
 * Event contract (shared by /chat, /docs and /mentor message routes):
 *   data: {"type":"meta","agent":"chat"}
 *   data: {"type":"status","status":"Searching your documents…"}
 *   data: {"type":"sources","sources":[...]}
 *   data: {"type":"content","content":"partial text"}
 *   data: {"type":"error","error":"message"}
 *   data: [DONE]
 *
 * handlers: { onMeta, onStatus, onSources, onChunk }. Pass `signal` to cancel.
 */
export async function streamSSE(path, body, handlers = {}, signal) {
  const { onMeta, onStatus, onSources, onChunk } = handlers
  const token = tokenStorage.getToken()

  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(body),
      signal
    })
  } catch (err) {
    if (err.name === 'AbortError') throw err
    throw new Error(SERVER_UNREACHABLE_MESSAGE, { cause: err }) // fetch only rejects on network failure
  }

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}))
    const err = new Error(errData.message || `Request failed (${response.status})`)
    err.status = response.status
    throw err
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) return

    buffer += decoder.decode(value, { stream: true })

    let lineEnd
    while ((lineEnd = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, lineEnd).trim()
      buffer = buffer.slice(lineEnd + 1)
      if (!line.startsWith('data: ')) continue

      const data = line.slice(6).trim()
      if (data === '[DONE]') return

      let event
      try {
        event = JSON.parse(data)
      } catch {
        continue // ignore malformed lines rather than killing the stream
      }

      switch (event.type) {
        case 'meta': onMeta?.(event); break
        case 'status': onStatus?.(event.status); break
        case 'sources': onSources?.(event.sources); break
        case 'content': onChunk?.(event.content); break
        case 'error': throw new Error(event.error || 'The AI service failed to respond.')
        default: break
      }
    }
  }
}

export default streamSSE
