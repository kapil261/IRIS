const fs = require('fs')
const path = require('path')
const messageModel = require('../models/msg.models')
const chatModel = require('../models/history.model')
const { AgentReply, AgentStreamReply } = require('../utils/response')
const { searchSimilarChunks } = require('../services/rag.service')

const PostMessage = async (req, res) => {
    const { threadid, message, useDocuments } = req.body   
    console.log("=== PostMessage req.body ===", req.body);
    if (!threadid || !message) {
        return res.status(400).json({
            message: "threadid and message are required"
        })
    }
    try {
        let thread = await chatModel.findOne({ threadid, userId: req.user.id })
        if (!thread) {
            thread = new chatModel({
                userId: req.user.id,
                threadid,
                title: message.substring(0, 50),
                useDocuments: useDocuments || false,
                messages: []
            });
            await thread.save();
        } else if (useDocuments !== undefined && thread.useDocuments !== useDocuments) {
            thread.useDocuments = useDocuments;
            await thread.save();
        }

        // Fetch existing history (prior to current user message)
        const chatHistory = await messageModel.find({ conversationId: thread._id }).sort({ createdAt: 1 });

        const userMsg = new messageModel({
            conversationId: thread._id,
            userId: req.user.id,
            role: "user",
            content: message
        });
        await userMsg.save();
        thread.messages.push(userMsg._id);

        // Check for "/learn" command
        if (message.trim().toLowerCase().startsWith('/learn ')) {
            const factToLearn = message.trim().slice(7).trim();
            if (factToLearn) {
                try {
                    const filePath = path.join(__dirname, '../config/custom_instructions.json');
                    let data = { assistantName: "IRIS", developer: "Kapil Goyal", customRules: [] };
                    
                    if (fs.existsSync(filePath)) {
                        data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                    }
                    
                    if (!data.customRules) {
                        data.customRules = [];
                    }
                    
                    if (!data.customRules.includes(factToLearn)) {
                        data.customRules.push(factToLearn);
                        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
                    }

                    const responseText = `I have successfully learned: "${factToLearn}". This has been added to my custom rules and guidelines.`;

                    // Setup SSE headers
                    res.setHeader('Content-Type', 'text/event-stream');
                    res.setHeader('Cache-Control', 'no-cache');
                    res.setHeader('Connection', 'keep-alive');
                    res.flushHeaders();

                    // Stream confirmation reply
                    res.write(`data: ${JSON.stringify({ type: 'content', content: responseText })}\n\n`);

                    // Save assistant message to DB
                    const assistantMsg = new messageModel({
                        conversationId: thread._id,
                        userId: req.user.id,
                        role: "assistant",
                        content: responseText,
                        sources: []
                    });
                    await assistantMsg.save();

                    thread.messages.push(assistantMsg._id);
                    await thread.save();

                    res.write(`data: [DONE]\n\n`);
                    res.end();
                    return;
                } catch (learnErr) {
                    console.error("Error in /learn command:", learnErr);
                }
            }
        }

        // 1. Retrieve RAG context if enabled
        let contextChunks = [];
        let finalPrompt = message;
        let sources = [];

        if (thread.useDocuments) {
            try {
                contextChunks = await searchSimilarChunks(req.user.id, message, 4);
                if (contextChunks && contextChunks.length > 0) {
                    const contextText = contextChunks.map(c => `[Source Document: ${c.filename}]\n${c.text}`).join('\n\n');
                    finalPrompt = `You are IRIS, a helpful technical AI assistant. You have access to the user's uploaded documents. Use the following context to answer the user's question. If the context does not contain the answer, reply based on your general knowledge but mention clearly that the answer was not found in their documents.
                    
Context:
${contextText}

Question:
${message}`;
                    
                    sources = contextChunks.map(c => ({
                        documentId: c.documentId,
                        chunkText: c.text,
                        filename: c.filename,
                        score: c.score
                    }));
                }
            } catch (ragError) {
                console.error("Error retrieving RAG context:", ragError);
            }
        }

        // 2. Setup Server-Sent Events (SSE) headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        // Send sources immediately if they exist
        if (sources && sources.length > 0) {
            res.write(`data: ${JSON.stringify({ type: 'sources', sources })}\n\n`);
        }

        // Call the streaming AI model
        let aiResponseText = "";
        try {
            const stream = await AgentStreamReply(finalPrompt, chatHistory);
            
            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content || "";
                if (content) {
                    aiResponseText += content;
                    res.write(`data: ${JSON.stringify({ type: 'content', content })}\n\n`);
                }
            }
        } catch (streamErr) {
            console.error("Error streaming from Groq:", streamErr);
            res.write(`data: ${JSON.stringify({ type: 'error', error: streamErr.message })}\n\n`);
            res.end();
            return;
        }

        // 3. Save assistant response with optional sources
        const assistantMsg = new messageModel({
            conversationId: thread._id,
            userId: req.user.id,
            role: "assistant",
            content: aiResponseText,
            sources: sources
        });
        await assistantMsg.save();

        thread.messages.push(assistantMsg._id);
        await thread.save();

        // Send [DONE] event to client
        res.write(`data: [DONE]\n\n`);
        res.end();
    } catch (err) {
        console.error("Error in PostMessage:", err);
        // If headers are already sent, write error event and close
        if (res.headersSent) {
            res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
            res.end();
        } else {
            return res.status(500).json({
                message: "error in processing message",
                error: err.message
            })
        }
    }
}

module.exports = {
    PostMessage
}