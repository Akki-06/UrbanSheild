import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { FaBullhorn, FaClock, FaArrowRight } from "react-icons/fa"

import api from "../api/axios"
import Sidebar from "../components/layout/Sidebar"
import Topbar from "../components/layout/Topbar"
import "../styles/incidents.css"

const POLL_INTERVAL_MS = 5 * 60 * 1000

const FALLBACK_INCIDENTS = [
  {
    title: "Flash Flood Warning issued near Rishikesh",
    description: "Cloudburst-triggered surge along the Ganga. Avoid low-lying areas; emergency teams on standby.",
    url: "https://example.com/flood-warning",
    image: "https://images.unsplash.com/photo-1502303756784-6f2119abf91f?auto=format&fit=crop&w=900&q=80",
    published_at: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
    incident_type: "disaster",
  },
  {
    title: "Heavy congestion on NH34 due to landslide clearance",
    description: "Border Roads crews are clearing debris; expect 45+ minute delays. Use alternate routes where possible.",
    url: "https://example.com/traffic-delay",
    image: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=900&q=80",
    published_at: new Date(Date.now() - 68 * 60 * 1000).toISOString(),
    incident_type: "traffic",
  },
  {
    title: "School bus minor accident near Dehradun IT Park",
    description: "No fatalities reported; students being shifted to nearby clinic for evaluation. Drive cautiously.",
    url: "https://example.com/dehradun-accident",
    image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
    published_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    incident_type: "accident",
  },
]

const getSeverity = (incident) => {
  const text = `${incident.title || ""} ${incident.description || ""}`.toLowerCase()
  const incidentType = (incident.incident_type || "").toLowerCase()

  if (
    incidentType === "disaster" ||
    ["flash flood", "cloudburst", "landslide", "earthquake", "fatal"].some((k) => text.includes(k))
  ) {
    return "critical"
  }
  if (
    incidentType === "traffic" ||
    incidentType === "accident" ||
    ["traffic", "congestion", "accident", "collision", "crash", "jam"].some((k) => text.includes(k))
  ) {
    return "traffic"
  }
  return "warning"
}

const getTimeAgo = (publishedAt) => {
  const published = new Date(publishedAt)
  const diffMinutes = Math.max(0, Math.floor((Date.now() - published.getTime()) / 60000))

  if (diffMinutes < 1) return "just now"
  if (diffMinutes < 60) return `${diffMinutes} min ago`
  const hours = Math.floor(diffMinutes / 60)
  return `${hours} hr ago`
}

const badgeText = {
  critical: "CRITICAL",
  traffic: "TRAFFIC",
  warning: "WARNING",
}

export default function Incidents() {
  const navigate = useNavigate()
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [fallback, setFallback] = useState(false)

  const fetchIncidents = useCallback(async () => {
    try {
      setLoading(true)
      setFallback(false)
      const response = await api.get("news/incidents/", { params: { limit: 12 } })
      const data = Array.isArray(response.data) ? response.data : []
      if (!data.length) {
        setIncidents(FALLBACK_INCIDENTS)
        setFallback(true)
        setError("")
      } else {
        setIncidents(data)
        setError("")
      }
    } catch (err) {
      console.error("Incidents fetch failed:", err)
      setIncidents(FALLBACK_INCIDENTS)
      setFallback(true)
      setError("Live feed unavailable. Showing preset alerts.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchIncidents()
    const interval = setInterval(fetchIncidents, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fetchIncidents])

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <Topbar />
        <div className="page-content incidents-page">
          <section className="alerts-panel">
            <div className="alerts-panel-header">
              <div className="alerts-title">
                <FaBullhorn className="alerts-title-icon" />
                <h1>Nearby Alerts</h1>
              </div>
              <button className="view-map-link" onClick={() => navigate("/")}>
                View Map
              </button>
            </div>

            <p className="alerts-subtitle">
              Real-time Uttarakhand incidents from the last 24 hours (traffic, disasters, accidents).
            </p>

            {loading && (
              <div className="alerts-message">
                <div className="spinner" />
                <span>Refreshing alerts...</span>
              </div>
            )}

            {!loading && !!error && (
              <div className="alerts-message error">
                <span>{error}</span>
                <button onClick={fetchIncidents}>Retry</button>
              </div>
            )}

            {!loading && incidents.length > 0 && (
              <div className="alerts-list">
                {fallback && (
                  <div className="alerts-message info" style={{ marginBottom: 12 }}>
                    <span>Showing curated Uttarakhand alerts while we refresh live data.</span>
                  </div>
                )}
                {incidents.map((incident, index) => {
                  const severity = getSeverity(incident)
                  return (
                    <article className="alert-card" key={`${incident.url}-${index}`}>
                      <div className="alert-media">
                        {incident.image ? (
                          <img src={incident.image} alt={incident.title} />
                        ) : (
                          <div className="alert-media-fallback">UTK</div>
                        )}
                        <span className={`alert-badge ${severity}`}>{badgeText[severity]}</span>
                      </div>

                      <div className="alert-body">
                        <div className="alert-top-row">
                          <h3>{incident.title}</h3>
                          <span className="alert-location">Uttarakhand</span>
                        </div>

                        <p>{incident.description}</p>

                        <div className="alert-bottom-row">
                          <span className="alert-time">
                            <FaClock />
                            {getTimeAgo(incident.published_at)}
                          </span>
                          <a href={incident.url} target="_blank" rel="noreferrer">
                            Details <FaArrowRight />
                          </a>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
