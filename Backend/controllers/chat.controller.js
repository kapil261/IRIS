const chatModel=require('../models/history.model.js')

const PostChat=async(req,res)=>{
    try{
        const chat= new chatModel({
            threadid:"chat -1",
           title: "new Chat -1"
        })  
        const response = await chat.save();
        res.status(200).send(response);

    }catch(err){
        res.status(404).json({
            message: "unable to create",
            error: err.message // Included actual error message for debugging
        })
    }
}
const GetChat=async(req,res)=>{
   try{ 
    const allChats=await chatModel.find()
    res.status(200  ).send(allChats)
   }
   catch(err){
    res.status(404).json({
        message:"Unable to Fetch",
        error:err.message
    })
   }
}
const GetChatById= async(req,res)=>{
    try{
        const Id= req.params.id;
        const chat= await chatModel.findOne({_id:Id})
        res.status(200).send(chat)
    }
    catch(err){
        res.status(400).json({
            message:"error in fetching",
            error:err.message
        })
    }
}
const DeleteChat= async (req, res)=>{
    try{
        const id= req.params.id;
        const deleted = await chatModel.findByIdAndDelete(id) // Call on chatModel and pass id directly
        res.status(200).json({
            message:"chat deleted",
            deleted
        }) 

    }catch(err){
        console.log(err);
        res.status(500).json({
            message: "error in deleting",
            error: err.message
        })
    }
}


module.exports = {
    PostChat,
    GetChat, // Added GetChat to exports
    GetChatById,
    DeleteChat
}
