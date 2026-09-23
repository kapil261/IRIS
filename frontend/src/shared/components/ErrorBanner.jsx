import { AlertCircle, X } from 'lucide-react'

/** Dismissible inline error. Renders nothing when `message` is empty. */
const ErrorBanner = ({ message, onDismiss, className = '' }) => {
  if (!message) return null
  return (
    <div className={`error-banner ${className}`} role="alert">
      <AlertCircle size={15} className="error-banner-icon" />
      <span className="error-banner-text">{message}</span>
      {onDismiss && (
        <button type="button" className="error-banner-close" onClick={onDismiss} title="Dismiss">
          <X size={14} />
        </button>
      )}
    </div>
  )
}

export default ErrorBanner
