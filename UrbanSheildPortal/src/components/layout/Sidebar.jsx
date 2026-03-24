import { useNavigate, useLocation } from "react-router-dom"
import { FaMapMarkedAlt, FaExclamationTriangle, FaChartBar } from "react-icons/fa"
import { useAuth } from "../../context/AuthContext"

export default function Sidebar({ hidden = false }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  const navItems = [
    { path: "/map", icon: FaMapMarkedAlt, label: "Live Monitor" },
    { path: "/incidents", icon: FaExclamationTriangle, label: "Incidents" },
    { path: "/analytics", icon: FaChartBar, label: "Analytics" }
  ]

  if (user?.isAdmin) {
    navItems.push({ path: "/alerts-sent", icon: FaExclamationTriangle, label: "Alerts Sent" })
  }

  if (hidden) return null

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

      <div className="sidebar-user">
        <div className="sidebar-user-name">
          {user?.username || "Guest"}
          {user?.isAdmin ? " (admin)" : ""}
        </div>
      </div>
    </aside>
  )
}
