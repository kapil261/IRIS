const express = require('express')
const router = express.Router()
const docAgentController = require('../controllers/docAgent.controller')
const authMiddleware = require('../middleware/auth.middleware')

router.use(authMiddleware)

// POST /api/docs/message — RAG doc agent (always retrieves from the user's documents).
router.post('/message', docAgentController.postDocsMessage)

module.exports = router
