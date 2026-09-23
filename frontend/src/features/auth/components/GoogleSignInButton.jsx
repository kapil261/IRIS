import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../hooks/useAuth'

/**
 * "Continue with Google" via Google Identity Services. Google returns a signed ID token
 * (`credential`), which the backend verifies before creating/signing in the user.
 * Renders nothing when the backend has no GOOGLE_CLIENT_ID configured.
 * On success the auth slice stores the session and PublicOnlyRoute redirects to the app.
 */
const GoogleSignInButton = ({ onError, disabled }) => {
  const { googleClientId, googleLogin } = useAuth()
  if (!googleClientId) return null

  const handleSuccess = async ({ credential }) => {
    try {
      await googleLogin(credential)
    } catch (err) {
      onError?.(typeof err === 'string' ? err : err?.message || 'Google sign-in failed')
    }
  }

  return (
    <>
      <div className="auth-divider"><span>or</span></div>
      <div className={`google-signin ${disabled ? 'disabled' : ''}`}>
        <GoogleOAuthProvider clientId={googleClientId}>
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={() => onError?.('Google sign-in was cancelled or failed. Please try again.')}
            text="continue_with"
            theme="filled_black"
            shape="pill"
            size="large"
            width="340"
          />
        </GoogleOAuthProvider>
      </div>
    </>
  )
}

export default GoogleSignInButton
