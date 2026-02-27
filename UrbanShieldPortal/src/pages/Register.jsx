import { Link } from "react-router-dom"

export default function Register() {
  return (
    <div className="auth-wrapper">
      <div className="card auth-card">
        <h2 className="auth-title">Create Account</h2>

        <input className="form-input" placeholder="Username" />
        <input className="form-input" placeholder="Email" />
        <input className="form-input" type="password" placeholder="Password" />

        <button className="btn btn-primary auth-btn">Register</button>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  )
}