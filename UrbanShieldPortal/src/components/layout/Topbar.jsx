export default function Topbar() {
  return (
    <div className="topbar">
      <input 
        type="text" 
        placeholder="Search locations, incidents or resources..." 
      />
      <button className="primary-btn">Report Incident</button>
    </div>
  )
}