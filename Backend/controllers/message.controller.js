/**
 * Legacy unified endpoint (POST /api/message) — kept for backward compatibility with the
 * existing frontend contract (one endpoint, `useDocuments`/`mentorMode` flags in the body).
 * New code should prefer the dedicated per-agent routes: POST /api/chat/message,
 * POST /api/docs/message, POST /api/mentor/message (see routes/*.routes.js), which this
 * endpoint delegates to under the hood — so both paths run the exact same agents.
 */
const { runDocAgent } = require('../agents/docAgent')
const { runMentorAgent } = require('../agents/mentor')
const { streamAgentTurn } = require('./helpers/messaging.helpers')

function resolveAgent(useDocuments, mentorMode) {
    if (mentorMode) return 'mentor'
    if (useDocuments) return 'doc'
    return 'chat'
}

const PostMessage = async (req, res) => {
    const { threadid, message, useDocuments, mentorMode } = req.body
    if (!threadid || !message || !message.trim()) {
        return res.status(400).json({ message: "threadid and message are required" })
    }

    const agent = resolveAgent(useDocuments, mentorMode)

    try {
        await streamAgentTurn(req, res, {
            agent,
            threadid,
            message,
            useDocuments: !!useDocuments,
            mentorMode: !!mentorMode,
            fullHistory: agent === 'mentor',
            runGenerator: (history, signal) => (
                agent === 'mentor'
                    ? runMentorAgent({ userId: req.user.id, threadid, question: message, history, signal })
                    : runDocAgent({ userId: req.user.id, question: message, history, useDocuments: agent === 'doc', signal })
            )
        })
    } catch (err) {
        console.error("Error in PostMessage:", err)
        if (res.headersSent) {
            res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`)
            res.end()
        } else {
            res.status(err.status || 500).json({ message: err.status ? err.message : "error in processing message", error: err.message })
        }
    }
}

module.exports = { PostMessage }
