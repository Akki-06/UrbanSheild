import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { FaLock, FaUser } from "react-icons/fa"
import { GoogleLogin } from "@react-oauth/google"
import { useAuth } from "../context/AuthContext"
import { handleGoogleSuccess } from "../api/googleAuth"
import api from "../api/axios"
import "../styles/auth.css"

export default function Login() {
  const navigate = useNavigate()
  const { setIsLoggedIn, setUser } = useAuth()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await api.post("token/", {
        username,
        password,
      })

      // Store tokens in localStorage
      const storedMeta = localStorage.getItem("user_meta")
      const prevMeta = storedMeta ? JSON.parse(storedMeta) : null
      const inferredAdmin = username?.toLowerCase().includes("admin")
      const isAdmin = prevMeta?.isAdmin || inferredAdmin || false

      localStorage.setItem("access_token", response.data.access)
      localStorage.setItem("refresh_token", response.data.refresh)
      localStorage.setItem("user_meta", JSON.stringify({
        username,
        isAdmin
      }))

      // Update auth state
      setIsLoggedIn(true)
      setUser({ username, isAdmin })

      // Redirect to dashboard
      navigate("/")
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid credentials. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async (credentialResponse) => {
    setError("")
    setLoading(true)

    try {
      const result = await handleGoogleSuccess(credentialResponse)

      if (result.success) {
        setIsLoggedIn(true)
        navigate("/")
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError("Google authentication failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-header">
        <div className="auth-logo">🛡️ UrbanShield</div>
        <div className="auth-nav">
          <span>Don't have an account? </span>
          <Link to="/register" className="auth-link">Register</Link>
        </div>
      </div>

      <div className="auth-content">
        <div className="auth-card">
          <h1>Welcome Back</h1>
          <p className="auth-subtitle">Enter your credentials to access the dashboard.</p>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Username</label>
              <div className="input-wrapper">
                <FaUser className="input-icon" />
                <input
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <div className="label-row">
                <label>Password</label>
                <a href="#" className="forgot-link">Forgot password?</a>
              </div>
              <div className="input-wrapper">
                <FaLock className="input-icon" />
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <div className="google-btn-wrapper">
            <GoogleLogin
              onSuccess={handleGoogleSignIn}
              onError={() => setError("Google login failed")}
              text="signin"
              size="large"
              width="100%"
            />
          </div>

          <div className="auth-footer">
            <svg className="footer-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 1C6.48 1 2 5.48 2 11s4.48 10 10 10 10-4.48 10-10S17.52 1 12 1zm-2 15l-5-5 1.41-1.41L10 13.17l7.59-7.59L19 7l-9 9z"/>
            </svg>
            Secured by UrbanShield Disaster Protocols
          </div>
        </div>
      </div>

      <footer className="auth-footer-links">
        <a href="#">Privacy Policy</a>
        <a href="#">Terms of Service</a>
        <a href="#">Help Center</a>
      </footer>
    </div>
  )
}
