import { useEffect, useState } from "react"
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  GeoJSON,
  Polyline,
  useMap,
  useMapEvents
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
  const [showHospital, setShowHospital] = useState(false)
  const [showHelpCentersGroup, setShowHelpCentersGroup] = useState(false)

  const [trafficLoading, setTrafficLoading] = useState(false)
  const [disasterLoading, setDisasterLoading] = useState(false)
  const [policeLoading, setPoliceLoading] = useState(false)
  const [fireLoading, setFireLoading] = useState(false)
  const [hospitalLoading, setHospitalLoading] = useState(false)

  const [policeFeatures, setPoliceFeatures] = useState([])
  const [fireFeatures, setFireFeatures] = useState([])
  const [hospitalFeatures, setHospitalFeatures] = useState([])
  const [routeGeometry, setRouteGeometry] = useState(null)        // GeoJSON returned from OSRM

  // smart-routing state
  const [start, setStart] = useState(null)            // [lat, lon]
  const [end, setEnd] = useState(null)
  const [selecting, setSelecting] = useState(null)    // "start" | "end" | null
  const [routeCoordinates, setRouteCoordinates] = useState([])

  const distance = (a, b) => {
    // simple euclidean on lat/lon (good enough for nearby points)
    const dLat = a[0] - b[0]
    const dLon = a[1] - b[1]
    return Math.sqrt(dLat * dLat + dLon * dLon)
  }

  // marker icons for routing endpoints
  const getPointIcon = (type) => {
    const cfg = {
      start: { bg: '#10b981', icon: '🟢' },
      end: { bg: '#ef4444', icon: '🔴' }
    }[type] || { bg: '#6b7280', icon: '⚪' }
    return L.divIcon({
      html: `
        <div style="
          background: ${cfg.bg};
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          color: white;
        ">
          ${cfg.icon}
        </div>
      `,
      iconSize: [24, 24],
      className: 'point-marker'
    })
  }

  // component to handle map clicks while selecting
  function MapClickHandler() {
    useMapEvents({
      click(e) {
        if (selecting === 'start') {
          setStart([e.latlng.lat, e.latlng.lng])
          setSelecting(null)
        } else if (selecting === 'end') {
          setEnd([e.latlng.lat, e.latlng.lng])
          setSelecting(null)
        }
      }
    })
    return null
  }

  // smart route fetching - now uses backend Dijkstra algorithm that considers traffic & disasters
  const fetchSmartRoute = () => {
    if (!start || !end) return
    api.get('route/smart_route/', {
      params: {
        start_lat: start[0],
        start_lon: start[1],
        end_lat: end[0],
        end_lon: end[1]
      }
    })
      .then(res => {
        // Backend returns geojson_route (GeoJSON geometry) and route_nodes (array of [lat,lon])
        const geometry = res.data?.geojson_route
        const nodes = res.data?.route_nodes || []
        
        if (geometry && geometry.coordinates) {
          // Convert GeoJSON coordinates [lon,lat] to Leaflet format [lat,lon]
          const leafletCoords = geometry.coordinates.map(coord => [coord[1], coord[0]])
          setRouteCoordinates(leafletCoords)
        } else if (nodes.length > 0) {
          // Fallback to route_nodes if geometry is not available
          setRouteCoordinates(nodes)
        } else {
          alert('No route found')
        }
      })
      .catch(err => {
        console.error('smart route error', err)
        alert('Failed to fetch route')
      })
  }

  const clearSmartRoute = () => {
    setStart(null)
    setEnd(null)
    setRouteCoordinates([])
    setSelecting(null)
  }

  // 🔵 Fetch traffic from backend (may return realtime TomTom points or
  // simulated data).  The backend exposes `traffic/fetch_real/` for direct
  // TomTom refresh; we can hit it before reading the list.
  const fetchTrafficData = () => {
    setTrafficLoading(true)
    api.get("traffic/fetch_real/")
      .catch(() => {
        /* ignore; maybe API key missing */
      })
      .finally(() => {
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
      })
  }

  // 🔴 Fetch disasters from backend (returns real incidents added by server)
  // The backend may periodically call external APIs (USGS/OpenWeather) via its
  // own management commands or when you hit the fetch endpoints.  We simply
  // load whatever is currently stored in the database.
  const fetchDisasterData = () => {
    setDisasterLoading(true)
    // optionally hit server endpoints to refresh from external sources (rate limited)
    Promise.all([
      api.get("disasters/fetch_earthquakes/"),
      api.get("disasters/fetch_weather/")
    ]).catch(() => {
      // ignore errors from refresh; still call main list
    }).finally(() => {
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
    })
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

  // 🏥 Hospital locations geojson (local public file)
  const fetchHospitalData = () => {
    setHospitalLoading(true)
    fetch("/uttarakhand_hospitals.geojson")
      .then(res => res.json())
      .then(data => {
        setHospitalFeatures(data.features || [])
        setShowHospital(true)
      })
      .catch(err => {
        console.error("Hospital fetch error:", err)
        alert("Failed to load hospital data")
      })
      .finally(() => setHospitalLoading(false))
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

  // polling side‑effects
  useEffect(() => {
    let interval
    if (showTraffic) {
      // initial load and repeat every 10 minutes
      fetchTrafficData()
      interval = setInterval(fetchTrafficData, 10 * 60 * 1000)
    }
    return () => clearInterval(interval)
  }, [showTraffic])

  useEffect(() => {
    let interval
    if (showDisasters) {
      fetchDisasterData()
      interval = setInterval(fetchDisasterData, 10 * 60 * 1000)
    }
    return () => clearInterval(interval)
  }, [showDisasters])

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
      fire: { bg: '#ef4444', icon: '🚒' },
      hospital: { bg: '#10b981', icon: '🏥' }
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

  // 🧭 find nearest police/fire station and request route via OSRM
  const handleRoute = (disaster) => {
    console.log('route button clicked for', disaster)
    const start = [disaster.latitude, disaster.longitude]
    let nearest = null
    let minDist = Infinity
    const facilities = [
      ...policeFeatures.map(f => ({ ...f, _type: 'police' })),
      ...fireFeatures.map(f => ({ ...f, _type: 'fire' }))
    ]
    console.log('available facilities', facilities.length)
    facilities.forEach(f => {
      const [lon, lat] = f.geometry.coordinates
      const d = distance(start, [lat, lon])
      if (d < minDist) {
        minDist = d
        nearest = { coord: [lat, lon], type: f._type, name: f.properties.name }
      }
    })
    if (!nearest) {
      alert('No police or fire stations are currently loaded')
      return
    }

    console.log('nearest facility', nearest)
    const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${nearest.coord[1]},${nearest.coord[0]}?overview=full&geometries=geojson`
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.routes && data.routes.length) {
          setRouteGeometry(data.routes[0].geometry)
        } else {
          console.warn('no routes returned', data)
        }
      })
      .catch(err => console.error('OSRM error', err))
  }

  const clearRoute = () => setRouteGeometry(null)

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
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()       // prevent Leaflet from closing popup
                    handleRoute(d)
                  }}
                  style={{
                    marginBottom: '8px',
                    padding: '6px 10px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Find nearest help center
                </button>
                
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

        {/* Smart-routing click handler (always mounted) */}
        <MapClickHandler />

        {/* start/end markers */}
        {start && (
          <Marker position={start} icon={getPointIcon('start')} />
        )}
        {end && (
          <Marker position={end} icon={getPointIcon('end')} />
        )}

        {/* route drawn from backend */}
        {routeCoordinates.length > 0 && (
          <Polyline positions={routeCoordinates} color="blue" weight={5} />
        )}

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
        {showHospital && hospitalFeatures.map(f => {
          const [lon, lat] = f.geometry.coordinates
          return (
            <Marker
              key={f.id}
              position={[lat, lon]}
              icon={getFacilityIcon('hospital')}
            >
              <Popup>
                <div style={{ fontSize: '13px' }}>
                  <strong>{f.properties.name || 'Hospital'}</strong>
                  {f.properties.phone && (
                    <div>📞 {f.properties.phone}</div>
                  )}
                </div>
              </Popup>
            </Marker>
          )
        })}

        {/* Route polyline (if generated) */}
        {routeGeometry && (
          <GeoJSON
            data={routeGeometry}
            style={{ color: '#10b981', weight: 4 }}
          />
        )}

        {/* Disaster Legend */}
        <DisasterLegend showFacilities={showPolice || showFire || showHospital} />

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

          {/* Help Centers group outer toggle */}
          <button
            onClick={() => setShowHelpCentersGroup(prev => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              backgroundColor: showHelpCentersGroup ? '#10b981' : '#e5e7eb',
              color: showHelpCentersGroup ? 'white' : '#374151',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '13px',
              transition: 'all 0.2s'
            }}
          >
            <span>🩺</span>
            <span>Help Centers</span>
          </button>

          {showHelpCentersGroup && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginLeft: '12px' }}>
              {/* Police Toggle Button */}
              <button
                onClick={() => {
                  if (showPolice) {
                    setShowPolice(false)
                  } else {
                    fetchPoliceData()
                  }
                }}
                disabled={policeLoading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  backgroundColor: showPolice ? '#2563eb' : '#e5e7eb',
                  color: showPolice ? 'white' : '#374151',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: policeLoading ? 'not-allowed' : 'pointer',
                  fontWeight: '500',
                  fontSize: '13px',
                  transition: 'all 0.2s',
                  opacity: policeLoading ? 0.7 : 1
                }}
                onMouseEnter={(e) => {
                  if (!policeLoading) {
                    e.target.style.transform = 'translateY(-2px)'
                    e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!policeLoading) {
                    e.target.style.transform = 'translateY(0)'
                    e.target.style.boxShadow = 'none'
                  }
                }}
              >
                <span>{policeLoading ? '⏳' : showPolice ? '✓' : '○'}</span>
                <span>{policeLoading ? 'Loading...' : showPolice ? 'Hide Police' : 'Show Police'}</span>
              </button>

              {/* Fire Station Toggle Button */}
              <button
                onClick={() => {
                  if (showFire) {
                    setShowFire(false)
                  } else {
                    fetchFireData()
                  }
                }}
                disabled={fireLoading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  backgroundColor: showFire ? '#ef4444' : '#e5e7eb',
                  color: showFire ? 'white' : '#374151',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: fireLoading ? 'not-allowed' : 'pointer',
                  fontWeight: '500',
                  fontSize: '13px',
                  transition: 'all 0.2s',
                  opacity: fireLoading ? 0.7 : 1
                }}
                onMouseEnter={(e) => {
                  if (!fireLoading) {
                    e.target.style.transform = 'translateY(-2px)'
                    e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!fireLoading) {
                    e.target.style.transform = 'translateY(0)'
                    e.target.style.boxShadow = 'none'
                  }
                }}
              >
                <span>{fireLoading ? '⏳' : showFire ? '✓' : '○'}</span>
                <span>{fireLoading ? 'Loading...' : showFire ? 'Hide Fire' : 'Show Fire'}</span>
              </button>

              {/* Hospital Toggle Button */}
              <button
                onClick={() => {
                  if (showHospital) {
                    setShowHospital(false)
                  } else {
                    fetchHospitalData()
                  }
                }}
                disabled={hospitalLoading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  backgroundColor: showHospital ? '#10b981' : '#e5e7eb',
                  color: showHospital ? 'white' : '#374151',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: hospitalLoading ? 'not-allowed' : 'pointer',
                  fontWeight: '500',
                  fontSize: '13px',
                  transition: 'all 0.2s',
                  opacity: hospitalLoading ? 0.7 : 1
                }}
                onMouseEnter={(e) => {
                  if (!hospitalLoading) {
                    e.target.style.transform = 'translateY(-2px)'
                    e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!hospitalLoading) {
                    e.target.style.transform = 'translateY(0)'
                    e.target.style.boxShadow = 'none'
                  }
                }}
              >
                <span>{hospitalLoading ? '⏳' : showHospital ? '✓' : '○'}</span>
                <span>{hospitalLoading ? 'Loading...' : showHospital ? 'Hide Hospital' : 'Show Hospital'}</span>
              </button>
            </div>
          )}

          {/* Routing controls */}
          <button
            onClick={() => setSelecting('start')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              backgroundColor: selecting === 'start' ? '#10b981' : '#e5e7eb',
              color: selecting === 'start' ? 'white' : '#374151',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '13px',
              transition: 'all 0.2s'
            }}
          >
            Select Start
          </button>

          <button
            onClick={() => setSelecting('end')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              backgroundColor: selecting === 'end' ? '#ef4444' : '#e5e7eb',
              color: selecting === 'end' ? 'white' : '#374151',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '13px',
              transition: 'all 0.2s'
            }}
          >
            Select Destination
          </button>

          <button
            onClick={fetchSmartRoute}
            disabled={!start || !end}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: !start || !end ? 'not-allowed' : 'pointer',
              fontWeight: '500',
              fontSize: '13px',
              transition: 'all 0.2s'
            }}
          >
            Find Route
          </button>

          <button
            onClick={clearSmartRoute}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              backgroundColor: '#f87171',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '13px',
              transition: 'all 0.2s'
            }}
          >
            Clear Route
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
          <p style={{ margin: '2px 0' }}>🚓 Police: {showPolice ? policeFeatures.length + ' stations' : '\u2014'}</p>
          <p style={{ margin: '2px 0' }}>🚒 Fire: {showFire ? fireFeatures.length + ' stations' : '\u2014'}</p>
          <p style={{ margin: '2px 0' }}>🏥 Hospital: {showHospital ? hospitalFeatures.length + ' locations' : '\u2014'}</p>
        </div>

        {/* route control */}
        {routeGeometry && (
          <button
            onClick={clearRoute}
            style={{
              marginTop: '8px',
              padding: '6px 10px',
              backgroundColor: '#f87171',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Clear route
          </button>
        )}
      </div>

    </div>
  )
}