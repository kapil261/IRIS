const mongoose = require('mongoose')

const message = new mongoose.Schema({
    role:{
        type:String,
        enum:["user","assistant"],
        required: true
    },
    content:{
        type: String,
        required:true
    },
},{
    timestamps:true
})

const messageModel=mongoose.model("message",message)
module.exports=messageModel