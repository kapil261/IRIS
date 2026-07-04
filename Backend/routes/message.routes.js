const express= require('express')

const messageRouter=express.Router()
const messageController= require('../controllers/message.controller.js')

messageRouter.post("/message",messageController.PostMessage)



module.exports=messageRouter
