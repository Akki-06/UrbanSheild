import { useState } from "react"
import DisasterLegend from "./DisasterLegend"

export default function DisasterFilter() {
  const [selectedTypes, setSelectedTypes] = useState({
    flood: true,
    fire: true,
    earthquake: true,
    cyclone: true,
    heatwave: true
  })

  const [minSeverity, setMinSeverity] = useState(0)

  const handleTypeToggle = (type) => {
    setSelectedTypes(prev => ({
      ...prev,
      [type]: !prev[type]
    }))
  }

  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      right: '20px',
      backgroundColor: 'white',
      padding: '16px',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      zIndex: 999,
      maxWidth: '280px',
      fontFamily: 'system-ui'
    }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
        Filter Disasters
      </h3>

      {/* Severity Filter */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
          Minimum Severity: {minSeverity}
        </label>
        <input
          type="range"
          min="0"
          max="10"
          value={minSeverity}
          onChange={(e) => setMinSeverity(Number(e.target.value))}
          style={{ width: '100%', cursor: 'pointer' }}
        />
      </div>

      {/* Disaster Type Filters */}
      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '12px' }}>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
          Disaster Types
        </label>
        {Object.entries(selectedTypes).map(([type, selected]) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <input
              type="checkbox"
              checked={selected}
              onChange={() => handleTypeToggle(type)}
              style={{ cursor: 'pointer' }}
            />
            <label style={{ fontSize: '12px', color: '#374151', cursor: 'pointer' }}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </label>
          </div>
        ))}
      </div>
    </div>
  )
}
