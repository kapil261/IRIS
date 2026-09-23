const mongoose = require('mongoose')

const ChatsSchema= new mongoose.Schema({
    userId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    threadid:{
        type: String,
        required:true,
        unique:true
    },
    title:{
        type:String,
        default:"New Chat",
    },
    // Multi-agent support: chat | doc | project | mentor
    agent:{
        type: String,
        enum: ["chat", "doc", "project", "mentor"],
        default: "chat",
        index: true
    },
    useDocuments:{
        type: Boolean,
        default: false
    },
    mentorMode:{
        type: Boolean,
        default: false
    },
    messages:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"message"  
    }]
}, { timestamps: true })
const chatHistory=mongoose.model("chat",ChatsSchema)
module.exports=chatHistory
