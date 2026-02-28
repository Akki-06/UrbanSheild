import { useNavigate, useLocation } from "react-router-dom"
import { FaMapMarkedAlt, FaExclamationTriangle, FaChartBar, FaSignOutAlt } from "react-icons/fa"
import { useAuth } from "../../context/AuthContext"

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout } = useAuth()

  const navItems = [
    { path: "/", icon: FaMapMarkedAlt, label: "Live Monitor" },
    { path: "/incidents", icon: FaExclamationTriangle, label: "Incidents" },
    { path: "/analytics", icon: FaChartBar, label: "Analytics" }
  ]

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  return (
    <aside className="sidebar">
      <div className="logo">UrbanShield</div>

      <nav>
        {navItems.map(item => (
          <a
            key={item.path}
            className={`nav-item ${location.pathname === item.path ? "active" : ""}`}
            onClick={() => navigate(item.path)}
            style={{ cursor: "pointer" }}
          >
            <item.icon /> {item.label}
          </a>
        ))}
      </nav>
    </aside>
  )
}