import Sidebar from "../components/layout/Sidebar"
import Topbar from "../components/layout/Topbar"

export default function Analytics() {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <Topbar />
        <div className="page-content">
          <h1>Analytics</h1>
          <p>Analytics and reporting features will be implemented here.</p>
        </div>
      </div>
    </div>
  )
}
