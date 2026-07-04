const express= require('express')
const ChatRouter= express.Router()
const chatcontroller = require('../controllers/chat.controller.js')
const messageController = require('../controllers/message.controller.js')

//post chat  
ChatRouter.post("/newchat",chatcontroller.PostChat)
//get all chat 
ChatRouter.get("/chats",chatcontroller.GetChat)
ChatRouter.get("/chat/:id",chatcontroller.GetChatById)

ChatRouter.delete("/chat/:id",chatcontroller.DeleteChat)

ChatRouter.post("/message",messageController.PostMessage)

module.exports = ChatRouter;