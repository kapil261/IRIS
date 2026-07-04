const express = require('express')
const cors = require ("cors")
const app = express()
const ChatRouter= require('../routes/chats.routes')
const messageRouter=require('../routes/message.routes')
app.use(cors())
app.use(express.json())

app.use("/api",ChatRouter)
app.use("/api",messageRouter)

module.exports  = app;