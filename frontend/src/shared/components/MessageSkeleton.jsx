// Placeholder rows shown while a conversation is being fetched.
const MessageSkeleton = ({ rows = 3 }) => (
  <div className="messages-list skeleton-list" aria-busy="true" aria-label="Loading conversation">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className={`skeleton-row ${i % 2 === 0 ? 'user' : 'assistant'}`}>
        <div className="skeleton-avatar" />
        <div className="skeleton-lines">
          <div className="skeleton-line" style={{ width: i % 2 === 0 ? '45%' : '80%' }} />
          {i % 2 !== 0 && <div className="skeleton-line" style={{ width: '65%' }} />}
          {i % 2 !== 0 && <div className="skeleton-line" style={{ width: '50%' }} />}
        </div>
      </div>
    ))}
  </div>
)

export default MessageSkeleton
