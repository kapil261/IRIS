import { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { login, signup, googleLogin, logout, clearAuthError, selectAuth } from '../state/authSlice'

export const useAuth = () => {
  const dispatch = useDispatch()
  const { user, token, sessionStatus, submitStatus, error, googleClientId } = useSelector(selectAuth)

  return {
    user,
    isAuthenticated: !!token,
    isCheckingSession: sessionStatus !== 'ready',
    isSubmitting: submitStatus === 'loading',
    error,
    googleClientId,
    // `.unwrap()` so forms can await success and navigate, or catch the error message
    login: useCallback((email, password) => dispatch(login({ email, password })).unwrap(), [dispatch]),
    signup: useCallback((name, email, password) => dispatch(signup({ name, email, password })).unwrap(), [dispatch]),
    googleLogin: useCallback((credential) => dispatch(googleLogin(credential)).unwrap(), [dispatch]),
    logout: useCallback(() => dispatch(logout()), [dispatch]),
    clearError: useCallback(() => dispatch(clearAuthError()), [dispatch])
  }
}

export default useAuth
