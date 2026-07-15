const express= require('express')
const ChatRouter= express.Router()
const chatcontroller = require('../controllers/chat.controller.js')
const messageController = require('../controllers/message.controller.js')
const authMiddleware = require('../middleware/auth.middleware.js')

// Apply authMiddleware to all routes
ChatRouter.use(authMiddleware)

//post chat  
ChatRouter.post("/chat",chatcontroller.PostChat)
//get all chat 
ChatRouter.get("/chats",chatcontroller.GetChat)
ChatRouter.get("/chat/:id",chatcontroller.GetChatById)

ChatRouter.delete("/chat/:id",chatcontroller.DeleteChat)
ChatRouter.put("/chat/:id",chatcontroller.UpdateChat)

ChatRouter.post("/message",messageController.PostMessage)

module.exports = ChatRouter;