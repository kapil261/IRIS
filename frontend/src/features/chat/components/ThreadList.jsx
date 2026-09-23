import { useState } from 'react'
import { MessageSquare, Trash2, Edit2, Check } from 'lucide-react'
import { useThreads } from '../hooks/useThreads'

const ThreadItem = ({ thread, isActive, onOpen, onDelete, onRename }) => {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState('')

  const startEdit = (e) => {
    e.stopPropagation()
    setTitle(thread.title || '')
    setEditing(true)
  }

  const commit = () => {
    const next = title.trim()
    if (next && next !== thread.title) onRename(thread._id, next)
    setEditing(false)
  }

  return (
    <div className={`chat-item ${isActive ? 'active' : ''}`} onClick={() => !editing && onOpen(thread._id)}>
      <MessageSquare size={16} className="chat-item-icon" />
      {editing ? (
        <input
          type="text"
          className="edit-title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') setEditing(false)
          }}
          onBlur={commit}
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="chat-item-title">{thread.title || 'Untitled Chat'}</span>
      )}

      <div className="chat-item-actions">
        {editing ? (
          <button className="save-chat-btn" onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); commit() }} title="Save title">
            <Check size={14} />
          </button>
        ) : (
          <>
            <button className="edit-chat-btn" onClick={startEdit} title="Rename conversation">
              <Edit2 size={14} />
            </button>
            <button
              className="delete-chat-btn"
              onClick={(e) => {
                e.stopPropagation()
                if (window.confirm(`Delete "${thread.title || 'this conversation'}"?`)) onDelete(thread._id)
              }}
              title="Delete conversation"
            >
              <Trash2 size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

const LIST_LABELS = {
  chat: { title: 'Chat conversations', empty: 'No chats yet' },
  doc: { title: 'Docs conversations', empty: 'No document Q&A yet' },
  mentor: { title: 'Mentor projects', empty: 'No mentor projects yet' }
}

const ThreadList = () => {
  const { mode, threads, isLoading, activeThreadId, open, remove, rename } = useThreads()
  const labels = LIST_LABELS[mode] || LIST_LABELS.chat

  return (
    <>
      <div className="history-label">{labels.title}</div>
      {isLoading ? (
        <div className="thread-skeletons">
          {[0, 1, 2].map((i) => <div key={i} className="thread-skeleton" />)}
        </div>
      ) : threads.length === 0 ? (
        <div className="no-history">{labels.empty}</div>
      ) : (
        threads.map((thread) => (
          <ThreadItem
            key={thread._id}
            thread={thread}
            isActive={thread.threadid === activeThreadId}
            onOpen={open}
            onDelete={remove}
            onRename={rename}
          />
        ))
      )}
    </>
  )
}

export default ThreadList
