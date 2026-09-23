const chatModel=require('../models/history.model.js')
const { threadAgent } = require('./helpers/messaging.helpers')

const PostChat = async (req, res) => {
    const { threadid, title, useDocuments, mentorMode } = req.body  
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
            useDocuments: useDocuments || false,
            mentorMode: mentorMode || false
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
    // Newest first, each tagged with the agent it belongs to (older threads predate `agent`)
    const allChats = await chatModel.find({ userId: req.user.id }).sort({ updatedAt: -1 }).lean()
    res.status(200).send(allChats.map((chat) => ({ ...chat, agent: threadAgent(chat) })))
   }
   catch (err) {
    res.status(500).json({
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
        res.status(200).send({ ...chat.toObject(), agent: threadAgent(chat) })
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

// Only the title can change: a thread's agent is fixed when it's created, so Chat, Docs and
// Mentor conversations stay separate.
const UpdateChat = async (req, res) => {
    try {
        const { title } = req.body
        if (typeof title !== 'string' || !title.trim()) {
            return res.status(400).json({ message: "A non-empty title is required" })
        }

        const updated = await chatModel.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id },
            { title: title.trim().slice(0, 100) },
            { new: true }
        )
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
