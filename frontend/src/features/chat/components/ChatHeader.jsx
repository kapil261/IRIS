import { Bot, Sun, Moon, LayoutGrid } from 'lucide-react'
import ModeSelector from './ModeSelector'
import { useUi } from '../../ui/hooks/useUi'

const ChatHeader = ({ mode, onModeChange, onNewChat, isGenerating, busyModes, mentorProgress }) => {
  const { theme, toggleTheme, toggleSidebar, sidebarOpen, roadmapOpen, setRoadmapOpen } = useUi()

  return (
    <div className="nav-bar">
      <div className="left-controls">
        <button className="toggle-sidebar-btn" onClick={toggleSidebar} title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}>
          <Bot size={20} />
        </button>
        <div className="brand" onClick={onNewChat} title="New chat">
          <Bot className="brand-logo" />
          <h1>IRIS</h1>
        </div>
      </div>

      <div className="right-controls">
        {mentorProgress && (
          <div className="roadmap-toggle-container">
            <button
              className={`roadmap-toggle-btn ${roadmapOpen ? 'active' : ''}`}
              onClick={() => setRoadmapOpen(!roadmapOpen)}
              title={roadmapOpen ? 'Hide Roadmap Panel' : 'Show Roadmap Panel'}
            >
              <LayoutGrid size={16} />
              <span>Roadmap</span>
              <span className="roadmap-progress-pill">{mentorProgress.done}/{mentorProgress.total}</span>
            </button>
          </div>
        )}

        <ModeSelector mode={mode} onChange={onModeChange} busyModes={busyModes} />

        <div className="theme-toggle-container">
          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        <div className="status-indicator">
          <span className={`dot ${isGenerating ? 'busy' : 'online'}`} />
          <span>{isGenerating ? 'IRIS is responding…' : 'IRIS v2.0 Online'}</span>
        </div>
      </div>
    </div>
  )
}

export default ChatHeader
