import React, { useState, useEffect, useRef } from 'react'
import { Bot, User, Send, Sparkles, MessageSquare, Sun, Moon } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

const CodeBlock = ({ language, value }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  return (
    <div className="code-block-container">
      <div className="code-block-header">
        <span className="code-lang">{language || 'code'}</span>
        <button className="copy-btn" onClick={handleCopy} type="button">
          {copied ? 'Copied!' : 'Copy code'}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={atomDark}
        customStyle={{ margin: 0, borderRadius: '0 0 0.5rem 0.5rem', background: '#111214' }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  )
}

const markdownComponents = {
  code({ node, inline, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '')
    const codeValue = String(children).replace(/\n$/, '')
    
    return !inline && match ? (
      <CodeBlock 
        language={match[1]} 
        value={codeValue} 
      />
    ) : (
      <code className={className} {...props}>
        {children}
      </code>
    )
  }
}

const ChatArea = ({
  sidebarOpen,
  setSidebarOpen,
  startNewChat,
  useDocuments,
  toggleDocsMode,
  messages,
  loading,
  handleSendMessage
}) => {
  const [inputVal, setInputVal] = useState("")
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('iris_theme')
    return saved || 'dark'
  })
  const messagesEndRef = useRef(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('iris_theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  // Auto scroll to bottom when messages or loading state changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!inputVal.trim() || loading) return
    const text = inputVal
    setInputVal("")
    await handleSendMessage(text)
  }

  const handleSuggestionClick = async (promptText) => {
    if (loading) return
    await handleSendMessage(promptText)
  }

  const suggestions = [
    { text: "Explain quantum computing in simple terms", icon: <Sparkles className="card-icon" /> },
    { text: "Help me debug a React hook syntax error", icon: <Bot className="card-icon" /> },
    { text: "Write a clean and modern CSS button template", icon: <MessageSquare className="card-icon" /> },
    { text: "Brainstorm unique ideas for a side project", icon: <Sparkles className="card-icon" /> }
  ]

  return (
    <div className="main-content">
      {/* Navbar */}
      <div className="nav-bar">
        <div className="left-controls">
          <button 
            className="toggle-sidebar-btn" 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
          >
            <Bot size={20} />
          </button>
          <div className="brand" onClick={startNewChat}>
            <Bot className="brand-logo" />
            <h1>IRIS</h1>
          </div>
        </div>
        <div className="right-controls">
          <div className="docs-mode-toggle-container">
            <span className="toggle-label">Docs Mode</span>
            <button 
              className={`toggle-switch ${useDocuments ? 'active' : ''}`}
              onClick={() => toggleDocsMode(!useDocuments)}
              title={useDocuments ? "Disable document grounding" : "Enable document grounding"}
            >
              <span className="toggle-slider"></span>
            </button>
          </div>
          <div className="theme-toggle-container">
            <button 
              className="theme-toggle-btn"
              onClick={toggleTheme}
              title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
          <div className="status-indicator">
            <span className="dot online"></span>
            <span>IRIS v2.0 Online</span>
          </div>
        </div>
      </div>

      {/* Chat scroll container */}
      <div className="chat-scroll-container">
        {messages.length === 0 ? (
          <div className="welcome-screen">
            <div className="welcome-header">
              <div className="bot-glow">
                <Bot size={48} className="welcome-logo" />
              </div>
              <h2>How can I help you today?</h2>
              <p className="welcome-subtitle">Ask anything about coding, writing, learning, or ideas.</p>
            </div>
            
            <div className="suggestions-grid">
              {suggestions.map((sug, idx) => (
                <div 
                  key={idx} 
                  className="suggestion-card"
                  onClick={() => handleSuggestionClick(sug.text)}
                >
                  {sug.icon}
                  <p>{sug.text}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="messages-list">
            {messages.map((msg, index) => (
              <div key={index} className={`message-wrapper ${msg.role}`}>
                <div className="message-avatar">
                  {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                </div>
                <div className="message-bubble-container">
                  <div className="message-sender">
                    {msg.role === 'user' ? 'You' : 'IRIS'}
                  </div>
                  <div className="message-bubble">
                    <ReactMarkdown components={markdownComponents}>
                      {msg.content}
                    </ReactMarkdown>
                    
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="message-citations">
                        <div className="citations-header">Sources used:</div>
                        <div className="citations-list">
                          {msg.sources.map((src, srcIdx) => (
                            <div key={srcIdx} className="citation-badge" title={src.chunkText}>
                              📄 {src.filename} (score: {Math.round(src.score * 100)}%)
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="message-wrapper assistant loading">
                <div className="message-avatar">
                  <Bot size={18} />
                </div>
                <div className="message-bubble-container">
                  <div className="message-sender">IRIS</div>
                  <div className="message-bubble typing-bubble">
                    <span className="dot"></span>
                    <span className="dot"></span>
                    <span className="dot"></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Form area */}
      <div className="footer-area">
        <form onSubmit={onSubmit} className="chat-form">
          <div className="input-container">
            <input
              type='text'
              placeholder="What is in your mind today?"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              disabled={loading}
            />
            <button 
              type="submit" 
              className="send-button"
              disabled={loading || !inputVal.trim()}
            >
              <Send size={18} />
            </button>
          </div>
        </form>
        <p className="disclaimer">IRIS can make mistakes. Verify important info.</p>
      </div>
    </div>
  )
}

export default ChatArea
