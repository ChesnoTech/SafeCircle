import { useState } from 'react';
import { searchReports } from '../api';

function getTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await searchReports(query, type);
      setResults(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const totalResults =
    (results?.missing?.length || 0) +
    (results?.lost?.length || 0) +
    (results?.found?.length || 0);

  return (
    <div>
      <div className="page-header">
        <h1>Search</h1>
        <p>Search across all reports, items, and people</p>
      </div>

      <form onSubmit={handleSearch} className="search-bar">
        <input
          className="form-input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, description, category..."
        />
        <select
          className="form-input"
          value={type}
          onChange={(e) => setType(e.target.value)}
          style={{ width: 140 }}
        >
          <option value="all">All</option>
          <option value="missing">Missing</option>
          <option value="lost">Lost</option>
          <option value="found">Found</option>
        </select>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {results && (
        <div>
          <p style={{ marginBottom: 16, color: '#6B7280' }}>
            Found <strong>{totalResults}</strong> result(s) for "{query}"
          </p>

          {/* Missing */}
          {results.missing?.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <h3 style={{ marginBottom: 12 }}>Missing Persons ({results.missing.length})</h3>
              <div className="table-container">
                <table>
                  <thead>
                    <tr><th>Name</th><th>Age</th><th>Status</th><th>Location</th><th>Reported</th></tr>
                  </thead>
                  <tbody>
                    {results.missing.map((r) => (
                      <tr key={r.id}>
                        <td><strong>{r.name}</strong></td>
                        <td>{r.age || '\u2014'}</td>
                        <td><span className={`badge ${r.status === 'active' ? 'badge-active' : 'badge-resolved'}`}>{r.status}</span></td>
                        <td>{r.latitude?.toFixed(3)}, {r.longitude?.toFixed(3)}</td>
                        <td>{getTimeAgo(r.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Lost items */}
          {results.lost?.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <h3 style={{ marginBottom: 12 }}>Lost Items ({results.lost.length})</h3>
              <div className="table-container">
                <table>
                  <thead>
                    <tr><th>Category</th><th>Description</th><th>Color</th><th>Brand</th><th>Status</th><th>Reported</th></tr>
                  </thead>
                  <tbody>
                    {results.lost.map((r) => (
                      <tr key={r.id}>
                        <td style={{ textTransform: 'capitalize' }}>{r.category}</td>
                        <td>{r.description?.slice(0, 60)}{r.description?.length > 60 ? '...' : ''}</td>
                        <td>{r.color || '\u2014'}</td>
                        <td>{r.brand || '\u2014'}</td>
                        <td><span className={`badge ${r.status === 'available' ? 'badge-pending' : 'badge-resolved'}`}>{r.status}</span></td>
                        <td>{getTimeAgo(r.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Found items */}
          {results.found?.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <h3 style={{ marginBottom: 12 }}>Found Items ({results.found.length})</h3>
              <div className="table-container">
                <table>
                  <thead>
                    <tr><th>Category</th><th>Description</th><th>Color</th><th>Brand</th><th>Status</th><th>Reported</th></tr>
                  </thead>
                  <tbody>
                    {results.found.map((r) => (
                      <tr key={r.id}>
                        <td style={{ textTransform: 'capitalize' }}>{r.category}</td>
                        <td>{r.description?.slice(0, 60)}{r.description?.length > 60 ? '...' : ''}</td>
                        <td>{r.color || '\u2014'}</td>
                        <td>{r.brand || '\u2014'}</td>
                        <td><span className={`badge ${r.status === 'available' ? 'badge-pending' : 'badge-resolved'}`}>{r.status}</span></td>
                        <td>{getTimeAgo(r.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {totalResults === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: 40 }}>
              <p style={{ fontSize: 48 }}>{'\uD83D\uDD0D'}</p>
              <p style={{ color: '#9CA3AF', marginTop: 12 }}>No results found for "{query}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
