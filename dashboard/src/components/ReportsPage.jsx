import { useState, useEffect } from 'react';
import { getReportsNearby } from '../api';

function getTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function escapeCSV(value) {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function exportToCSV(reports) {
  const headers = ['ID', 'Name', 'Age', 'Gender', 'Status', 'Sightings', 'Clothing', 'Circumstances', 'Latitude', 'Longitude', 'Created At'];
  const rows = reports.map((r) => [
    escapeCSV(r.id),
    escapeCSV(r.name),
    escapeCSV(r.age),
    escapeCSV(r.gender),
    escapeCSV(r.status),
    escapeCSV(r.sighting_count || 0),
    escapeCSV(r.clothing_description),
    escapeCSV(r.circumstances),
    escapeCSV(r.latitude),
    escapeCSV(r.longitude),
    escapeCSV(r.created_at ? new Date(r.created_at).toISOString() : ''),
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `safecircle-reports-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    // Default: Moscow center (configurable per deployment)
    getReportsNearby(55.7558, 37.6173, 50)
      .then((data) => setReports(data.alerts || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredReports = statusFilter === 'all'
    ? reports
    : reports.filter((r) => r.status === statusFilter);

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Missing Person Reports</h1>
          <p>All active and resolved reports in the region</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            className="form-input"
            style={{ width: 140, padding: '6px 10px', fontSize: 13 }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="resolved">Resolved</option>
          </select>
          <button
            className="btn btn-outline"
            onClick={() => exportToCSV(filteredReports)}
            disabled={filteredReports.length === 0}
            title="Export to CSV"
          >
            {'📥'} Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <p>Loading reports...</p>
      ) : (
        <div style={{ display: 'flex', gap: 24 }}>
          {/* Reports table */}
          <div className="card" style={{ flex: 2 }}>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Photo</th>
                    <th>Name</th>
                    <th>Age</th>
                    <th>Status</th>
                    <th>Sightings</th>
                    <th>Reported</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', color: '#9CA3AF' }}>No reports found</td></tr>
                  ) : (
                    filteredReports.map((r) => (
                      <tr
                        key={r.id}
                        onClick={() => setSelectedReport(r)}
                        style={{ cursor: 'pointer', background: selectedReport?.id === r.id ? '#F9FAFB' : undefined }}
                      >
                        <td>
                          {r.photo_url ? (
                            <img
                              src={r.photo_url}
                              alt={r.name}
                              style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }}
                            />
                          ) : (
                            <div style={{
                              width: 40, height: 40, borderRadius: 8, background: '#f0f0f0',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold',
                            }}>
                              {(r.name || '?')[0]}
                            </div>
                          )}
                        </td>
                        <td><strong>{r.name}</strong></td>
                        <td>{r.age || '\u2014'}</td>
                        <td>
                          <span className={`badge ${r.status === 'active' ? 'badge-active' : 'badge-resolved'}`}>
                            {r.status}
                          </span>
                        </td>
                        <td>{r.sighting_count || 0}</td>
                        <td>{getTimeAgo(r.created_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detail panel */}
          {selectedReport && (
            <div className="card" style={{ flex: 1 }}>
              <h3 style={{ marginBottom: 16 }}>Report Detail</h3>
              {selectedReport.photo_url && (
                <img
                  src={selectedReport.photo_url}
                  alt={selectedReport.name}
                  style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8, marginBottom: 12 }}
                />
              )}
              <p><strong>Name:</strong> {selectedReport.name}</p>
              <p><strong>Age:</strong> {selectedReport.age || 'Unknown'}</p>
              <p><strong>Gender:</strong> {selectedReport.gender || 'Unknown'}</p>
              <p><strong>Status:</strong> {selectedReport.status}</p>
              <p><strong>Sightings:</strong> {selectedReport.sighting_count || 0}</p>
              {selectedReport.clothing_description && (
                <p><strong>Clothing:</strong> {selectedReport.clothing_description}</p>
              )}
              {selectedReport.circumstances && (
                <p style={{ marginTop: 8 }}><strong>Circumstances:</strong> {selectedReport.circumstances}</p>
              )}
              <p style={{ marginTop: 8, color: '#9CA3AF', fontSize: 12 }}>
                Reported {new Date(selectedReport.created_at).toLocaleString()}
              </p>
              <p style={{ color: '#9CA3AF', fontSize: 12 }}>
                Location: {selectedReport.latitude?.toFixed(4)}, {selectedReport.longitude?.toFixed(4)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
