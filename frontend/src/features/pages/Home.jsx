import { useState, useEffect } from 'react'
import { useMessage } from '../Hooks/UseMessage'
import { useAuth } from '../auth.context'
import Sidebar from '../components/Sidebar'
import ChatArea from '../components/ChatArea'
import '../style/Home.scss'

const Home = () => {
  const {
    loading,
    threadid,
    messages,
    chatsList,
    loadChats,
    loadChat,
    deleteChatById,
    startNewChat,
    handleSendMessage,
    renameChat,
    useDocuments,
    toggleDocsMode
  } = useMessage()

  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Fetch all chats on component mount
  useEffect(() => {
    loadChats()
  }, [])

  return (
    <div className="app-container">
      <Sidebar
        sidebarOpen={sidebarOpen}
        startNewChat={startNewChat}
        loading={loading}
        chatsList={chatsList}
        threadid={threadid}
        loadChat={loadChat}
        deleteChatById={deleteChatById}
        renameChat={renameChat}
        user={user}
        logout={logout}
      />
      <ChatArea
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        startNewChat={startNewChat}
        useDocuments={useDocuments}
        toggleDocsMode={toggleDocsMode}
        messages={messages}
        loading={loading}
        handleSendMessage={handleSendMessage}
      />
    </div>
  )
}

export default Home