import { useRef } from 'react'
import { FileText, UploadCloud, Trash2 } from 'lucide-react'
import { useDocuments } from '../hooks/useDocuments'
import ErrorBanner from '../../../shared/components/ErrorBanner'
import '../styles/DocumentPanel.scss'

const formatSize = (bytes) => {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const statusLabel = (doc) => {
  if (doc.status === 'ready') return `Ready · ${doc.chunkCount} chunks${doc.size ? ` · ${formatSize(doc.size)}` : ''}`
  if (doc.status === 'failed') return 'Processing failed'
  return 'Processing…'
}

const DocumentPanel = () => {
  const { documents, uploading, deletingIds, readyCount, error, upload, remove, clearError } = useDocuments()
  const fileInputRef = useRef(null)

  const handleFiles = (fileList) => {
    const file = fileList?.[0]
    if (file) upload(file)
  }

  return (
    <div className="document-panel">
      <div className="panel-title">
        <span>Knowledge Base</span>
        {documents.length > 0 && (
          <span className="panel-count">{readyCount}/{documents.length} ready</span>
        )}
      </div>

      <ErrorBanner message={error} onDismiss={clearError} className="compact" />

      <div
        className={`upload-dropzone ${uploading ? 'uploading' : ''}`}
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDrop={(e) => {
          e.preventDefault()
          if (!uploading) handleFiles(e.dataTransfer.files)
        }}
        onDragOver={(e) => e.preventDefault()}
      >
        {uploading ? (
          <>
            <div className="mini-spinner large" />
            <p>Uploading…</p>
          </>
        ) : (
          <>
            <UploadCloud className="upload-icon" size={32} />
            <p>Click or drag file to upload</p>
            <span className="file-limit">PDF, TXT up to 10MB</span>
          </>
        )}
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => {
            handleFiles(e.target.files)
            e.target.value = '' // allow re-selecting the same file
          }}
          accept=".pdf,.txt"
          style={{ display: 'none' }}
        />
      </div>

      <div className="documents-list">
        {documents.length === 0 ? (
          <div className="no-docs">No documents uploaded</div>
        ) : (
          documents.map((doc) => (
            <div key={doc._id} className="doc-item">
              <div className="doc-info">
                <FileText className={`doc-icon ${doc.status}`} size={16} />
                <div className="doc-details">
                  <span className="doc-name" title={doc.filename}>{doc.filename}</span>
                  <span className={`doc-status ${doc.status}`}>
                    {doc.status === 'processing' && <div className="mini-spinner" />}
                    <span>{statusLabel(doc)}</span>
                  </span>
                  {doc.status === 'failed' && doc.errorMessage && (
                    <span className="doc-error" title={doc.errorMessage}>{doc.errorMessage}</span>
                  )}
                </div>
              </div>

              <button
                className="delete-doc-btn"
                onClick={() => remove(doc._id)}
                disabled={deletingIds.includes(doc._id)}
                title="Delete document"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default DocumentPanel
