import { createBrowserRouter, Navigate } from 'react-router'
import HomePage from '../pages/home/HomePage'
import LoginPage from '../features/auth/pages/LoginPage'
import SignupPage from '../features/auth/pages/SignupPage'
import ProtectedRoute from '../features/auth/components/ProtectedRoute'
import PublicOnlyRoute from '../features/auth/components/PublicOnlyRoute'

export const router = createBrowserRouter([
  { path: '/', element: <ProtectedRoute><HomePage /></ProtectedRoute> },
  { path: '/login', element: <PublicOnlyRoute><LoginPage /></PublicOnlyRoute> },
  { path: '/signup', element: <PublicOnlyRoute><SignupPage /></PublicOnlyRoute> },
  { path: '*', element: <Navigate to="/" replace /> }
])

export default router
