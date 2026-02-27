import { Link } from "react-router-dom"

export default function Login() {
  return (
    <div className="auth-wrapper">
      <div className="card auth-card">
        <h2 className="auth-title">Login</h2>

        <input className="form-input" placeholder="Username" />
        <input className="form-input" type="password" placeholder="Password" />

        <button className="btn btn-primary auth-btn">Login</button>

        <p className="auth-footer">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </div>
  )
}