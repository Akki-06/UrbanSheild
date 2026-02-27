import { FaMapMarkedAlt, FaExclamationTriangle, FaChartBar } from "react-icons/fa"

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="logo">UrbanShield</div>

      <nav>
        <a className="active"><FaMapMarkedAlt /> Live Monitor</a>
        <a><FaExclamationTriangle /> Incidents</a>
        <a><FaChartBar /> Analytics</a>
      </nav>
    </aside>
  )
}