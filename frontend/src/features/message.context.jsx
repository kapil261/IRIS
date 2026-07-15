import { useState, createContext } from 'react'

export const messageContext = createContext()

export const MessageProvider = ({ children }) => {
    const [loading, setLoading] = useState(false)
    const [threadid, setThreadId] = useState("")
    const [messages, setMessages] = useState([])
    const [chatsList, setChatsList] = useState([])
    const [useDocuments, setUseDocuments] = useState(false)
    const [documentsList, setDocumentsList] = useState([])
    const [docsLoading, setDocsLoading] = useState(false)

    return (
        <messageContext.Provider
            value={{
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
            }}
        >
            {children}
        </messageContext.Provider>
    )
}

export default MessageProvider