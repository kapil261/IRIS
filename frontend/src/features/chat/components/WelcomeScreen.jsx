import { Bot, Sparkles, MessageSquare, BookOpen, FileText } from 'lucide-react'

const CONTENT = {
  chat: {
    title: 'How can I help you today?',
    subtitle: 'Ask anything about coding, writing, learning, or ideas.',
    suggestions: [
      { text: 'Explain quantum computing in simple terms', icon: Sparkles },
      { text: 'Help me debug a React hook syntax error', icon: Bot },
      { text: 'Write a clean and modern CSS button template', icon: MessageSquare },
      { text: 'Brainstorm unique ideas for a side project', icon: Sparkles }
    ]
  },
  doc: {
    title: 'Ask your documents anything',
    subtitle: 'Answers come from your Knowledge Base with numbered citations. Upload PDFs or TXT files from the sidebar.',
    suggestions: [
      { text: 'Summarize the key points of my documents', icon: BookOpen },
      { text: 'What are the main conclusions in my uploaded files?', icon: FileText },
      { text: 'List the important definitions and terms from my documents', icon: Sparkles },
      { text: 'What questions could an exam ask about this material?', icon: MessageSquare }
    ]
  },
  mentor: {
    title: 'What project do you want to build today?',
    subtitle: 'I will act as your Senior Developer: plan a roadmap, then build it with you one file at a time.',
    suggestions: [
      { text: 'I want to build a simple Todo app using Node.js', icon: Sparkles },
      { text: 'I want to build a task manager dashboard in React', icon: Bot },
      { text: 'I want to build a REST API using Express', icon: MessageSquare },
      { text: 'I want to build a URL shortener backend', icon: Sparkles }
    ]
  }
}

const WelcomeScreen = ({ mode, onSuggestion, disabled }) => {
  const { title, subtitle, suggestions } = CONTENT[mode] || CONTENT.chat
  const themeClass = mode === 'mentor' ? 'mentor-theme' : mode === 'doc' ? 'docs-theme' : ''

  return (
    <div className={`welcome-screen ${themeClass}`}>
      <div className="welcome-header">
        <div className="bot-glow">
          <Bot size={48} className="welcome-logo" />
        </div>
        <h2>{title}</h2>
        <p className="welcome-subtitle">{subtitle}</p>
      </div>

      <div className="suggestions-grid">
        {suggestions.map(({ text, icon: Icon }) => (
          <button
            key={text}
            type="button"
            className="suggestion-card"
            onClick={() => onSuggestion(text)}
            disabled={disabled}
          >
            <Icon className="card-icon" />
            <p>{text}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

export default WelcomeScreen
