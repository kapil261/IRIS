const { runMentorAgent, getMentorState } = require('../agents/mentor')
const { streamAgentTurn } = require('./helpers/messaging.helpers')

// POST /api/mentor/message — stateful, roadmap-driven project mentor.
const postMentorMessage = async (req, res) => {
    const { threadid, message } = req.body
    if (!threadid || !message || !message.trim()) {
        return res.status(400).json({ message: "threadid and message are required" })
    }

    try {
        await streamAgentTurn(req, res, {
            agent: 'mentor',
            threadid,
            message,
            useDocuments: false,
            mentorMode: true,
            fullHistory: true, // the mentor's own file/answer nodes look back at recent turns for context
            runGenerator: (history, signal) => runMentorAgent({
                userId: req.user.id,
                threadid,
                question: message,
                history,
                signal
            })
        })
    } catch (err) {
        console.error("Error in postMentorMessage:", err)
        if (res.headersSent) {
            res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`)
            res.end()
        } else {
            res.status(err.status || 500).json({ message: err.status ? err.message : "error in processing message", error: err.message })
        }
    }
}

// GET /api/mentor/state/:threadid — roadmap + progress for the live task-list widget.
const getMentorStateHandler = async (req, res) => {
    try {
        const state = await getMentorState(req.params.threadid, req.user.id)
        if (!state) {
            return res.status(404).json({ message: "No mentor project found for this thread" })
        }
        res.status(200).json(state)
    } catch (err) {
        console.error("Error in getMentorStateHandler:", err)
        res.status(500).json({ message: "error fetching mentor state", error: err.message })
    }
}

module.exports = { postMentorMessage, getMentorStateHandler }
