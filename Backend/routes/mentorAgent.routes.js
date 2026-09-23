const express = require('express')
const router = express.Router()
const mentorAgentController = require('../controllers/mentorAgent.controller')
const authMiddleware = require('../middleware/auth.middleware')

router.use(authMiddleware)

// POST /api/mentor/message — stateful roadmap-driven project mentor.
router.post('/message', mentorAgentController.postMentorMessage)
// GET /api/mentor/state/:threadid — roadmap + progress for the task-list widget.
router.get('/state/:threadid', mentorAgentController.getMentorStateHandler)

module.exports = router
