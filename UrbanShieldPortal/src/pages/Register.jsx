import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { FaLock, FaUser, FaEnvelope } from "react-icons/fa"
import { GoogleLogin } from "@react-oauth/google"
import { useAuth } from "../context/AuthContext"
import { handleGoogleSuccess } from "../api/googleAuth"
import api from "../api/axios"
import "../styles/auth.css"

export default function Register() {
  const navigate = useNavigate()
  const { setIsLoggedIn } = useAuth()
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "user",
    admin_key: ""
  })
  const [showAdminKey, setShowAdminKey] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [agreed, setAgreed] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (!agreed) {
      setError("Please agree to Terms of Service and Privacy Policy")
      return
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    setLoading(true)

    try {
      const payload = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role: formData.role
      }

      if (formData.role === "regional_admin") {
        payload.admin_key = formData.admin_key
      }

      const response = await api.post("accounts/register/", payload)

      // Auto login after registration
      const tokenResponse = await api.post("token/", {
        username: formData.username,
        password: formData.password
      })

      localStorage.setItem("access_token", tokenResponse.data.access)
      localStorage.setItem("refresh_token", tokenResponse.data.refresh)

      // Update auth state
      setIsLoggedIn(true)

      navigate("/")
    } catch (err) {
      const errorMsg = err.response?.data
      if (typeof errorMsg === "object") {
        const messages = Object.values(errorMsg).flat().join(", ")
        setError(messages)
      } else {
        setError(errorMsg || "Registration failed. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignUp = async (credentialResponse) => {
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
          <span>Already have an account? </span>
          <Link to="/login" className="auth-link">Sign In</Link>
        </div>
      </div>

      <div className="auth-content">
        {/* marketing/hero column */}
        <div className="auth-hero">
          <h2>Next‑Gen Disaster Response & Traffic Control</h2>
          <p>Join the integrated network trusted by 40+ municipalities across India. Coordinate emergency services and traffic flow in real‑time.</p>
          {/* you could insert an illustration or map preview here */}
        </div>
        <div className="auth-card register-card">
          <h1>Create Account</h1>
          <p className="auth-subtitle">Enter your details to access the UrbanShield dashboard.</p>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Username</label>
              <div className="input-wrapper">
                <FaUser className="input-icon" />
                <input
                  type="text"
                  name="username"
                  placeholder="e.g. joe_admin"
                  value={formData.username}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <div className="input-wrapper">
                <FaEnvelope className="input-icon" />
                <input
                  type="email"
                  name="email"
                  placeholder="name@department.gov.in"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="input-wrapper">
                <FaLock className="input-icon" />
                <input
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>
              <small className="help-text">Must be at least 8 characters containing a number.</small>
            </div>

            <div className="role-selector">
              <label>Account Type</label>
              <div className="role-options">
                <button
                  type="button"
                  className={`role-btn ${formData.role === "user" ? "active" : ""}`}
                  onClick={() => {
                    setFormData(prev => ({ ...prev, role: "user" }))
                    setShowAdminKey(false)
                  }}
                >
                  <div className="role-title">Standard User</div>
                  <div className="role-desc">View reports & incidents</div>
                </button>
                <button
                  type="button"
                  className={`role-btn ${formData.role === "regional_admin" ? "active" : ""}`}
                  onClick={() => {
                    setFormData(prev => ({ ...prev, role: "regional_admin" }))
                    setShowAdminKey(true)
                  }}
                >
                  <div className="role-title">Regional Admin</div>
                  <div className="role-desc">Manage alerts & traffic</div>
                </button>
              </div>
            </div>

            {showAdminKey && (
              <div className="form-group">
                <label>Admin Verification Key</label>
                <div className="input-wrapper">
                  <FaLock className="input-icon" />
                  <input
                    type="password"
                    name="admin_key"
                    placeholder="xxxx xxxx xxxx"
                    value={formData.admin_key}
                    onChange={handleChange}
                  />
                </div>
                <small className="help-text">Required for Admin registration. Contact central command if lost.</small>
              </div>
            )}

            <div className="checkbox-group">
              <input
                type="checkbox"
                id="terms"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <label htmlFor="terms">
                I agree to the <Link to="#" className="link-text">Terms of Service</Link> and <Link to="#" className="link-text">Privacy Policy</Link>
              </label>
            </div>

            <button 
              type="submit" 
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading ? "Creating Account..." : "Complete Registration"}
            </button>
          </form>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <div className="google-btn-wrapper">
            <GoogleLogin
              onSuccess={handleGoogleSignUp}
              onError={() => setError("Google signup failed")}
              text="signup"
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
        <a href="#">Privacy</a>
        <a href="#">Terms</a>
        <a href="#">Help</a>
      </footer>
    </div>
  )
}