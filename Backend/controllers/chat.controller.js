const chatModel=require('../models/history.model.js')

const PostChat = async (req, res) => {
    const { threadid, title, useDocuments } = req.body  
    if (!threadid || !title) {
        return res.status(400).json({
            message: "threadid and title are required"
        })
    }
    try {
        const chat = new chatModel({
            userId: req.user.id,
            threadid,
            title,
            useDocuments: useDocuments || false
        })      
        const response = await chat.save();
        res.status(200).send(response);

    } catch (err) {
        console.error("Error in PostChat:", err);
        res.status(500).json({
            message: "unable to create",
            error: err.message
        })
    }
}

const GetChat = async (req, res) => {
   try { 
    const allChats = await chatModel.find({ userId: req.user.id })
    res.status(200).send(allChats)
   }
   catch (err) {
    res.status(404).json({
        message: "Unable to Fetch",
        error: err.message
    })
   }
}

const GetChatById = async (req, res) => {
    try {
        const Id = req.params.id;
        const chat = await chatModel.findOne({ _id: Id, userId: req.user.id }).populate('messages')
        if (!chat) {
            return res.status(404).json({ message: "Chat not found" })
        }
        res.status(200).send(chat)
    }
    catch (err) {
        res.status(400).json({
            message: "error in fetching",
            error: err.message
        })
    }
}

const DeleteChat = async (req, res) => {
    try {
        const id = req.params.id;
        const deleted = await chatModel.findOneAndDelete({ _id: id, userId: req.user.id })
        if (!deleted) {
            return res.status(404).json({ message: "Chat not found or unauthorized" })
        }
        res.status(200).json({
            message: "chat deleted",
            deleted
        }) 

    } catch (err) {
        console.log(err);
        res.status(500).json({
            message: "error in deleting",
            error: err.message
        })
    }
}

const UpdateChat = async (req, res) => {
    try {
        const id = req.params.id
        const { title, useDocuments } = req.body
        
        const updateFields = {}
        if (title !== undefined) updateFields.title = title
        if (useDocuments !== undefined) updateFields.useDocuments = useDocuments

        if (Object.keys(updateFields).length === 0) {
            return res.status(400).json({
                message: "At least title or useDocuments is required for update"
            })
        }

        const updated = await chatModel.findOneAndUpdate({ _id: id, userId: req.user.id }, updateFields, { new: true })
        if (!updated) {
            return res.status(404).json({ message: "Chat not found or unauthorized" })
        }
        res.status(200).json({
            message: "chat updated",
            updated
        })
    } catch (err) {
        console.error("Error in UpdateChat:", err)
        res.status(500).json({
            message: "unable to update chat",
            error: err.message
        })
    }
}

module.exports = {
    PostChat,
    GetChat,
    GetChatById,
    DeleteChat,
    UpdateChat
}
