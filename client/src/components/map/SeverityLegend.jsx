export default function SeverityLegend({ heatmap, setHeatmap }) {
  return (
    <div className="legend">
      <h4>Severity Index</h4>
      <p><span className="dot critical"></span> Critical</p>
      <p><span className="dot warning"></span> High Alert</p>
      <p><span className="dot normal"></span> Normal</p>

      <div className="toggle-row">
        <label>Heatmap</label>
        <input 
          type="checkbox" 
          checked={heatmap}
          onChange={() => setHeatmap(!heatmap)}
        />
      </div>
    </div>
  )
}