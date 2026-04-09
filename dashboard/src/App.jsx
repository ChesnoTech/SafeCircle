import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getToken, getProfile } from './api';
import Layout from './components/Layout';
import LoginPage from './components/LoginPage';
import DashboardPage from './components/DashboardPage';
import ReportsPage from './components/ReportsPage';
import FlagsPage from './components/FlagsPage';
import SearchPage from './components/SearchPage';

const ALLOWED_ROLES = ['officer', 'authority', 'admin', 'moderator'];

function ProtectedRoute({ children, user }) {
  if (!getToken()) return <Navigate to="/login" replace />;
  if (user && !ALLOWED_ROLES.includes(user.role)) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2>Access Denied</h2>
        <p>This dashboard is restricted to law enforcement and moderators.</p>
      </div>
    );
  }
  return children;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (getToken()) {
      getProfile()
        .then(setUser)
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage onLogin={setUser} />} />
      <Route path="/*" element={
        <ProtectedRoute user={user}>
          <Layout user={user} setUser={setUser}>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/flags" element={<FlagsPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </ProtectedRoute>
      } />
    </Routes>
  );
}
