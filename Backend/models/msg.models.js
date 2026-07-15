const mongoose = require('mongoose')

const message = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "chat",
        required: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    role:{
        type:String,
        enum:["user","assistant","system"],
        required: true
    },
    content:{
        type: String,
        required:true
    },
    sources: [{
        documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
        chunkText: { type: String },
        filename: { type: String },
        score: { type: Number }
    }]
},{
    timestamps:true
})

const messageModel=mongoose.model("message",message)
module.exports=messageModel