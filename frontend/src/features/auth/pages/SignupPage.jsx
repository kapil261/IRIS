import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Bot, User, Mail, Lock, AlertCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import GoogleSignInButton from '../components/GoogleSignInButton'
import '../styles/Auth.scss'

const SignupPage = () => {
  const { signup } = useAuth()
  const navigate = useNavigate()
  
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [formError, setFormError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !password.trim()) {
      setFormError("Please fill in all fields")
      return
    }

    if (password.length < 6) {
      setFormError("Password must be at least 6 characters")
      return
    }

    if (password !== confirmPassword) {
      setFormError("Passwords do not match")
      return
    }

    setFormError("")
    setIsSubmitting(true)
    try {
      await signup(name.trim(), email.trim(), password)
      navigate("/")
    } catch (err) {
      setFormError((typeof err === 'string' ? err : err?.message) || "Registration failed")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo-container">
            <Bot size={28} />
          </div>
          <h2>Create Account</h2>
          <p>Get started with your custom AI assistant</p>
        </div>

        {formError && (
          <div className="auth-error">
            <AlertCircle size={16} />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <div className="input-wrapper">
              <User className="input-icon" size={18} />
              <input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div className="input-wrapper">
              <Mail className="input-icon" size={18} />
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={18} />
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={18} />
              <input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          <button type="submit" className="auth-submit-btn" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <div className="spinner"></div>
                <span>Creating account...</span>
              </>
            ) : (
              <span>Sign Up</span>
            )}
          </button>
        </form>

        <GoogleSignInButton onError={setFormError} disabled={isSubmitting} />

        <div className="auth-footer">
          Already have an account? 
          <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  )
}

export default SignupPage
