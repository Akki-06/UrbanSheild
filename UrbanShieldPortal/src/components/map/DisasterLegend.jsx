export default function DisasterLegend({ showFacilities = false }) {
  const disasters = [
    { type: 'flood', bg: '#3b82f6', label: 'Flood' },
    { type: 'fire', bg: '#ef4444', label: 'Fire' },
    { type: 'earthquake', bg: '#8b5cf6', label: 'Earthquake' },
    { type: 'cyclone', bg: '#06b6d4', label: 'Cyclone' },
    { type: 'heatwave', bg: '#f59e0b', label: 'Heatwave' }
  ]
  const resources = [
    { type: 'police', icon: '🚓', label: 'Police Station', bg: '#2563eb' },
    { type: 'fire', icon: '🚒', label: 'Fire Station', bg: '#ef4444' }
  ]

  const severities = [
    { range: '8-10', color: '#991b1b', label: 'Critical' },
    { range: '5-7', color: '#b45309', label: 'High' },
    { range: '0-4', color: '#e5e7eb', label: 'Low' }
  ]

  return (
    <div style={{
      position: 'absolute',
      bottom: '20px',
      right: '20px',
      backgroundColor: 'white',
      padding: '16px',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      zIndex: 1000,
      maxWidth: '280px',
      fontFamily: 'system-ui'
    }}>
      
      {/* Disaster Types */}
      <div style={{ marginBottom: '16px' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
          Disaster Types
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {disasters.map(d => (
            <div key={d.type} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '30px',
                height: '30px',
                backgroundColor: d.bg,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                color: 'black',
                flexShrink: 0
              }}>
                {(() => {
                  switch (d.type) {
                    case 'flood': return '🌊'
                    case 'fire': return '🔥'
                    case 'earthquake': return '🌍'
                    case 'cyclone': return '🌀'
                    case 'heatwave': return '☀️'
                    default: return '❓'
                  }
                })()}
              </div>
              <span style={{ fontSize: '12px', color: '#374151' }}>{d.label}</span>
            </div>
          ))}
        </div>
      </div>
      {showFacilities && (
        <div style={{ marginBottom: '16px', borderTop: '1px solid #e5e7eb', paddingTop: '12px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
            Stations / Resources
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {resources.map(r => (
              <div key={r.type} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '30px',
                  height: '30px',
                  backgroundColor: r.bg,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  color: 'black',
                  flexShrink: 0
                }}>
                  {r.icon}
                </div>
                <span style={{ fontSize: '12px', color: '#374151' }}>{r.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Severity Levels */}
      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '12px' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
          Severity Levels
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {severities.map(s => (
            <div key={s.range} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '24px',
                height: '24px',
                backgroundColor: s.color,
                border: `3px solid ${s.color}`,
                borderRadius: '50%',
                flexShrink: 0
              }} />
              <span style={{ fontSize: '12px', color: '#374151' }}>
                {s.label} ({s.range})
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Info */}
      <div style={{
        borderTop: '1px solid #e5e7eb',
        marginTop: '12px',
        paddingTop: '12px',
        fontSize: '11px',
        color: '#6b7280'
      }}>
        Click on pinpoints to view detailed disaster information
      </div>
    </div>
  )
}
