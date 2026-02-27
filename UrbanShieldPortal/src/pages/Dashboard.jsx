import Sidebar from "../components/layout/Sidebar"
import Topbar from "../components/layout/Topbar"
import MapView from "../components/map/MapView"

export default function Dashboard() {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <Topbar />
        <MapView />
      </div>
    </div>
  )
}