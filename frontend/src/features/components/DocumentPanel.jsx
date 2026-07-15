import { useEffect, useRef, useState } from 'react'
import { FileText, UploadCloud, Trash2, AlertCircle } from 'lucide-react'
import { useMessage } from '../Hooks/UseMessage'
import '../style/DocumentPanel.scss'

const DocumentPanel = () => {
  const {
    documentsList,
    docsLoading,
    loadDocuments,
    uploadDocument,
    deleteDocument
  } = useMessage()

  const fileInputRef = useRef(null)
  const [uploadError, setUploadError] = useState("")

  // Initial load of documents
  useEffect(() => {
    loadDocuments()
  }, [])

  // Poll for document status updates if any document is processing
  useEffect(() => {
    const hasProcessingDocs = documentsList.some(doc => doc.status === 'processing')
    
    if (hasProcessingDocs) {
      const interval = setInterval(() => {
        loadDocuments()
      }, 3000)
      
      return () => clearInterval(interval)
    }
  }, [documentsList])

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    await processUploadedFile(file)
  }

  const processUploadedFile = async (file) => {
    // Check type
    const validTypes = ['text/plain', 'application/pdf']
    const fileExt = file.name.split('.').pop().toLowerCase()
    
    if (!validTypes.includes(file.type) && fileExt !== 'txt' && fileExt !== 'pdf') {
      setUploadError("Only PDF and TXT files are allowed.")
      setTimeout(() => setUploadError(""), 3000)
      return
    }

    // Check size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File size must be under 10MB.")
      setTimeout(() => setUploadError(""), 3000)
      return
    }

    setUploadError("")
    try {
      await uploadDocument(file)
    } catch (err) {
      setUploadError("Upload failed. Try again.")
      setTimeout(() => setUploadError(""), 3000)
    }
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (!file) return
    await processUploadedFile(file)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const triggerFileSelect = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="document-panel">
      <div className="panel-title">Knowledge Base</div>

      {uploadError && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          fontSize: '0.75rem',
          color: '#f87171',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          padding: '0.4rem 0.6rem',
          borderRadius: '0.375rem',
          border: '1px solid rgba(239, 68, 68, 0.15)'
        }}>
          <AlertCircle size={12} />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Upload Box */}
      <div 
        className="upload-dropzone" 
        onClick={triggerFileSelect}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <UploadCloud className="upload-icon" size={32} />
        <p>Click or drag file to upload</p>
        <span className="file-limit">PDF, TXT up to 10MB</span>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept=".pdf,.txt"
          style={{ display: 'none' }}
        />
      </div>

      {/* Documents List */}
      <div className="documents-list">
        {documentsList.length === 0 ? (
          <div className="no-docs">No documents uploaded</div>
        ) : (
          documentsList.map((doc) => (
            <div key={doc._id} className="doc-item">
              <div className="doc-info">
                <FileText 
                  className={`doc-icon ${doc.status}`} 
                  size={16} 
                />
                <div className="doc-details">
                  <span className="doc-name" title={doc.filename}>{doc.filename}</span>
                  <span className={`doc-status ${doc.status}`}>
                    {doc.status === 'processing' && (
                      <>
                        <div className="mini-spinner"></div>
                        <span>Processing...</span>
                      </>
                    )}
                    {doc.status === 'ready' && `Ready (${doc.chunkCount} chunks)`}
                    {doc.status === 'failed' && "Processing failed"}
                  </span>
                </div>
              </div>
              
              <button 
                className="delete-doc-btn" 
                onClick={() => deleteDocument(doc._id)}
                disabled={docsLoading}
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
