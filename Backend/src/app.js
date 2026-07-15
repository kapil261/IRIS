const express = require('express')
const cors = require ("cors")
const fs = require('fs')
const path = require('path')
const app = express()

const ChatRouter= require('../routes/chats.routes')
const messageRouter=require('../routes/message.routes')
const authRouter=require('../routes/auth.routes')
const documentRouter=require('../routes/document.routes')

// Create uploads folder if not exists
const uploadsDir = path.join(__dirname, '../uploads')
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
}

app.use(cors())
app.use(express.json())

app.use("/api/auth",authRouter)
app.use("/api/documents",documentRouter)
app.use("/api",ChatRouter)
app.use("/api",messageRouter)

module.exports  = app;