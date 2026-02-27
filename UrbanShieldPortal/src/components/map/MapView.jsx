import { useEffect, useState } from "react"
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  GeoJSON,
  useMap
} from "react-leaflet"

import L from "leaflet"
import "leaflet.heat"

import api from "../../api/axios"
import DisasterLegend from "./DisasterLegend"

function HeatmapLayer({ trafficPoints }) {
  const map = useMap()

  useEffect(() => {
    if (!trafficPoints.length) return

    const heat = L.heatLayer(trafficPoints, {
      radius: 30,
      blur: 20,
      maxZoom: 13,
      minOpacity: 0.2,
      max: 1.0,
      gradient: {
        0.0: '#00ff00',    // Green - Low congestion (0-2)
        0.2: '#7fff00',    // Chartreuse - Light traffic (2-3)
        0.4: '#ffff00',    // Yellow - Moderate traffic (3-5)
        0.6: '#ffa500',    // Orange - Heavy traffic (5-7)
        0.8: '#ff6347',    // Tomato - Very heavy traffic (7-8)
        1.0: '#ff0000'     // Red - Severe congestion (8-10)
      }
    })

    heat.addTo(map)

    return () => map.removeLayer(heat)
  }, [trafficPoints, map])

  return null
}

export default function MapView() {

  const [traffic, setTraffic] = useState([])
  const [disasters, setDisasters] = useState([])
  const [boundary, setBoundary] = useState(null)
  // start hidden - data loads only when user clicks the control buttons
  const [showTraffic, setShowTraffic] = useState(false)
  const [showDisasters, setShowDisasters] = useState(false)
  const [showPolice, setShowPolice] = useState(false)
  const [showFire, setShowFire] = useState(false)

  const [trafficLoading, setTrafficLoading] = useState(false)
  const [disasterLoading, setDisasterLoading] = useState(false)
  const [policeLoading, setPoliceLoading] = useState(false)
  const [fireLoading, setFireLoading] = useState(false)

  const [policeFeatures, setPoliceFeatures] = useState([])
  const [fireFeatures, setFireFeatures] = useState([])

  // 🔵 Fetch traffic from backend
  const fetchTrafficData = () => {
    setTrafficLoading(true)
    api.get("traffic/")
      .then(res => {
        setTraffic(res.data)
        setShowTraffic(true)
      })
      .catch(err => {
        console.error("Traffic fetch error:", err)
        alert("Failed to fetch traffic data")
      })
      .finally(() => setTrafficLoading(false))
  }

  // 🔴 Fetch disasters from backend
  const fetchDisasterData = () => {
    setDisasterLoading(true)
    api.get("disasters/")
      .then(res => {
        setDisasters(res.data)
        setShowDisasters(true)
      })
      .catch(err => {
        console.error("Disaster fetch error:", err)
        alert("Failed to fetch disaster data")
      })
      .finally(() => setDisasterLoading(false))
  }

  // 🚓 Police stations geojson (local file)
  const fetchPoliceData = () => {
    setPoliceLoading(true)
    fetch("/uttrakhand_police.geojson")
      .then(res => res.json())
      .then(data => {
        setPoliceFeatures(data.features || [])
        setShowPolice(true)
      })
      .catch(err => {
        console.error("Police fetch error:", err)
        alert("Failed to load police stations")
      })
      .finally(() => setPoliceLoading(false))
  }

  // 🚒 Fire stations geojson (local file)
  const fetchFireData = () => {
    setFireLoading(true)
    fetch("/uttarakhand_fire.geojson")
      .then(res => res.json())
      .then(data => {
        setFireFeatures(data.features || [])
        setShowFire(true)
      })
      .catch(err => {
        console.error("Fire fetch error:", err)
        alert("Failed to load fire stations")
      })
      .finally(() => setFireLoading(false))
  }

  // 🗺 Fetch Uttarakhand boundary
  useEffect(() => {
    fetch("/uttarakhand.geojson")
      .then(res => res.json())
      .then(data => setBoundary(data))
  }, [])

  // 🔄 initial load removed; data will fetch when toggles are clicked
  // (prevents showing zero counts and keeps map clean until requested)

  // 🔥 Convert backend traffic into heatmap points
  const trafficPoints = traffic.map(t => [
    t.latitude,
    t.longitude,
    t.congestion_level / 10   // normalize to 0-1 scale
  ])

  // 🔥 Disaster icon logic with flame symbol and colored backdrop (consistent with reference screenshot)
  const getIcon = (type, severity) => {
    // map each type to a background color and emoji/icon
    const disasterConfig = {
      flood: { bg: '#3b82f6', icon: '🌊' },      // Blue water wave
      fire: { bg: '#ef4444', icon: '🔥' },        // Red flame
      earthquake: { bg: '#8b5cf6', icon: '🌍' },  // Purple earth
      cyclone: { bg: '#06b6d4', icon: '🌀' },    // Cyan cyclone
      heatwave: { bg: '#f59e0b', icon: '☀️' }     // Amber sun
    }

    const config = disasterConfig[type] || { bg: '#6b7280', icon: '❓' }

    // Adjust border color based on severity
    let borderColor = '#e5e7eb'
    if (severity >= 8) borderColor = '#991b1b'   // Dark red border for critical
    else if (severity >= 5) borderColor = '#b45309'  // Dark orange

    return L.divIcon({
      html: `
        <div style="
          background: ${config.bg};
          width: 50px;
          height: 50px;
          border-radius: 50%;
          border: 3px solid ${borderColor};
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          color: black;
          box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        ">
          ${config.icon}
        </div>
      `,
      iconSize: [50, 50],
      className: 'disaster-marker'
    })
  }

  // 🚨 Facility icons for police/fire stations
  const getFacilityIcon = (type) => {
    const cfg = {
      police: { bg: '#2563eb', icon: '🚓' },
      fire: { bg: '#ef4444', icon: '🚒' }
    }[type] || { bg: '#6b7280', icon: '❓' }

    return L.divIcon({
      html: `
        <div style="
          background: ${cfg.bg};
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          color: black;
          box-shadow: 0 2px 4px rgba(0,0,0,0.25);
        ">
          ${cfg.icon}
        </div>
      `,
      iconSize: [30, 30],
      className: 'facility-marker'
    })
  }

  // 🎨 Format date for popup
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString()
  }

  // 🎯 Get severity badge color
  const getSeverityBadgeColor = (severity) => {
    if (severity >= 8) return '#dc2626'
    if (severity >= 5) return '#f97316'
    return '#3b82f6'
  }

  return (
    <div className="map-wrapper">

      <MapContainer
        center={[30.3165, 78.0322]}
        zoom={7}
        style={{ height: "100%", width: "100%" }}
      >

        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Border */}
        {boundary && (
          <GeoJSON
            data={boundary}
            style={{
              color: "#2563eb",
              weight: 3,
              fillOpacity: 0.05,
            }}
          />
        )}

        {/* Traffic Heatmap */}
        {showTraffic && <HeatmapLayer trafficPoints={trafficPoints} />}

        {/* Disaster Pins */}
        {showDisasters && disasters.map(d => (
          <Marker
            key={d.id}
            position={[d.latitude, d.longitude]}
            icon={getIcon(d.disaster_type, d.severity)}
          >
            <Popup>
              <div style={{ minWidth: '200px', fontFamily: 'system-ui' }}>
                <h3 style={{ margin: '0 0 8px 0', color: '#1f2937' }}>
                  {d.disaster_type.charAt(0).toUpperCase() + d.disaster_type.slice(1)}
                </h3>
                
                <div style={{ marginBottom: '8px' }}>
                  <span style={{
                    display: 'inline-block',
                    backgroundColor: getSeverityBadgeColor(d.severity),
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    Severity: {d.severity}/10
                  </span>
                  <span style={{
                    display: 'inline-block',
                    marginLeft: '8px',
                    backgroundColor: '#e5e7eb',
                    color: '#374151',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    {d.status.toUpperCase()}
                  </span>
                </div>

                <table style={{ fontSize: '12px', width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '4px 0', fontWeight: '600', color: '#6b7280' }}>Coordinates:</td>
                      <td style={{ padding: '4px 0', textAlign: 'right' }}>{d.latitude.toFixed(4)}, {d.longitude.toFixed(4)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px 0', fontWeight: '600', color: '#6b7280' }}>Confidence:</td>
                      <td style={{ padding: '4px 0', textAlign: 'right' }}>{(d.confidence_score * 100).toFixed(1)}%</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px 0', fontWeight: '600', color: '#6b7280' }}>Reported:</td>
                      <td style={{ padding: '4px 0', textAlign: 'right', fontSize: '11px' }}>{formatDate(d.created_at)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Police/Fire Stations */}
        {showPolice && policeFeatures.map(f => {
          const [lon, lat] = f.geometry.coordinates
          return (
            <Marker
              key={f.id}
              position={[lat, lon]}
              icon={getFacilityIcon('police')}
            >
              <Popup>{f.properties.name || 'Police Station'}</Popup>
            </Marker>
          )
        })}
        {showFire && fireFeatures.map(f => {
          const [lon, lat] = f.geometry.coordinates
          return (
            <Marker
              key={f.id}
              position={[lat, lon]}
              icon={getFacilityIcon('fire')}
            >
              <Popup>{f.properties.name || 'Fire Station'}</Popup>
            </Marker>
          )
        })}

        {/* Disaster Legend */}
        <DisasterLegend showFacilities={showPolice || showFire} />

      </MapContainer>

      {/* Control Panel */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        backgroundColor: 'white',
        padding: '12px',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        zIndex: 999,
        fontFamily: 'system-ui'
      }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
          Map Layers
        </h4>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          
          {/* Traffic Toggle Button */}
          <button
            onClick={() => {
              if (showTraffic) {
                setShowTraffic(false)
              } else {
                fetchTrafficData()
              }
            }}
            disabled={trafficLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              backgroundColor: showTraffic ? '#3b82f6' : '#e5e7eb',
              color: showTraffic ? 'white' : '#374151',
              border: 'none',
              borderRadius: '6px',
              cursor: trafficLoading ? 'not-allowed' : 'pointer',
              fontWeight: '500',
              fontSize: '13px',
              transition: 'all 0.2s',
              opacity: trafficLoading ? 0.7 : 1
            }}
            onMouseEnter={(e) => {
              if (!trafficLoading) {
                e.target.style.transform = 'translateY(-2px)'
                e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)'
              }
            }}
            onMouseLeave={(e) => {
              if (!trafficLoading) {
                e.target.style.transform = 'translateY(0)'
                e.target.style.boxShadow = 'none'
              }
            }}
          >
            <span>{trafficLoading ? '⏳' : showTraffic ? '✓' : '○'}</span>
            <span>{trafficLoading ? 'Loading...' : showTraffic ? 'Hide Traffic' : 'Show Traffic'}</span>
          </button>

          {/* Disaster Toggle Button */}
          <button
            onClick={() => {
              if (showDisasters) {
                setShowDisasters(false)
              } else {
                fetchDisasterData()
              }
            }}
            disabled={disasterLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              backgroundColor: showDisasters ? '#ef4444' : '#e5e7eb',
              color: showDisasters ? 'white' : '#374151',
              border: 'none',
              borderRadius: '6px',
              cursor: disasterLoading ? 'not-allowed' : 'pointer',
              fontWeight: '500',
              fontSize: '13px',
              transition: 'all 0.2s',
              opacity: disasterLoading ? 0.7 : 1
            }}
            onMouseEnter={(e) => {
              if (!disasterLoading) {
                e.target.style.transform = 'translateY(-2px)'
                e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)'
              }
            }}
            onMouseLeave={(e) => {
              if (!disasterLoading) {
                e.target.style.transform = 'translateY(0)'
                e.target.style.boxShadow = 'none'
              }
            }}
          >
            <span>{disasterLoading ? '⏳' : showDisasters ? '✓' : '○'}</span>
            <span>{disasterLoading ? 'Loading...' : showDisasters ? 'Hide Disasters' : 'Show Disasters'}</span>
          </button>

        </div>

        {/* Legend Shortcut */}
        <div style={{
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: '1px solid #e5e7eb',
          fontSize: '11px',
          color: '#6b7280'
        }}>
          <p style={{ margin: '0 0 4px 0', fontWeight: '600' }}>Status:</p>
          <p style={{ margin: '2px 0' }}>🔵 Traffic: {showTraffic ? traffic.length + ' points' : '\u2014'}</p>
          <p style={{ margin: '2px 0' }}>🔴 Disasters: {showDisasters ? disasters.length + ' locations' : '\u2014'}</p>
        </div>
      </div>

    </div>
  )
}