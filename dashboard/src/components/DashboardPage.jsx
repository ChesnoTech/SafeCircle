import { useState, useEffect } from 'react';
import { getStats, getTrending } from '../api';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getStats(), getTrending(7)])
      .then(([s, t]) => {
        setStats(s);
        setTrending(t.areas || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading dashboard...</p>;

  const statCards = [
    { icon: '\uD83D\uDEA8', label: 'Active Missing', value: stats?.missing || 0, color: '#DC2626' },
    { icon: '\uD83D\uDCE6', label: 'Lost Items', value: stats?.lost || 0, color: '#F59E0B' },
    { icon: '\u2705', label: 'Found Items', value: stats?.found || 0, color: '#22C55E' },
    { icon: '\uD83D\uDC41', label: 'Sightings', value: stats?.sightings || 0, color: '#6366F1' },
    { icon: '\uD83C\uDF89', label: 'Resolved', value: stats?.resolved || 0, color: '#8B5CF6' },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Platform overview and recent activity</p>
      </div>

      <div className="card-grid">
        {statCards.map((s) => (
          <div key={s.label} className="card stat-card">
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16 }}>Trending Areas (Last 7 Days)</h3>
        {trending.length === 0 ? (
          <p style={{ color: '#9CA3AF' }}>No trending areas detected</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Area (Lat, Lng)</th>
                  <th>Reports</th>
                  <th>Latest Report</th>
                  <th>Activity</th>
                </tr>
              </thead>
              <tbody>
                {trending.map((area, i) => {
                  const count = parseInt(area.report_count);
                  const maxCount = parseInt(trending[0].report_count);
                  const ratio = count / maxCount;
                  const level = ratio >= 0.7 ? 'High' : ratio >= 0.4 ? 'Medium' : 'Low';
                  const levelClass = ratio >= 0.7 ? 'badge-active' : ratio >= 0.4 ? 'badge-pending' : 'badge-resolved';

                  return (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>{parseFloat(area.lat_grid).toFixed(2)}, {parseFloat(area.lng_grid).toFixed(2)}</td>
                      <td><strong>{count}</strong></td>
                      <td>{new Date(area.latest_report).toLocaleDateString()}</td>
                      <td><span className={`badge ${levelClass}`}>{level}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
