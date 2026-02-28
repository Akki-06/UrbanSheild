import { useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { FaSignOutAlt } from "react-icons/fa"

export default function Topbar() {
  const navigate = useNavigate()
  const { isLoggedIn, user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  return (
    <div className="topbar">
      <input 
        type="text" 
        placeholder="Search locations, incidents or resources..." 
      />
      {isLoggedIn ? (
        <div className="auth-section">
          <span className="user-info">{user?.username || user?.email || "User"}</span>
          <button className="logout-btn" onClick={handleLogout}>
            <FaSignOutAlt /> Log Out
          </button>
        </div>
      ) : (
        <button className="primary-btn" onClick={() => navigate("/login")}>
          Log In
        </button>
      )}
    </div>
  )
}