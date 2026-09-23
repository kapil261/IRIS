const { runDocAgent } = require('../agents/docAgent')
const { streamAgentTurn } = require('./helpers/messaging.helpers')

// POST /api/docs/message — RAG over the user's uploaded documents, always on.
const postDocsMessage = async (req, res) => {
    const { threadid, message } = req.body
    if (!threadid || !message || !message.trim()) {
        return res.status(400).json({ message: "threadid and message are required" })
    }

    try {
        await streamAgentTurn(req, res, {
            agent: 'doc',
            threadid,
            message,
            useDocuments: true,
            mentorMode: false,
            runGenerator: (history, signal) => runDocAgent({
                userId: req.user.id,
                question: message,
                history,
                useDocuments: true,
                signal
            })
        })
    } catch (err) {
        console.error("Error in postDocsMessage:", err)
        if (res.headersSent) {
            res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`)
            res.end()
        } else {
            res.status(err.status || 500).json({ message: err.status ? err.message : "error in processing message", error: err.message })
        }
    }
}

module.exports = { postDocsMessage }
