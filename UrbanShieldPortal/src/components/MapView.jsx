import { useEffect, useState } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import axios from "axios"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import "leaflet.heat"

/* ================= Fix Leaflet Icon Issue ================= */

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
})

/* ================= Heatmap Component ================= */

function Heatmap({ points }) {
  const map = useMap()

  useEffect(() => {
    if (!points.length) return

    const heat = L.heatLayer(points, {
      radius: 25,
      blur: 20,
      maxZoom: 10,
    })

    heat.addTo(map)

    return () => {
      map.removeLayer(heat)
    }
  }, [points, map])

  return null
}

/* ================= Main Map ================= */

export default function MapView({ viewMode = "disaster", heatmap = false }) {
  const [disasters, setDisasters] = useState([])
  const [traffic, setTraffic] = useState([])

  useEffect(() => {
    axios
      .get("http://127.0.0.1:8000/api/disasters/")
      .then(res => setDisasters(res.data))
      .catch(err => console.error("Disaster fetch error:", err))

    axios
      .get("http://127.0.0.1:8000/api/traffic/")
      .then(res => setTraffic(res.data))
      .catch(err => console.error("Traffic fetch error:", err))
  }, [])

  const heatPoints =
    viewMode === "traffic"
      ? traffic.map(t => [t.latitude, t.longitude, t.congestion_level])
      : disasters.map(d => [d.latitude, d.longitude, d.severity])

  return (
    <div className="map-wrapper">
      <MapContainer
        center={[22.9734, 78.6569]}
        zoom={5}
        scrollWheelZoom={true}
        className="map-container"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Disaster Markers */}
        {!heatmap &&
          viewMode === "disaster" &&
          disasters.map(d => (
            <Marker key={`d-${d.id}`} position={[d.latitude, d.longitude]}>
              <Popup>
                <b>Disaster:</b> {d.disaster_type}
                <br />
                <b>Severity:</b> {d.severity}
              </Popup>
            </Marker>
          ))}

        {/* Traffic Markers */}
        {!heatmap &&
          viewMode === "traffic" &&
          traffic.map(t => (
            <Marker key={`t-${t.id}`} position={[t.latitude, t.longitude]}>
              <Popup>
                <b>Congestion:</b> {t.congestion_level}
                <br />
                <b>Blocked:</b> {t.is_blocked ? "Yes" : "No"}
              </Popup>
            </Marker>
          ))}

        {/* Heatmap */}
        {heatmap && <Heatmap points={heatPoints} />}
      </MapContainer>
    </div>
  )
}