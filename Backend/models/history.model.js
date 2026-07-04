const mongoose = require('mongoose')

const ChatsSchema= new mongoose.Schema({
    threadid:{
        type: String,
        required:true,
        unique:true
    },
    title:{
        type:String,
        default:"New Chat",
    },
   messages:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"message"  
   }]
})
const chatHistory=mongoose.model("chat",ChatsSchema)
module.exports=chatHistory
