import { Navigate } from 'react-router'
import { useAuth } from '../hooks/useAuth'
import Spinner from '../../../shared/components/Spinner'

// Login/signup pages: send already-signed-in users straight to the app.
const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated, isCheckingSession } = useAuth()

  if (isCheckingSession) return <Spinner size={40} fullScreen />
  if (isAuthenticated) return <Navigate to="/" replace />
  return children
}

export default PublicOnlyRoute
