import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function FloatingStats() {
  const [incidents, setIncidents] = useState(0);
  const [hospitals, setHospitals] = useState(0);
  const [teams, setTeams] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // Fetch incidents count
    api.get("disasters/")
      .then(res => setIncidents(res.data.length || 0))
      .catch(() => setIncidents(0));
    // Fetch hospitals count (from geojson)
    fetch("/uttarakhand_hospitals.geojson")
      .then(res => res.json())
      .then(data => setHospitals((data.features && data.features.length) || 0))
      .catch(() => setHospitals(0));
    // Fetch response teams count (if available, fallback to 0)
    api.get("authorities/response_teams/")
      .then(res => setTeams(res.data.length || 0))
      .catch(() => setTeams(0))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="floating-card">
      <h3>Uttarakhand Monitoring</h3>
      <p>Real-time disaster & traffic monitoring</p>

      <div className="stats-row">
        <div>
          <strong>{loading ? '...' : incidents}</strong>
          <span>Active Incidents</span>
        </div>
        <div>
          <strong>{loading ? '...' : hospitals}</strong>
          <span>Hospitals</span>
        </div>
        <div>
          <strong>{loading ? '...' : teams}</strong>
          <span>Response Teams</span>
        </div>
      </div>
    </div>
  );
}