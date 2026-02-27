export default function Sidebar({ viewMode, setViewMode, heatmap, setHeatmap, refreshData }) {

  const buttonStyle = (active) => ({
    padding: "10px",
    marginBottom: "10px",
    background: active ? "#2563EB" : "#E5E7EB",
    color: active ? "white" : "black",
    border: "none",
    cursor: "pointer",
    width: "100%",
    borderRadius: "6px"
  })

  return (
    <div style={{
      width: "250px",
      padding: "20px",
      background: "#F9FAFB",
      borderRight: "1px solid #E5E7EB"
    }}>
      <h3 style={{ marginBottom: "20px" }}>Controls</h3>

      <button
        style={buttonStyle(viewMode === "disaster")}
        onClick={() => setViewMode("disaster")}
      >
        Disaster View
      </button>

      <button
        style={buttonStyle(viewMode === "traffic")}
        onClick={() => setViewMode("traffic")}
      >
        Traffic View
      </button>

      <button
        style={buttonStyle(heatmap)}
        onClick={() => setHeatmap(!heatmap)}
      >
        Toggle Heatmap
      </button>

      <button
        style={{ ...buttonStyle(false), background: "#10B981", color: "white" }}
        onClick={refreshData}
      >
        Refresh Data
      </button>
    </div>
  )
}