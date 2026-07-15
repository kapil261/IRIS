import { PostMessage, GetChats, GetChatById, DeleteChat, RenameChat, GetDocuments, UploadDocument, DeleteDocument, UpdateChatSettings } from '../services/message.api'
import { useContext } from 'react'
import { messageContext } from "../message.context.jsx"

export const useMessage = () => {
    const context = useContext(messageContext)
    const { 
        loading, 
        setLoading, 
        threadid, 
        setThreadId, 
        messages, 
        setMessages,
        chatsList,
        setChatsList,
        useDocuments,
        setUseDocuments,
        documentsList,
        setDocumentsList,
        docsLoading,
        setDocsLoading
    } = context

    const loadChats = async () => {
        try {
            const data = await GetChats()
            setChatsList(data)
        } catch (error) {
            console.error('Error fetching chats:', error)
        }
    }

    const loadChat = async (id) => {
        setLoading(true)
        try {
            const chat = await GetChatById(id)
            if (chat) {
                setThreadId(chat.threadid)
                setMessages(chat.messages || [])
                setUseDocuments(chat.useDocuments || false)
            }
        } catch (error) {
            console.error('Error loading chat:', error)
        } finally {
            setLoading(false)
        }
    }

    const deleteChatById = async (id) => {
        try {
            const res = await DeleteChat(id)
            if (res.deleted && res.deleted.threadid === threadid) {
                startNewChat()
            }
            await loadChats()
        } catch (error) {
            console.error('Error deleting chat:', error)
        }
    }

    const startNewChat = () => {
        setThreadId("")
        setMessages([])
        setUseDocuments(false)
    }

    const handleSendMessage = async (messageText) => {
        if (!messageText.trim()) return

        let currentThreadId = threadid
        let isNewThread = false
        if (!currentThreadId) {
            currentThreadId = 'thread_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
            setThreadId(currentThreadId)
            isNewThread = true
        }

        const newUserMessage = { role: 'user', content: messageText }
        setMessages((prev) => [...prev, newUserMessage])
        setLoading(true)

        try {
            let assistantMessageText = ""
            let assistantMessageSources = []

            await PostMessage(
                currentThreadId, 
                messageText, 
                useDocuments,
                (chunk) => {
                    setLoading(false)
                    assistantMessageText += chunk
                    setMessages((prev) => {
                        const updated = [...prev]
                        const lastMsg = updated[updated.length - 1]
                        if (lastMsg && lastMsg.role === 'assistant') {
                            lastMsg.content = assistantMessageText
                        } else {
                            updated.push({ role: 'assistant', content: assistantMessageText, sources: assistantMessageSources })
                        }
                        return updated
                    })
                },
                (sources) => {
                    assistantMessageSources = sources
                    setMessages((prev) => {
                        const updated = [...prev]
                        const lastMsg = updated[updated.length - 1]
                        if (lastMsg && lastMsg.role === 'assistant') {
                            lastMsg.sources = assistantMessageSources
                        } else {
                            updated.push({ role: 'assistant', content: "", sources: assistantMessageSources })
                        }
                        return updated
                    })
                }
            )
            await loadChats()
        } catch (error) {
            console.error('Error sending message:', error)
            setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }])
        } finally {
            setLoading(false)
        }
    }

    const renameChat = async (id, title) => {
        try {
            await RenameChat(id, title)
            await loadChats()
        } catch (error) {
            console.error('Error renaming chat:', error)
        }
    }

    const toggleDocsMode = async (enabled) => {
        setUseDocuments(enabled)
        // If we have an active chat, persist the change to the backend
        if (threadid) {
            try {
                // Find chat ID in chatsList
                const chat = chatsList.find(c => c.threadid === threadid)
                if (chat) {
                    await UpdateChatSettings(chat._id, { useDocuments: enabled })
                }
            } catch (error) {
                console.error('Error updating docs mode on server:', error)
            }
        }
    }

    const loadDocuments = async () => {
        setDocsLoading(true)
        try {
            const docs = await GetDocuments()
            setDocumentsList(docs)
        } catch (error) {
            console.error('Error loading documents:', error)
        } finally {
            setDocsLoading(false)
        }
    }

    const uploadDocument = async (file) => {
        setDocsLoading(true)
        const formData = new FormData()
        formData.append('file', file)
        try {
            await UploadDocument(formData)
            await loadDocuments()
        } catch (error) {
            console.error('Error uploading document:', error)
            throw error;
        } finally {
            setDocsLoading(false)
        }
    }

    const deleteDocument = async (id) => {
        setDocsLoading(true)
        try {
            await DeleteDocument(id)
            await loadDocuments()
        } catch (error) {
            console.error('Error deleting document:', error)
        } finally {
            setDocsLoading(false)
        }
    }

    return {
        loading,
        setLoading,
        threadid,
        setThreadId,
        messages,
        setMessages,
        chatsList,
        setChatsList,
        useDocuments,
        setUseDocuments,
        documentsList,
        setDocumentsList,
        docsLoading,
        setDocsLoading,
        loadChats,
        loadChat,
        deleteChatById,
        startNewChat,
        handleSendMessage,
        renameChat,
        toggleDocsMode,
        loadDocuments,
        uploadDocument,
        deleteDocument
    }
}

export const UseMessage = useMessage