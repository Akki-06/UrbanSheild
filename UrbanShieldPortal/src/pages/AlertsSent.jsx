import { useEffect, useState } from "react"
import { FaEnvelopeOpenText, FaClock } from "react-icons/fa"
import Sidebar from "../components/layout/Sidebar"
import Topbar from "../components/layout/Topbar"
import api from "../api/axios"
import "../styles/alerts.css"

export default function AlertsSent() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    setLoading(true)
    api.get("escalation-log/")
      .then(res => {
        setLogs(Array.isArray(res.data) ? res.data : [])
        setError("")
      })
      .catch(err => {
        setError("Failed to load alert history")
        console.warn(err)
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <Topbar />
        <div className="page-content">
          <div className="alerts-panel">
            <div className="alerts-panel-header">
              <div className="alerts-title">
                <FaEnvelopeOpenText className="alerts-title-icon" />
                <h1>Alerts Sent</h1>
              </div>
            </div>

            {loading && (
              <div className="alerts-message">
                <div className="spinner" />
                <span>Loading alert history...</span>
              </div>
            )}

            {!loading && error && (
              <div className="alerts-message error">
                <span>{error}</span>
              </div>
            )}

            {!loading && !error && (
              <div className="alerts-list">
                {logs.map((log, idx) => (
                  <article className="alert-card" key={`${log.id || idx}`}>
                    <div className="alert-media alert-media-fallback">ALRT</div>
                    <div className="alert-body">
                      <div className="alert-top-row">
                        <h3>{log.authority_name || "Authority"}</h3>
                        <span className="alert-location">
                          {log.disaster?.disaster_type || "Disaster"}
                        </span>
                      </div>
                      <p>
                        Notification sent regarding{" "}
                        <strong>{log.disaster?.disaster_type || "disaster"}</strong>{" "}
                        at severity {log.disaster?.severity ?? "?"}.
                      </p>
                      <div className="alert-bottom-row">
                        <span className="alert-time">
                          <FaClock /> {new Date(log.created_at || log.timestamp || Date.now()).toLocaleString()}
                        </span>
                        <span className="alert-location">
                          {log.email_sent ? "Email sent" : "Pending"}
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
                {!logs.length && (
                  <div className="alerts-message">
                    <span>No alert history found.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
