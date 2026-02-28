import { useCallback, useEffect, useState } from "react"
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  GeoJSON,
  Polyline,
  Circle,
  useMap,
  useMapEvents
} from "react-leaflet"
import { AnimatePresence, motion } from "framer-motion"
import {
  FaTrafficLight,
  FaExclamationTriangle,
  FaTimesCircle,
  FaRoad,
  FaFireExtinguisher,
  FaHospitalSymbol,
  FaShieldAlt,
  FaChevronDown,
  FaChevronUp,
  FaSpinner,
  FaMapMarkerAlt,
  FaFlagCheckered,
  FaRoute,
} from "react-icons/fa"

import L from "leaflet"
import "leaflet.heat"

import api from "../../api/axios"
import "../../styles/map-controls.css"
// import DisasterLegend from "./DisasterLegend"

const SEARCH_RADIUS_KM = 10
const MotionDiv = motion.div
const MotionButton = motion.button

function ControlButton({
  active,
  loading = false,
  tone = "neutral",
  label,
  onClick,
  icon,
  disabled = false,
}) {
  return (
    <MotionButton
      type="button"
      className={`map-ctrl-btn ${tone} ${active ? "active" : ""}`}
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <span className={`map-ctrl-icon ${loading ? "spinning" : ""}`}>
        {loading ? <FaSpinner /> : icon}
      </span>
      <span>{label}</span>
    </MotionButton>
  )
}

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

function SearchHandler({ location, radiusKm, onInfoChange }) {
  const map = useMap()

  useEffect(() => {
    if (!location) return

    const controller = new AbortController()
    map.setView([location.lat, location.lon], 13)

    api.get("search/info/", {
      params: { lat: location.lat, lon: location.lon, radius: radiusKm },
      signal: controller.signal,
    })
      .then(res => onInfoChange(res.data))
      .catch(err => {
        if (err?.code !== "ERR_CANCELED") {
          console.error("search info error", err)
          onInfoChange(null)
        }
      })

    return () => controller.abort()
  }, [location, map, onInfoChange, radiusKm])

  return null
}

function MapResizeHandler({ trigger }) {
  const map = useMap()

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize()
    }, 0)
    return () => clearTimeout(timer)
  }, [map, trigger])

  return null
}

function FocusDisasterHandler({ disaster }) {
  const map = useMap()

  useEffect(() => {
    if (!disaster) return
    map.flyTo([disaster.latitude, disaster.longitude], 14, { duration: 0.75 })
  }, [map, disaster])

  return null
}

export default function MapView({ searchLocation, clearSearch }) {

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
  const [statsLoading, setStatsLoading] = useState(false)
  const [panelStats, setPanelStats] = useState({
    traffic: 0,
    disasters: 0,
    police: 0,
    fire: 0,
    hospital: 0,
  })

  const [policeFeatures, setPoliceFeatures] = useState([])
  const [fireFeatures, setFireFeatures] = useState([])
  const [hospitalFeatures, setHospitalFeatures] = useState([])
  const [routeGeometry, setRouteGeometry] = useState(null)        // GeoJSON returned from OSRM
  const [routeLoading, setRouteLoading] = useState(false)

  // search handling
  const [searchInfo, setSearchInfo] = useState(null)
  const [selectedDisasterId, setSelectedDisasterId] = useState("")

  // smart-routing state
  const [start, setStart] = useState(null)            // [lat, lon]
  const [end, setEnd] = useState(null)
  const [selecting, setSelecting] = useState(null)    // "start" | "end" | null
  const [routeCoordinates, setRouteCoordinates] = useState([])

  const haversineKm = (lat1, lon1, lat2, lon2) => {
    const toRad = (deg) => (deg * Math.PI) / 180
    const R = 6371
    const dLat = toRad(lat2 - lat1)
    const dLon = toRad(lon2 - lon1)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  const isInSearchRadius = (lat, lon) => {
    if (!searchLocation) return true
    return haversineKm(searchLocation.lat, searchLocation.lon, lat, lon) <= SEARCH_RADIUS_KM
  }

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
    if (!start || !end) {
      alert("Select both start and destination on the map.")
      return
    }
    setRouteLoading(true)
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
        alert('Failed to fetch route. Please try again.')
      })
      .finally(() => setRouteLoading(false))
  }

  const clearSmartRoute = () => {
    setStart(null)
    setEnd(null)
    setRouteCoordinates([])
    setRouteGeometry(null)
    setSelecting(null)
  }

  // 🔵 Fetch traffic from backend (may return realtime TomTom points or
  // simulated data).  The backend exposes `traffic/fetch_real/` for direct
  // TomTom refresh; we can hit it before reading the list.
  const fetchTrafficData = useCallback(({ refreshSource = false } = {}) => {
    setTrafficLoading(true)
    const params = searchLocation
      ? { lat: searchLocation.lat, lon: searchLocation.lon, radius: SEARCH_RADIUS_KM }
      : undefined

    const loadList = () => {
      api.get("traffic/", { params })
        .then(res => {
          const items = Array.isArray(res.data) ? res.data : []
          setTraffic(items)
          setPanelStats(prev => ({ ...prev, traffic: items.length }))
          setShowTraffic(true)
        })
        .catch(err => {
          console.error("Traffic fetch error:", err)
          alert("Failed to fetch traffic data")
        })
        .finally(() => setTrafficLoading(false))
    }

    if (!refreshSource) {
      loadList()
      return
    }

    api.get("traffic/fetch_real/")
      .catch(() => {
        /* ignore; maybe API key missing */
      })
      .finally(loadList)
  }, [searchLocation])

  // 🔴 Fetch disasters from backend (returns real incidents added by server)
  // The backend may periodically call external APIs (USGS/OpenWeather) via its
  // own management commands or when you hit the fetch endpoints.  We simply
  // load whatever is currently stored in the database.
  const fetchDisasterData = useCallback(({ refreshExternal = false } = {}) => {
    setDisasterLoading(true)
    const params = searchLocation
      ? { lat: searchLocation.lat, lon: searchLocation.lon, radius: SEARCH_RADIUS_KM }
      : undefined

    const loadList = () => {
      api.get("disasters/", { params })
        .then(res => {
          const items = Array.isArray(res.data) ? res.data : []
          setDisasters(items)
          setPanelStats(prev => ({ ...prev, disasters: items.length }))
          setShowDisasters(true)
        })
        .catch(err => {
          console.error("Disaster fetch error:", err)
          alert("Failed to fetch disaster data")
        })
        .finally(() => setDisasterLoading(false))
    }

    if (!refreshExternal) {
      loadList()
      return
    }

    // optionally hit server endpoints to refresh from external sources (rate limited)
    Promise.all([
      api.get("disasters/fetch_earthquakes/"),
      api.get("disasters/fetch_weather/")
    ]).catch(() => {
      // ignore errors from refresh; still call main list
    }).finally(loadList)
  }, [searchLocation])

  // 🚓 Police stations geojson (local file)
  const fetchPoliceData = () => {
    setPoliceLoading(true)
    fetch("/uttrakhand_police.geojson")
      .then(res => res.json())
      .then(data => {
        const features = data.features || []
        setPoliceFeatures(features)
        setPanelStats(prev => ({ ...prev, police: features.length }))
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
        const features = data.features || []
        setFireFeatures(features)
        setPanelStats(prev => ({ ...prev, fire: features.length }))
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
        const features = data.features || []
        setHospitalFeatures(features)
        setPanelStats(prev => ({ ...prev, hospital: features.length }))
        setShowHospital(true)
      })
      .catch(err => {
        console.error("Hospital fetch error:", err)
        alert("Failed to load hospital data")
      })
      .finally(() => setHospitalLoading(false))
  }

  const refreshPanelStats = useCallback(() => {
    if (searchLocation) return
    setStatsLoading(true)
    Promise.all([
      api.get("traffic/"),
      api.get("disasters/"),
    ])
      .then(([trafficRes, disasterRes]) => {
        const trafficCount = Array.isArray(trafficRes.data) ? trafficRes.data.length : 0
        const disasterCount = Array.isArray(disasterRes.data) ? disasterRes.data.length : 0
        setPanelStats(prev => ({
          ...prev,
          traffic: trafficCount,
          disasters: disasterCount,
        }))
      })
      .catch((err) => {
        console.error("Panel stats fetch error:", err)
      })
      .finally(() => setStatsLoading(false))
  }, [searchLocation])

  const loadFacilityStats = useCallback(() => {
    Promise.allSettled([
      fetch("/uttrakhand_police.geojson").then(res => res.json()),
      fetch("/uttarakhand_fire.geojson").then(res => res.json()),
      fetch("/uttarakhand_hospitals.geojson").then(res => res.json()),
    ]).then(([policeRes, fireRes, hospitalRes]) => {
      setPanelStats(prev => ({
        ...prev,
        police: policeRes.status === "fulfilled" ? (policeRes.value?.features || []).length : prev.police,
        fire: fireRes.status === "fulfilled" ? (fireRes.value?.features || []).length : prev.fire,
        hospital: hospitalRes.status === "fulfilled" ? (hospitalRes.value?.features || []).length : prev.hospital,
      }))
    })
  }, [])

  // 🗺 Fetch Uttarakhand boundary
  useEffect(() => {
    fetch("/uttarakhand.geojson")
      .then(res => res.json())
      .then(data => setBoundary(data))
  }, [])

  useEffect(() => {
    loadFacilityStats()
  }, [loadFacilityStats])

  useEffect(() => {
    if (searchLocation) return
    refreshPanelStats()
    const interval = setInterval(refreshPanelStats, 2 * 60 * 1000)
    return () => clearInterval(interval)
  }, [searchLocation, refreshPanelStats])

  useEffect(() => {
    if (!searchLocation) {
      setSearchInfo(null)
      setSelectedDisasterId("")
      return
    }
    setSelectedDisasterId("")

    if (showTraffic) fetchTrafficData({ refreshSource: true })
    else setShowTraffic(true)

    if (showDisasters) fetchDisasterData({ refreshExternal: true })
    else setShowDisasters(true)
  }, [searchLocation, showTraffic, showDisasters, fetchTrafficData, fetchDisasterData])

  // 🔄 initial load removed; data will fetch when toggles are clicked
  // (prevents showing zero counts and keeps map clean until requested)

  // 🔥 Filter points to selected search radius and build heatmap data
  const visibleTraffic = traffic.filter(t => isInSearchRadius(t.latitude, t.longitude))
  const trafficPoints = visibleTraffic.map(t => [
    t.latitude,
    t.longitude,
    t.congestion_level / 10   // normalize to 0-1 scale
  ])
  const visibleDisasters = disasters.filter(d => isInSearchRadius(d.latitude, d.longitude))

  // polling side‑effects
  useEffect(() => {
    let interval
    if (showTraffic) {
      // initial load and repeat every 10 minutes
      fetchTrafficData()
      interval = setInterval(() => fetchTrafficData(), 10 * 60 * 1000)
    }
    return () => clearInterval(interval)
  }, [showTraffic, fetchTrafficData])

  useEffect(() => {
    let interval
    if (showDisasters) {
      fetchDisasterData()
      interval = setInterval(() => fetchDisasterData(), 10 * 60 * 1000)
    }
    return () => clearInterval(interval)
  }, [showDisasters, fetchDisasterData])

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

  const getCongestionMeta = (level) => {
    if (level >= 8) return { label: "Severe", color: "#dc2626" }
    if (level >= 6) return { label: "High", color: "#ea580c" }
    if (level >= 4) return { label: "Moderate", color: "#d97706" }
    if (level >= 2) return { label: "Light", color: "#65a30d" }
    return { label: "Low", color: "#16a34a" }
  }

  const averageCongestion = visibleTraffic.length
    ? visibleTraffic.reduce((sum, t) => sum + (Number(t.congestion_level) || 0), 0) / visibleTraffic.length
    : null
  const peakCongestion = visibleTraffic.length
    ? Math.max(...visibleTraffic.map(t => Number(t.congestion_level) || 0))
    : null
  const congestionMeta = getCongestionMeta(averageCongestion || 0)
  const selectedDisaster = visibleDisasters.find(d => String(d.id) === selectedDisasterId)
  const controlStats = [
    { key: "traffic", label: "Traffic", value: panelStats.traffic, unit: "points", active: showTraffic, icon: <FaTrafficLight /> },
    { key: "disasters", label: "Disasters", value: panelStats.disasters, unit: "locations", active: showDisasters, icon: <FaExclamationTriangle /> },
    { key: "police", label: "Police", value: panelStats.police, unit: "stations", active: showPolice, icon: <FaShieldAlt /> },
    { key: "fire", label: "Fire", value: panelStats.fire, unit: "stations", active: showFire, icon: <FaFireExtinguisher /> },
    { key: "hospital", label: "Hospital", value: panelStats.hospital, unit: "centers", active: showHospital, icon: <FaHospitalSymbol /> },
  ]

  return (
    <div className="map-wrapper">

      {/* Search summary card (left side in search mode) */}
      {searchLocation && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 10px 28px rgba(0,0,0,0.14)',
          padding: '16px',
          zIndex: 10001,
          width: '360px',
          maxWidth: 'calc(100vw - 40px)',
          pointerEvents: 'auto',
        }}>
          <h3 style={{ margin: 0, fontWeight: 700, fontSize: '17px', color: '#111827' }}>
            {searchLocation.name}
          </h3>
          <p style={{ margin: '4px 0 10px 0', fontSize: '12px', color: '#6b7280' }}>
            Radius: {SEARCH_RADIUS_KM} km
          </p>

          <div style={{ display: 'grid', gap: '8px', fontSize: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <FaTrafficLight color="#16a34a" />
                Traffic incidents
              </span>
              <b>{visibleTraffic.length || searchInfo?.traffic_count || 0}</b>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <FaTrafficLight color={congestionMeta.color} />
                Congestion level
              </span>
              <b style={{ color: congestionMeta.color }}>
                {averageCongestion === null ? "No data" : `${congestionMeta.label} (${averageCongestion.toFixed(1)}/10)`}
              </b>
            </div>

            {peakCongestion !== null && (
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                Peak congestion: {peakCongestion.toFixed(1)}/10
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <FaExclamationTriangle color="#dc2626" />
                Disaster in area
              </span>
              <b>{visibleDisasters.length > 0 ? `Yes (${visibleDisasters.length})` : "No"}</b>
            </div>
          </div>

          <div style={{ marginTop: '10px' }}>
            <label htmlFor="disaster-select" style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: '#4b5563' }}>
              Disasters dropdown
            </label>
            <select
              id="disaster-select"
              value={selectedDisasterId}
              onChange={(e) => setSelectedDisasterId(e.target.value)}
              disabled={!visibleDisasters.length}
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '13px',
                background: visibleDisasters.length ? '#fff' : '#f3f4f6',
              }}
            >
              <option value="">
                {visibleDisasters.length ? "Select disaster to focus on map" : "No disasters in selected radius"}
              </option>
              {visibleDisasters.map((d) => (
                <option key={d.id} value={String(d.id)}>
                  {d.disaster_type.toUpperCase()} | Severity {d.severity}/10
                </option>
              ))}
            </select>
          </div>

          {selectedDisaster && (
            <div style={{
              marginTop: '8px',
              padding: '8px 10px',
              borderRadius: '8px',
              background: '#f8fafc',
              border: '1px solid #e5e7eb',
              fontSize: '12px',
              color: '#374151',
            }}>
              <div><b>Type:</b> {selectedDisaster.disaster_type.toUpperCase()}</div>
              <div><b>Severity:</b> {selectedDisaster.severity}/10</div>
              <div><b>Status:</b> {selectedDisaster.status?.toUpperCase()}</div>
            </div>
          )}

          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>
              Showing map layers only inside selected radius
            </span>
            <button onClick={clearSearch} className="secondary-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <FaTimesCircle />
              Clear
            </button>
          </div>
        </div>
      )}

      <MapContainer
        center={[30.3165, 78.0322]}
        zoom={7}
        style={{ height: "100%", width: "100%", cursor: 'grab' }}
        scrollWheelZoom={true}
        dragging={true}
      >
        <MapResizeHandler trigger={!!searchLocation} />
        {searchLocation && (
          <SearchHandler
            location={searchLocation}
            radiusKm={SEARCH_RADIUS_KM}
            onInfoChange={setSearchInfo}
          />
        )}
        <FocusDisasterHandler disaster={selectedDisaster} />

        {/* draw circle around search point */}
        {searchLocation && (
          <> 
            <Marker position={[searchLocation.lat, searchLocation.lon]} />
            <Circle
              center={[searchLocation.lat, searchLocation.lon]}
              radius={SEARCH_RADIUS_KM * 1000}
              pathOptions={{ color: '#f59e0b', fillOpacity: 0.1 }}
            />
          </>
        )}

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
        {showDisasters && visibleDisasters.map(d => (
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
        {/* <DisasterLegend showFacilities={showPolice || showFire || showHospital} /> */}

      </MapContainer>

      {/* Control Panel - Hidden when search is active */}
      {!searchLocation && (
      <MotionDiv
        className="map-control-panel"
        initial={{ x: -24, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
      >
        <div className="map-control-title-row">
          <h4>Map Layers</h4>
          <button type="button" className="map-control-refresh" onClick={refreshPanelStats} disabled={statsLoading}>
            <FaSpinner className={statsLoading ? "spinning" : ""} />
            Refresh
          </button>
        </div>

        <div className="map-control-buttons">
          <ControlButton
            active={showTraffic}
            loading={trafficLoading}
            tone="traffic"
            label={trafficLoading ? "Loading Traffic..." : showTraffic ? "Hide Traffic" : "Show Traffic"}
            icon={<FaTrafficLight />}
            onClick={() => {
              if (showTraffic) setShowTraffic(false)
              else fetchTrafficData({ refreshSource: true })
            }}
          />

          <ControlButton
            active={showDisasters}
            loading={disasterLoading}
            tone="disaster"
            label={disasterLoading ? "Loading Disasters..." : showDisasters ? "Hide Disasters" : "Show Disasters"}
            icon={<FaExclamationTriangle />}
            onClick={() => {
              if (showDisasters) setShowDisasters(false)
              else fetchDisasterData({ refreshExternal: true })
            }}
          />

          <ControlButton
            active={showHelpCentersGroup}
            tone="help"
            label="Help Centers"
            icon={showHelpCentersGroup ? <FaChevronUp /> : <FaChevronDown />}
            onClick={() => setShowHelpCentersGroup(prev => !prev)}
          />

          <AnimatePresence initial={false}>
            {showHelpCentersGroup && (
              <MotionDiv
                className="map-control-subgroup-wrap"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="map-control-subgroup">
                  <ControlButton
                    active={showPolice}
                    loading={policeLoading}
                    tone="police"
                    label={policeLoading ? "Loading Police..." : showPolice ? "Hide Police" : "Show Police"}
                    icon={<FaShieldAlt />}
                    onClick={() => {
                      if (showPolice) setShowPolice(false)
                      else fetchPoliceData()
                    }}
                  />

                  <ControlButton
                    active={showFire}
                    loading={fireLoading}
                    tone="fire"
                    label={fireLoading ? "Loading Fire..." : showFire ? "Hide Fire" : "Show Fire"}
                    icon={<FaFireExtinguisher />}
                    onClick={() => {
                      if (showFire) setShowFire(false)
                      else fetchFireData()
                    }}
                  />

                  <ControlButton
                    active={showHospital}
                    loading={hospitalLoading}
                    tone="hospital"
                    label={hospitalLoading ? "Loading Hospitals..." : showHospital ? "Hide Hospital" : "Show Hospital"}
                    icon={<FaHospitalSymbol />}
                    onClick={() => {
                      if (showHospital) setShowHospital(false)
                      else fetchHospitalData()
                    }}
                  />
                </div>
              </MotionDiv>
            )}
          </AnimatePresence>

          <ControlButton
            active={selecting === "start"}
            tone="route-start"
            label="Select Start"
            icon={<FaMapMarkerAlt />}
            onClick={() => setSelecting("start")}
          />

          <ControlButton
            active={selecting === "end"}
            tone="route-end"
            label="Select Destination"
            icon={<FaFlagCheckered />}
            onClick={() => setSelecting("end")}
          />

          <ControlButton
            active={!!(start && end)}
            tone="route-find"
            label={routeLoading ? "Finding..." : "Find Route"}
            icon={<FaRoute />}
            onClick={fetchSmartRoute}
            disabled={!start || !end || routeLoading}
          />

          <ControlButton
            tone="route-clear"
            label="Clear Route"
            icon={<FaTimesCircle />}
            onClick={clearSmartRoute}
          />
        </div>

        <div className="map-control-stats">
          <p className="map-control-stats-title">Status</p>
          {controlStats.map((item) => (
            <p key={item.key} className={`map-control-stat-row ${item.active ? "active" : ""}`}>
              <span className="map-control-stat-label">
                {item.icon}
                {item.label}
              </span>
              <span className="map-control-stat-value">{item.value} {item.unit}</span>
            </p>
          ))}
          {(start || end) && (
            <div className="map-control-coords">
              {start && <span className="pill">Start: {start[0].toFixed(3)}, {start[1].toFixed(3)}</span>}
              {end && <span className="pill">End: {end[0].toFixed(3)}, {end[1].toFixed(3)}</span>}
            </div>
          )}
        </div>

        {routeGeometry && (
          <MotionButton
            type="button"
            className="map-control-clear-geometry"
            onClick={clearRoute}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <FaTimesCircle />
            Clear drawn route
          </MotionButton>
        )}
      </MotionDiv>
      )}

    </div>
  )
}

