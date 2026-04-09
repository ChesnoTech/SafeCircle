import { NavLink, useNavigate } from 'react-router-dom';
import { clearToken } from '../api';

const NAV_ITEMS = [
  { path: '/', icon: '\uD83D\uDCCA', label: 'Dashboard' },
  { path: '/reports', icon: '\uD83D\uDEA8', label: 'Reports' },
  { path: '/flags', icon: '\u26A0\uFE0F', label: 'Moderation' },
  { path: '/search', icon: '\uD83D\uDD0D', label: 'Search' },
];

export default function Layout({ children, user, setUser }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearToken();
    setUser(null);
    navigate('/login');
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          Safe<span>Circle</span>
          <span className="sidebar-badge">LEA</span>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => isActive ? 'active' : ''}
            >
              <span className="icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="name">{user?.name || 'Officer'}</div>
          <div className="role">{user?.role || 'officer'}</div>
          <button
            onClick={handleLogout}
            style={{
              marginTop: 12, background: 'none', border: '1px solid #4B5563',
              color: '#9CA3AF', padding: '6px 12px', borderRadius: 6,
              cursor: 'pointer', fontSize: 13, width: '100%',
            }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
