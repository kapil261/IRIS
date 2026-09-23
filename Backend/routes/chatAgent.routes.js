const express = require('express')
const router = express.Router()
const chatAgentController = require('../controllers/chatAgent.controller')
const authMiddleware = require('../middleware/auth.middleware')

router.use(authMiddleware)

// POST /api/chat/message — plain chat agent (no document retrieval).
// (Not to be confused with chats.routes.js, which is conversation-thread CRUD.)
router.post('/message', chatAgentController.postChatMessage)

module.exports = router
