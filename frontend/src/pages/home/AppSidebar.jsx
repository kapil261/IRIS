import { Plus, User, LogOut } from 'lucide-react'
import ThreadList from '../../features/chat/components/ThreadList'
import DocumentPanel from '../../features/docs/components/DocumentPanel'
import { useChat } from '../../features/chat/hooks/useChat'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { useUi, useDragResize } from '../../features/ui/hooks/useUi'

const AppSidebar = () => {
  const { newChat, mode } = useChat()
  const { user, logout } = useAuth()
  const { sidebarOpen, sidebarWidth, setSidebarWidth } = useUi()
  const onResizeStart = useDragResize(sidebarWidth, setSidebarWidth, 1)

  return (
    <div className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`} style={sidebarOpen ? { width: `${sidebarWidth}px` } : undefined}>
      {sidebarOpen && <div className="sidebar-resize-handle" onMouseDown={onResizeStart} />}

      <div className="sidebar-header">
        <button className="new-chat-btn" onClick={newChat}>
          <Plus size={18} />
          <span>New Chat</span>
        </button>
      </div>

      <div className="chats-history">
        <ThreadList />
      </div>

      {/* The knowledge base matters most in Docs mode, but is always reachable */}
      <div className={mode === 'doc' ? 'docs-panel-highlight' : ''}>
        <DocumentPanel />
      </div>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="profile-avatar">
            <User size={16} />
          </div>
          <div className="user-info">
            <span className="username">{user?.name || 'Guest User'}</span>
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

export default AppSidebar
