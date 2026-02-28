import { useState, useEffect } from "react"
import axios from "../api/axios"
import Sidebar from "../components/layout/Sidebar"
import Topbar from "../components/layout/Topbar"
import "../styles/incidents.css"

// Classify severity based on keywords in title/description
const classifySeverity = (title, description) => {
  const text = `${title} ${description}`.toLowerCase()

  const criticalKeywords = ["flood", "earthquake", "landslide", "death", "explosion"]
  const trafficKeywords = ["traffic", "accident", "congestion", "collision"]
  const warningKeywords = ["rain alert", "heatwave", "advisory"]

  if (criticalKeywords.some(keyword => text.includes(keyword))) {
    return "CRITICAL"
  }
  if (trafficKeywords.some(keyword => text.includes(keyword))) {
    return "TRAFFIC"
  }
  if (warningKeywords.some(keyword => text.includes(keyword))) {
    return "WARNING"
  }

  return "INFO"
}

// Format time difference
const getTimeAgo = (publishedAt) => {
  const now = new Date()
  const published = new Date(publishedAt)
  const diffMs = now - published
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return published.toLocaleDateString()
}

export default function Incidents() {
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        setLoading(true)
        console.log("Fetching from: /api/news/incidents/")
        const response = await axios.get("/api/news/incidents/")
        console.log("Response data:", response.data)
        setIncidents(response.data)
        setError(null)
      } catch (err) {
        console.error("Error fetching incidents:", err.message)
        console.error("Error details:", err.response?.data || err.response?.status)
        setError(`Failed to load incidents: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }

    fetchIncidents()
  }, [])

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <Topbar />
        <div className="page-content">
          <div className="incidents-header">
            <h1>Live Incidents</h1>
            <p>Real-time news and emergency alerts in Uttarakhand</p>
          </div>

          {loading && (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Loading incidents...</p>
            </div>
          )}

          {error && (
            <div className="error-container">
              <p>{error}</p>
              <button 
                onClick={() => {
                  setError(null)
                  setLoading(true)
                  const fetchIncidents = async () => {
                    try {
                      const response = await axios.get("/api/news/incidents/")
                      setIncidents(response.data)
                      setError(null)
                    } catch (err) {
                      setError(`Failed to load incidents: ${err.message}`)
                    } finally {
                      setLoading(false)
                    }
                  }
                  fetchIncidents()
                }}
                style={{ marginTop: '1rem', padding: '0.5rem 1rem', backgroundColor: '#ff4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Try Again
              </button>
            </div>
          )}

          {!loading && incidents.length === 0 && (
            <div className="empty-state">
              <p>No incidents reported at this time.</p>
            </div>
          )}

          {!loading && !error && incidents.length > 0 && (
            <div className="incidents-grid">
            {incidents.map((incident, index) => {
              const severity = classifySeverity(incident.title, incident.description)

              return (
                <div key={index} className={`incident-card severity-${severity.toLowerCase()}`}>
                  {incident.image && (
                    <div className="incident-image">
                      <img src={incident.image} alt={incident.title} />
                    </div>
                  )}

                  <div className={`incident-content ${!incident.image ? "full-width" : ""}`}>
                    <div className="incident-header">
                      <span className={`severity-badge badge-${severity.toLowerCase()}`}>
                        {severity}
                      </span>
                      <span className="incident-time">{getTimeAgo(incident.published_at)}</span>
                    </div>

                    <h3 className="incident-title">{incident.title}</h3>

                    <p className="incident-description">{incident.description}</p>

                    <div className="incident-footer">
                      <span className="incident-source">{incident.source}</span>
                      <a
                        href={incident.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="details-link"
                      >
                        Details →
                      </a>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          )}
        </div>
      </div>
    </div>
  )
}
