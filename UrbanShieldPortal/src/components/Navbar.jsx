import { Link } from "react-router-dom"

export default function Navbar() {
  return (
    <div className="navbar">
      <div className="navbar-logo">UrbanShield</div>

      <div className="navbar-links">
        <Link to="/">Home</Link>
        <Link to="/login" className="navbar-btn">Login</Link>
      </div>
    </div>
  )
}