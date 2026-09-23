import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { RouterProvider } from 'react-router'
import { router } from './app/routes'
import { restoreSession, fetchAuthConfig } from './features/auth/state/authSlice'
import { useThemeSync } from './features/ui/hooks/useUi'
import './shared/styles/global.scss'
import './shared/styles/layout.scss'
import './shared/styles/feedback.scss'

const App = () => {
  const dispatch = useDispatch()
  useThemeSync()

  // Validate any stored token against GET /api/auth/me before rendering protected pages,
  // and load public sign-in options (e.g. the Google client id).
  useEffect(() => {
    dispatch(restoreSession())
    dispatch(fetchAuthConfig())
  }, [dispatch])

  return <RouterProvider router={router} />
}

export default App
