import { useState, useEffect } from 'react'
import { FaExclamationTriangle, FaTimes, FaMapMarkerAlt, FaArrowRight } from 'react-icons/fa'
import api from '../../api/axios'
import '../../styles/alerts.css'

export default function DisasterAlerts({ hidden = false }) {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedAlert, setSelectedAlert] = useState(null)

  // Fetch active alerts on component mount and poll every 30 seconds
  useEffect(() => {
    fetchAlerts()
    const interval = setInterval(fetchAlerts, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchAlerts = async () => {
    setLoading(true)
    try {
      const res = await api.get('disaster-alert/active_alerts/')
      setAlerts(res.data || [])
    } catch (err) {
      console.error('Failed to fetch alerts:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkViewed = async (alertId) => {
    try {
      await api.post('disaster-alert/mark_viewed/', { alert_id: alertId })
      setAlerts(alerts.map(a => 
        a.id === alertId ? { ...a, status: 'viewed' } : a
      ))
    } catch (err) {
      console.error('Failed to mark alert as viewed:', err)
    }
  }

  const handleGetEvacuationRoute = async (disasterId) => {
    try {
      const res = await api.post('disaster-alert/get_evacuation_route/', {
        disaster_id: disasterId
      })
      setSelectedAlert({
        ...selectedAlert,
        evacuation_route: res.data.evacuation_route
      })
    } catch (err) {
      console.error('Failed to get evacuation route:', err)
      alert('Could not compute evacuation route. Please contact authorities.')
    }
  }

  if (hidden || (alerts.length === 0 && !loading)) {
    return null
  }

  return (
    <div className="alerts-container">
      <div className="alerts-header">
        <FaExclamationTriangle className="alert-icon-header" />
        <span className="alert-count">({alerts.length}) Active Alerts</span>
      </div>

      <div className="alerts-list">
        {alerts.map(alert => (
          <div 
            key={alert.id} 
            className={`alert-card severity-${Math.min(alert.disaster_severity, 10)}`}
            onClick={() => {
              setSelectedAlert(alert)
              handleMarkViewed(alert.id)
            }}
          >
            <div className="alert-content">
              <div className="alert-title">
                <span className="disaster-type">
                  {getDisasterEmoji(alert.disaster_type)} {alert.disaster_type.toUpperCase()}
                </span>
                <span className="severity-badge">
                  {alert.disaster_severity}/10
                </span>
              </div>

              <div className="alert-details">
                <div className="detail-row">
                  <FaMapMarkerAlt className="detail-icon" />
                  <span>{alert.distance_km}km away</span>
                </div>
                <div className="detail-row">
                  <span className="status-badge" style={{
                    backgroundColor: alert.status === 'sent' ? '#ef4444' : '#10b981'
                  }}>
                    {alert.status === 'sent' ? '⚠️ New Alert' : '✓ Viewed'}
                  </span>
                </div>
              </div>

              <button 
                className="evacuation-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  handleGetEvacuationRoute(alert.disaster)
                }}
              >
                <FaArrowRight /> Get Evacuation Route
              </button>
            </div>

            <button
              className="close-btn"
              onClick={(e) => {
                e.stopPropagation()
                setAlerts(alerts.filter(a => a.id !== alert.id))
              }}
            >
              <FaTimes />
            </button>
          </div>
        ))}
      </div>

      {/* Modal for detailed alert */}
      {selectedAlert && (
        <div className="alert-modal-overlay" onClick={() => setSelectedAlert(null)}>
          <div className="alert-modal" onClick={(e) => e.stopPropagation()}>
            <button 
              className="modal-close"
              onClick={() => setSelectedAlert(null)}
            >
              <FaTimes />
            </button>

            <h2>🚨 Disaster Alert</h2>
            
            <div className="modal-content">
              <div className="alert-info">
                <p><strong>Type:</strong> {selectedAlert.disaster_type.toUpperCase()}</p>
                <p><strong>Severity:</strong> {selectedAlert.disaster_severity}/10</p>
                <p><strong>Distance:</strong> {selectedAlert.distance_km}km away</p>
                <p><strong>Alert Time:</strong> {new Date(selectedAlert.alert_sent_at).toLocaleTimeString()}</p>
              </div>

              {selectedAlert.evacuation_route && (
                <div className="evacuation-info">
                  <h3>🛣️ Evacuation Route</h3>
                  <p><strong>Shelter:</strong> {selectedAlert.evacuation_route.nearest_shelter?.name}</p>
                  <p><strong>Distance:</strong> {selectedAlert.evacuation_route.nearest_shelter?.distance_km}km</p>
                  <p><strong>ETA:</strong> ~{selectedAlert.evacuation_route.eta_minutes} minutes</p>
                  <button className="open-route-btn">
                    View on Map
                  </button>
                </div>
              )}

              <div className="modal-actions">
                <button className="action-btn evacuate">
                  🏃 Start Evacuation
                </button>
                <button 
                  className="action-btn"
                  onClick={() => {
                    handleGetEvacuationRoute(selectedAlert.disaster)
                  }}
                >
                  🗺️ Get Route
                </button>
                <button 
                  className="action-btn close"
                  onClick={() => setSelectedAlert(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function getDisasterEmoji(type) {
  const emojis = {
    flood: '🌊',
    fire: '🔥',
    earthquake: '🌍',
    cyclone: '🌀',
    heatwave: '☀️'
  }
  return emojis[type] || '⚠️'
}
