import { CheckCircle2, Circle, PlayCircle, Folder, LayoutGrid, PartyPopper, ShieldCheck, Wrench, AlertTriangle } from 'lucide-react'
import { useUi, useDragResize } from '../../ui/hooks/useUi'

const shortPath = (path) => path.replace(/^(Backend|Frontend)\//, '')

// Result of the Code Reviewer's latest pass over a file.
const REVIEW_BADGES = {
  passed: { icon: ShieldCheck, className: 'passed', label: 'Reviewed — no issues' },
  fixed: { icon: Wrench, className: 'fixed', label: 'Reviewed — fixed by the Code Reviewer' },
  issues: { icon: AlertTriangle, className: 'issues', label: 'Reviewed — issues found' }
}

const ReviewBadge = ({ file }) => {
  const badge = REVIEW_BADGES[file.reviewStatus]
  if (!badge) return null
  const Icon = badge.icon
  const title = file.reviewSummary ? `${badge.label}: ${file.reviewSummary}` : badge.label
  return (
    <span className={`review-badge ${badge.className}`} title={title}>
      <Icon size={11} />
      {file.version > 1 && <span className="review-version">v{file.version}</span>}
    </span>
  )
}

/**
 * Cowork-style task list for Mentor mode: tasks with per-file status, the current file
 * highlighted, and an overall progress count. Data comes from the backend ProjectState.
 */
const MentorRoadmap = ({ view, onGenerateCurrent, disabled }) => {
  const { roadmapWidth, setRoadmapOpen, setRoadmapWidth } = useUi()
  const onResizeStart = useDragResize(roadmapWidth, setRoadmapWidth, -1)

  const { roadmap = [], progress = { done: 0, total: 0 }, currentFilePath, phase, projectName } = view
  const percent = progress.total ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <aside className="mentor-roadmap-panel" style={{ width: `${roadmapWidth}px` }}>
      <div className="roadmap-resize-handle" onMouseDown={onResizeStart} />
      <div className="roadmap-header">
        <div className="header-title">
          <LayoutGrid size={16} className="header-icon" />
          <h3 title={projectName}>{projectName || 'Project Roadmap'}</h3>
        </div>
        <span className="roadmap-header-progress">{progress.done}/{progress.total} done</span>
        <button className="close-btn" onClick={() => setRoadmapOpen(false)} title="Hide roadmap">×</button>
      </div>

      <div className="roadmap-progress-bar" title={`${percent}% complete`}>
        <div className="roadmap-progress-fill" style={{ width: `${percent}%` }} />
      </div>

      {phase === 'done' && (
        <div className="roadmap-complete-banner">
          <PartyPopper size={15} />
          <span>Roadmap complete!</span>
        </div>
      )}

      <div className="roadmap-content">
        {roadmap.map((task, taskIdx) => {
          const isTaskDone = task.files.length > 0 && task.files.every((f) => f.status === 'done')
          const isActiveTask = task.files.some((f) => f.path === currentFilePath)
          const isExpanded = isActiveTask || task.files.some((f) => f.status === 'done')

          return (
            <div key={taskIdx} className={`roadmap-section ${isExpanded ? 'expanded' : 'collapsed'}`}>
              <div className="roadmap-folder-name">
                <Folder size={14} className="folder-icon" />
                <span>{task.title}</span>
                {isTaskDone && <CheckCircle2 size={12} className="group-completed-icon" />}
              </div>

              {isExpanded && (
                <div className="roadmap-files">
                  {task.files.map((file) => {
                    const isDone = file.status === 'done'
                    const isCurrent = file.path === currentFilePath
                    const clickable = isCurrent && !disabled
                    return (
                      <div
                        key={file.path}
                        className={`roadmap-file-item ${isDone ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${clickable ? 'clickable' : ''}`}
                        onClick={clickable ? onGenerateCurrent : undefined}
                        title={isCurrent ? 'Click, or say "next", to generate this file' : file.path}
                      >
                        <div className="status-indicator-icon">
                          {isDone ? (
                            <CheckCircle2 size={14} className="completed-icon" />
                          ) : isCurrent ? (
                            <PlayCircle size={14} className="current-icon pulsing" />
                          ) : (
                            <Circle size={14} className="pending-icon" />
                          )}
                        </div>
                        <span className="file-path" title={file.path}>{shortPath(file.path)}</span>
                        <ReviewBadge file={file} />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </aside>
  )
}

export default MentorRoadmap
