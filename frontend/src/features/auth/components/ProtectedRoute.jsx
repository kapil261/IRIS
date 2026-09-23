import { Navigate } from 'react-router'
import { useAuth } from '../hooks/useAuth'
import Spinner from '../../../shared/components/Spinner'

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isCheckingSession } = useAuth()

  if (isCheckingSession) return <Spinner size={40} fullScreen label="Restoring your session…" />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

export default ProtectedRoute
