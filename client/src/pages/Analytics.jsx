import { useCallback, useEffect, useMemo, useState } from "react"
import {
  FaChartLine,
  FaExclamationTriangle,
  FaMapMarkerAlt,
  FaRoad,
  FaSyncAlt,
} from "react-icons/fa"

import api from "../api/axios"
import Sidebar from "../components/layout/Sidebar"
import Topbar from "../components/layout/Topbar"
import "../styles/analytics.css"

const POLL_MS = 5 * 60 * 1000

const formatDayKey = (date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

const recentDays = (count) => {
  const days = []
  const now = new Date()
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(now)
    d.setHours(0, 0, 0, 0)
    d.setDate(now.getDate() - i)
    days.push({
      key: formatDayKey(d),
      label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    })
  }
  return days
}

const safeDate = (value) => {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export default function Analytics() {
  const [disasters, setDisasters] = useState([])
  const [traffic, setTraffic] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [updatedAt, setUpdatedAt] = useState(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [disasterRes, trafficRes] = await Promise.all([
        api.get("disasters/"),
        api.get("traffic/"),
      ])
      setDisasters(Array.isArray(disasterRes.data) ? disasterRes.data : [])
      setTraffic(Array.isArray(trafficRes.data) ? trafficRes.data : [])
      setUpdatedAt(new Date())
      setError("")
    } catch (err) {
      console.error("analytics fetch error", err)
      setError("Failed to load analytics data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, POLL_MS)
    return () => clearInterval(interval)
  }, [fetchData])

  const analytics = useMemo(() => {
    const now = Date.now()
    const oneDayAgo = now - 24 * 60 * 60 * 1000
    const sevenDays = recentDays(7)
    const dayMap = new Map(sevenDays.map((d) => [d.key, { ...d, disasters: 0, traffic: 0 }]))

    const disasterByType = {}
    const disasterByStatus = {}
    const severityBuckets = [
      { label: "Low (1-3)", min: 1, max: 3, count: 0 },
      { label: "Medium (4-6)", min: 4, max: 6, count: 0 },
      { label: "High (7-8)", min: 7, max: 8, count: 0 },
      { label: "Critical (9-10)", min: 9, max: 10, count: 0 },
    ]
    const hotspots = new Map()

    let activeCount = 0
    let criticalCount = 0
    let severityTotal = 0
    let severityCount = 0
    let last24Disasters = 0

    disasters.forEach((d) => {
      const created = safeDate(d.created_at)
      if (!created) return

      const dayKey = formatDayKey(created)
      if (dayMap.has(dayKey)) dayMap.get(dayKey).disasters += 1

      if (created.getTime() >= oneDayAgo) last24Disasters += 1
      if (d.status === "active" || d.status === "critical") activeCount += 1
      if ((d.severity || 0) >= 8 || d.status === "critical") criticalCount += 1

      const sev = Number(d.severity) || 0
      severityTotal += sev
      severityCount += 1
      severityBuckets.forEach((bucket) => {
        if (sev >= bucket.min && sev <= bucket.max) bucket.count += 1
      })

      const type = d.disaster_type || "other"
      disasterByType[type] = (disasterByType[type] || 0) + 1
      const status = d.status || "unknown"
      disasterByStatus[status] = (disasterByStatus[status] || 0) + 1

      const hotspotKey = `${Number(d.latitude).toFixed(2)}, ${Number(d.longitude).toFixed(2)}`
      if (!hotspots.has(hotspotKey)) {
        hotspots.set(hotspotKey, {
          key: hotspotKey,
          count: 0,
          maxSeverity: 0,
          latestAt: created.getTime(),
        })
      }
      const item = hotspots.get(hotspotKey)
      item.count += 1
      item.maxSeverity = Math.max(item.maxSeverity, sev)
      item.latestAt = Math.max(item.latestAt, created.getTime())
    })

    let blockedRoads = 0
    let avgCongestion = 0
    let congestionTotal = 0
    let last24Traffic = 0

    traffic.forEach((t) => {
      const created = safeDate(t.created_at)
      if (!created) return

      const dayKey = formatDayKey(created)
      if (dayMap.has(dayKey)) dayMap.get(dayKey).traffic += 1
      if (created.getTime() >= oneDayAgo) last24Traffic += 1

      if (t.is_blocked) blockedRoads += 1
      congestionTotal += Number(t.congestion_level) || 0
    })

    if (traffic.length) {
      avgCongestion = congestionTotal / traffic.length
    }

    const trendData = sevenDays.map((d) => dayMap.get(d.key))
    const trendMax = Math.max(
      1,
      ...trendData.map((d) => Math.max(d.disasters, d.traffic))
    )

    const typeData = Object.entries(disasterByType)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)

    const statusData = Object.entries(disasterByStatus)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count)

    const hotspotData = Array.from(hotspots.values())
      .sort((a, b) => b.count - a.count || b.maxSeverity - a.maxSeverity)
      .slice(0, 8)

    const recentEvents = [...disasters]
      .filter((d) => safeDate(d.created_at))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10)

    return {
      activeCount,
      criticalCount,
      avgSeverity: severityCount ? severityTotal / severityCount : 0,
      blockedRoads,
      avgCongestion,
      last24Disasters,
      last24Traffic,
      trendData,
      trendMax,
      typeData,
      statusData,
      severityBuckets,
      hotspotData,
      recentEvents,
    }
  }, [disasters, traffic])

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <Topbar />
        <div className="page-content analytics-page">
          <section className="analytics-hero">
            <div>
              <h1>Operational Analytics</h1>
              <p>
                Time-based disaster and traffic intelligence for Uttarakhand with live incident profiling.
              </p>
            </div>
            <button className="analytics-refresh-btn" onClick={fetchData} disabled={loading}>
              <FaSyncAlt className={loading ? "spin" : ""} />
              Refresh
            </button>
          </section>

          {updatedAt && (
            <p className="analytics-updated">
              Updated: {updatedAt.toLocaleDateString()} {updatedAt.toLocaleTimeString()}
            </p>
          )}

          {error && <div className="analytics-error">{error}</div>}

          <section className="metric-grid">
            <article className="metric-card">
              <FaExclamationTriangle />
              <div>
                <span>Active Disasters</span>
                <strong>{analytics.activeCount}</strong>
              </div>
            </article>
            <article className="metric-card">
              <FaChartLine />
              <div>
                <span>Critical Cases</span>
                <strong>{analytics.criticalCount}</strong>
              </div>
            </article>
            <article className="metric-card">
              <FaRoad />
              <div>
                <span>Blocked Roads</span>
                <strong>{analytics.blockedRoads}</strong>
              </div>
            </article>
            <article className="metric-card">
              <FaMapMarkerAlt />
              <div>
                <span>Avg Severity</span>
                <strong>{analytics.avgSeverity.toFixed(1)}/10</strong>
              </div>
            </article>
          </section>

          <section className="analytics-grid">
            <article className="analytics-card">
              <h3>7-Day Incident Trend</h3>
              <div className="trend-legend">
                <span><i className="legend-dot disaster" /> Disasters</span>
                <span><i className="legend-dot traffic" /> Traffic</span>
              </div>
              <div className="trend-chart">
                {analytics.trendData.map((d) => (
                  <div key={d.key} className="trend-row">
                    <span className="trend-label">{d.label}</span>
                    <div className="trend-bars">
                      <div
                        className="bar disaster"
                        style={{ width: `${(d.disasters / analytics.trendMax) * 100}%` }}
                      />
                      <div
                        className="bar traffic"
                        style={{ width: `${(d.traffic / analytics.trendMax) * 100}%` }}
                      />
                    </div>
                    <span className="trend-values">{d.disasters}/{d.traffic}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="analytics-card">
              <h3>Disaster Type Distribution</h3>
              <div className="distribution-list">
                {analytics.typeData.length === 0 && <p>No disaster data available.</p>}
                {analytics.typeData.map((item) => (
                  <div key={item.type} className="distribution-item">
                    <div className="distribution-header">
                      <span>{item.type.toUpperCase()}</span>
                      <strong>{item.count}</strong>
                    </div>
                    <div className="distribution-track">
                      <div
                        className="distribution-fill"
                        style={{
                          width: `${(item.count / Math.max(...analytics.typeData.map((v) => v.count), 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="analytics-card">
              <h3>Severity Spectrum</h3>
              <div className="distribution-list">
                {analytics.severityBuckets.map((bucket) => (
                  <div key={bucket.label} className="distribution-item">
                    <div className="distribution-header">
                      <span>{bucket.label}</span>
                      <strong>{bucket.count}</strong>
                    </div>
                    <div className="distribution-track">
                      <div
                        className="distribution-fill severity"
                        style={{
                          width: `${(bucket.count / Math.max(...analytics.severityBuckets.map((v) => v.count), 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="analytics-card">
              <h3>Current Status Mix</h3>
              <div className="distribution-list">
                {analytics.statusData.length === 0 && <p>No status data available.</p>}
                {analytics.statusData.map((item) => (
                  <div key={item.status} className="distribution-item">
                    <div className="distribution-header">
                      <span>{item.status.toUpperCase()}</span>
                      <strong>{item.count}</strong>
                    </div>
                    <div className="distribution-track">
                      <div
                        className="distribution-fill status"
                        style={{
                          width: `${(item.count / Math.max(...analytics.statusData.map((v) => v.count), 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="analytics-grid wide">
            <article className="analytics-card">
              <h3>Hotspot Coordinates (High Frequency)</h3>
              <div className="hotspot-list">
                {analytics.hotspotData.length === 0 && <p>No hotspots yet.</p>}
                {analytics.hotspotData.map((h) => (
                  <div key={h.key} className="hotspot-item">
                    <span>{h.key}</span>
                    <span>{h.count} incidents</span>
                    <span>Max severity {h.maxSeverity}/10</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="analytics-card">
              <h3>Last 24 Hours Snapshot</h3>
              <div className="snapshot-grid">
                <div>
                  <span>Disasters</span>
                  <strong>{analytics.last24Disasters}</strong>
                </div>
                <div>
                  <span>Traffic Events</span>
                  <strong>{analytics.last24Traffic}</strong>
                </div>
                <div>
                  <span>Average Congestion</span>
                  <strong>{analytics.avgCongestion.toFixed(1)}/10</strong>
                </div>
                <div>
                  <span>Total Events Loaded</span>
                  <strong>{disasters.length + traffic.length}</strong>
                </div>
              </div>
            </article>
          </section>

          <section className="analytics-card table-card">
            <h3>Recent Disaster Timeline (Location + Date)</h3>
            {loading && <p>Loading timeline...</p>}
            {!loading && analytics.recentEvents.length === 0 && <p>No recent disasters found.</p>}
            {!loading && analytics.recentEvents.length > 0 && (
              <div className="analytics-table-wrap">
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>Date & Time</th>
                      <th>Type</th>
                      <th>Severity</th>
                      <th>Status</th>
                      <th>Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.recentEvents.map((event) => (
                      <tr key={event.id}>
                        <td>{safeDate(event.created_at)?.toLocaleString() || "-"}</td>
                        <td>{(event.disaster_type || "unknown").toUpperCase()}</td>
                        <td>{event.severity}/10</td>
                        <td>{(event.status || "unknown").toUpperCase()}</td>
                        <td>{Number(event.latitude).toFixed(4)}, {Number(event.longitude).toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
