import { useState, useEffect } from 'react';
import { getFlags, updateFlag, takeFlagAction } from '../api';

const STATUS_CLASSES = {
  pending: 'badge-pending',
  reviewed: 'badge-reviewed',
  actioned: 'badge-resolved',
  dismissed: 'badge-dismissed',
};

const ACTION_TYPES = ['warn', 'hide', 'remove', 'ban'];

export default function FlagsPage() {
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFlag, setSelectedFlag] = useState(null);
  const [actionType, setActionType] = useState('warn');
  const [actionNote, setActionNote] = useState('');

  const fetchFlags = () => {
    setLoading(true);
    getFlags(1)
      .then((data) => setFlags(data.flags || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchFlags(); }, []);

  const handleStatusUpdate = async (id, status) => {
    try {
      await updateFlag(id, { status });
      fetchFlags();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAction = async () => {
    if (!selectedFlag) return;
    try {
      await takeFlagAction(selectedFlag.id, {
        action_type: actionType,
        note: actionNote || undefined,
      });
      setSelectedFlag(null);
      setActionNote('');
      fetchFlags();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Content Moderation</h1>
        <p>Review flagged content and take action</p>
      </div>

      <div style={{ display: 'flex', gap: 24 }}>
        {/* Flags table */}
        <div className="card" style={{ flex: 2 }}>
          {loading ? (
            <p>Loading flags...</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Reason</th>
                    <th>Reporter</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {flags.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', color: '#9CA3AF' }}>No flags to review</td></tr>
                  ) : (
                    flags.map((flag) => (
                      <tr key={flag.id}>
                        <td style={{ textTransform: 'capitalize' }}>{flag.content_type}</td>
                        <td>{flag.reason}</td>
                        <td>{flag.reporter_name || '\u2014'}</td>
                        <td>
                          <span className={`badge ${STATUS_CLASSES[flag.status] || 'badge-pending'}`}>
                            {flag.status}
                          </span>
                        </td>
                        <td>{new Date(flag.created_at).toLocaleDateString()}</td>
                        <td style={{ display: 'flex', gap: 4 }}>
                          {flag.status === 'pending' && (
                            <>
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => setSelectedFlag(flag)}
                              >
                                Action
                              </button>
                              <button
                                className="btn btn-sm btn-outline"
                                onClick={() => handleStatusUpdate(flag.id, 'dismissed')}
                              >
                                Dismiss
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Action panel */}
        {selectedFlag && (
          <div className="card" style={{ flex: 1 }}>
            <h3 style={{ marginBottom: 16 }}>Take Action</h3>
            <p style={{ fontSize: 14, marginBottom: 8 }}>
              <strong>Content:</strong> {selectedFlag.content_type} ({selectedFlag.content_id?.slice(0, 8)}...)
            </p>
            <p style={{ fontSize: 14, marginBottom: 16 }}>
              <strong>Reason:</strong> {selectedFlag.reason}
            </p>

            <div className="form-group">
              <label>Action Type</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {ACTION_TYPES.map((type) => (
                  <button
                    key={type}
                    className={`btn btn-sm ${actionType === type ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setActionType(type)}
                    style={{ textTransform: 'capitalize' }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Note (optional)</label>
              <textarea
                className="form-input"
                rows={3}
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                placeholder="Internal note about this action..."
              />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-danger" onClick={handleAction}>
                Confirm {actionType}
              </button>
              <button className="btn btn-outline" onClick={() => setSelectedFlag(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
