import { useState } from "react"
import Sidebar from "../components/layout/Sidebar"
import Topbar from "../components/layout/Topbar"
import MapView from "../components/map/MapView"
import DisasterAlerts from "../components/alerts/DisasterAlerts"
import ProximityToast from "../components/ProximityToast"
import { useProximityAlerts } from "../hooks/useProximityAlerts"

export default function LiveMonitor() {
  // searchLocation holds the currently selected place from the topbar
  const [searchLocation, setSearchLocation] = useState(null)

  // clear both location and any map overlays
  const clearSearch = () => setSearchLocation(null)

  useProximityAlerts({ enabled: true, radiusKm: 7 })

  return (
    <div className="app-layout">
      <Sidebar hidden={!!searchLocation} />
      <div className="main-area">
        <Topbar onSearchSelect={setSearchLocation} />
        <DisasterAlerts hidden={!!searchLocation} />
        <MapView
          searchLocation={searchLocation}
          clearSearch={clearSearch}
        />
        <ProximityToast />
      </div>
    </div>
  )
}
