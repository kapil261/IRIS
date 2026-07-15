import React, { useState } from 'react'
import { MessageSquare, Plus, Trash2, Edit2, Check, User, LogOut } from 'lucide-react'
import DocumentPanel from './DocumentPanel'

const Sidebar = ({
  sidebarOpen,
  startNewChat,
  loading,
  chatsList,
  threadid,
  loadChat,
  deleteChatById,
  renameChat,
  user,
  logout
}) => {
  const [editingChatId, setEditingChatId] = useState(null)
  const [editTitle, setEditTitle] = useState("")

  const handleChatSelect = (chatId) => {
    if (loading || editingChatId) return
    loadChat(chatId)
  }

  const handleDelete = (e, chatId) => {
    e.stopPropagation()
    if (loading) return
    deleteChatById(chatId)
  }

  const handleEditClick = (e, chat) => {
    e.stopPropagation()
    setEditingChatId(chat._id)
    setEditTitle(chat.title || "")
  }

  const handleRenameSubmit = async (chatId) => {
    if (!editTitle.trim()) {
      setEditingChatId(null)
      return
    }
    await renameChat(chatId, editTitle.trim())
    setEditingChatId(null)
    setEditTitle("")
  }

  const handleEditKeyDown = (e, chatId) => {
    if (e.key === 'Enter') {
      handleRenameSubmit(chatId)
    } else if (e.key === 'Escape') {
      setEditingChatId(null)
      setEditTitle("")
    }
  }

  const handleEditBlur = (chatId) => {
    setTimeout(() => {
      handleRenameSubmit(chatId)
    }, 150)
  }

  return (
    <div className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <button className="new-chat-btn" onClick={startNewChat} disabled={loading}>
          <Plus size={18} />
          <span>New Chat</span>
        </button>
      </div>
      
      <div className="chats-history">
        <div className="history-label">Recent Conversations</div>
        {chatsList.length === 0 ? (
          <div className="no-history">No past conversations</div>
        ) : (
          chatsList.map((chat) => (
            <div 
              key={chat._id} 
              className={`chat-item ${threadid === chat.threadid ? 'active' : ''}`}
              onClick={() => handleChatSelect(chat._id)}
            >
              <MessageSquare size={16} className="chat-item-icon" />
              {editingChatId === chat._id ? (
                <input
                  type="text"
                  className="edit-title-input"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => handleEditKeyDown(e, chat._id)}
                  onBlur={() => handleEditBlur(chat._id)}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="chat-item-title">{chat.title || "Untitled Chat"}</span>
              )}
              
              <div className="chat-item-actions">
                {editingChatId === chat._id ? (
                  <button 
                    className="save-chat-btn" 
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRenameSubmit(chat._id)
                    }}
                    title="Save title"
                  >
                    <Check size={14} />
                  </button>
                ) : (
                  <>
                    <button 
                      className="edit-chat-btn" 
                      onClick={(e) => handleEditClick(e, chat)}
                      title="Rename conversation"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      className="delete-chat-btn" 
                      onClick={(e) => handleDelete(e, chat._id)}
                      title="Delete conversation"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <DocumentPanel />
      
      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="profile-avatar">
            <User size={16} />
          </div>
          <div className="user-info">
            <span className="username">{user?.name || "Guest User"}</span>
            <span className="user-email">{user?.email}</span>
          </div>
        </div>
        <button className="logout-btn" onClick={logout} title="Sign Out">
          <LogOut size={16} />
        </button>
      </div>
    </div>
  )
}

export default Sidebar
