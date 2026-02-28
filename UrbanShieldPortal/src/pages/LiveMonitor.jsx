import Sidebar from "../components/layout/Sidebar"
import Topbar from "../components/layout/Topbar"
import MapView from "../components/map/MapView"
import DisasterAlerts from "../components/alerts/DisasterAlerts"

export default function LiveMonitor() {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <Topbar />
        <DisasterAlerts />
        <MapView />
      </div>
    </div>
  )
}
