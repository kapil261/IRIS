const chatModel = require('../models/history.model.js')
const { AgentReply } = require('../utils/response.js')
const messageModel = require('../models/msg.models.js')

const PostMessage = async (req, res) => {
    const { threadid, message } = req.body   
    if (!threadid || !message) {
        return res.status(400).json({
            message: "threadid and message are required"
        })
    }
    try {
        const userMsg = new messageModel({
            role: "user",
            content: message
        });
        await userMsg.save();
        let thread = await chatModel.findOne({ threadid })
        if (!thread) {
            thread = new chatModel({
                threadid,
                title: message,
                messages: [userMsg._id]
            });
        } else {
            thread.messages.push(userMsg._id);
        }

        const aiResponseText = await AgentReply(message);

        const assistantMsg = new messageModel({
            role: "assistant",
            content: aiResponseText
        });
        await assistantMsg.save();

        thread.messages.push(assistantMsg._id);
        await thread.save();

        res.status(200).json({ reply: aiResponseText })
    } catch (err) {
        return res.status(500).json({
            message: "error in processing message",
            error: err.message
        })
    }
}

module.exports = {
    PostMessage
}