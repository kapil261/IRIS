/**
 * Shared plumbing used by every agent's message controller (chat / docs / mentor / legacy):
 * SSE framing, thread lookup, and message persistence. Keeping this in one place is what
 * keeps the SSE event contract (`sources` | `content` | `error`, `[DONE]` terminator)
 * identical across all of them.
 */
const messageModel = require('../../models/msg.models')
const chatModel = require('../../models/history.model')
const { addCustomRule } = require('../../services/prompts')

const RECENT_HISTORY_LIMIT = 40

function startSSE(res) {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()
}

function sendEvent(res, payload) {
    res.write(`data: ${JSON.stringify(payload)}\n\n`)
}

function endStream(res) {
    res.write(`data: [DONE]\n\n`)
    res.end()
}

async function loadHistory(conversationId, { full = false } = {}) {
    const query = messageModel
        .find({ conversationId })
        .sort({ createdAt: -1 })
        .select('role content')
        .lean()
    if (!full) query.limit(RECENT_HISTORY_LIMIT)
    const docs = await query
    return docs.reverse().map(m => ({ role: m.role, content: m.content }))
}

const AGENT_LABELS = { chat: 'Chat', doc: 'Docs', mentor: 'Mentor' }

/**
 * The agent a thread belongs to. Older threads predate the `agent` field (it defaults to
 * "chat"), so their mode flags take precedence.
 */
function threadAgent(thread) {
    if (thread.mentorMode) return 'mentor'
    if (thread.useDocuments) return 'doc'
    return thread.agent || 'chat'
}

/**
 * Each conversation belongs to exactly one agent. Posting to another agent's thread is
 * rejected (409) instead of silently converting it, so Chat, Docs and Mentor histories
 * never mix.
 */
async function findOrCreateThread({ threadid, userId, message, agent }) {
    const thread = await chatModel.findOne({ threadid, userId })
    if (!thread) {
        return chatModel.create({
            userId,
            threadid,
            title: message.substring(0, 50),
            agent,
            useDocuments: agent === 'doc',
            mentorMode: agent === 'mentor',
            messages: []
        })
    }

    const owner = threadAgent(thread)
    if (owner !== agent) {
        const err = new Error(`This conversation belongs to ${AGENT_LABELS[owner]} mode. Start a new chat to use ${AGENT_LABELS[agent]} mode.`)
        err.status = 409
        throw err
    }
    return thread
}

async function saveUserMessage(thread, userId, content) {
    const userMsg = await messageModel.create({
        conversationId: thread._id,
        userId,
        role: "user",
        content
    })
    await chatModel.updateOne({ _id: thread._id }, { $push: { messages: userMsg._id } })
    return userMsg
}

async function saveAssistantMessage(thread, userId, { content, sources = [], agent }) {
    const assistantMsg = await messageModel.create({
        conversationId: thread._id,
        userId,
        role: "assistant",
        content,
        sources,
        agent
    })
    await chatModel.updateOne({ _id: thread._id }, { $push: { messages: assistantMsg._id } })
    return assistantMsg
}

/**
 * Full SSE turn shared by every agent route: create/find the thread, persist the user
 * message, handle "/learn <fact>" (no LLM call needed), stream the agent's response, persist
 * it, and terminate with `[DONE]`. `runGenerator(history)` must return an async generator
 * yielding `{ type: 'status' | 'sources' | 'token', ... }` then finish (the caller reads the
 * accumulated text as the final answer, same contract as docAgent/mentorAgent).
 */
async function streamAgentTurn(req, res, { agent, threadid, message, useDocuments, mentorMode, fullHistory, runGenerator }) {
    const userId = req.user.id

    const thread = await findOrCreateThread({ threadid, userId, message, agent })
    const history = await loadHistory(thread._id, { full: fullHistory })
    await saveUserMessage(thread, userId, message)

    const trimmed = message.trim()
    if (trimmed.toLowerCase().startsWith('/learn ')) {
        const fact = trimmed.slice(7).trim()
        if (fact) {
            const added = addCustomRule(fact)
            const responseText = added
                ? `I have successfully learned: "${fact}". This has been added to my custom rules and guidelines.`
                : `I already know: "${fact}".`

            startSSE(res)
            sendEvent(res, { type: 'meta', agent })
            sendEvent(res, { type: 'content', content: responseText })
            await saveAssistantMessage(thread, userId, { content: responseText, agent })
            return endStream(res)
        }
    }

    const abortController = new AbortController()
    res.on('close', () => {
        if (!res.writableEnded) abortController.abort()
    })

    startSSE(res)
    sendEvent(res, { type: 'meta', agent })

    let streamedText = ""
    let finalAnswer = ""
    let sources = []
    let failed = false

    try {
        for await (const event of runGenerator(history, abortController.signal)) {
            if (event.type === 'token') {
                streamedText += event.content
                sendEvent(res, { type: 'content', content: event.content })
            } else if (event.type === 'status') {
                sendEvent(res, { type: 'status', status: event.status })
            } else if (event.type === 'sources') {
                sources = event.sources
                sendEvent(res, { type: 'sources', sources })
            } else if (event.type === 'done') {
                finalAnswer = event.answer
            }
        }
    } catch (streamErr) {
        failed = true
        if (!abortController.signal.aborted) {
            console.error(`[${agent}_agent] Graph error:`, streamErr)
            sendEvent(res, { type: 'error', error: streamErr.message || 'The AI service failed to respond.' })
        }
    }

    const content = (finalAnswer || streamedText).trim()
    if (content) {
        await saveAssistantMessage(thread, userId, {
            content: failed ? `${content}\n\n_(response interrupted)_` : content,
            sources,
            agent
        })
    }

    if (!abortController.signal.aborted) endStream(res)
}

module.exports = {
    startSSE,
    sendEvent,
    endStream,
    loadHistory,
    findOrCreateThread,
    saveUserMessage,
    saveAssistantMessage,
    streamAgentTurn,
    threadAgent
}
