import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '⊞' },
  { id: 'accounts', label: 'Accounts', icon: '⊘' },
  { id: 'transactions', label: 'Transactions', icon: '↕' },
  { id: 'twin', label: 'Digital Twin', icon: '◷' },
  { id: 'risk', label: 'Risk Analysis', icon: '⚠' },
  { id: 'portfolio', label: 'Portfolio', icon: '📈' },
  { id: 'notifications', label: 'Notifications', icon: '🔔', hasBadge: true },
];

export default function Sidebar({ isOpen, onClose, currentPage, setCurrentPage }) {
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  const fetchUnreadCount = async () => {
    if (!user?.id) return;
    try {
      const res = await client.get(`/notifications/count/${user.id}`);
      setUnreadCount(res.data.unread || 0);
    } catch (err) {
      // Silently fail — notification service may not be up yet
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [user]);

  const handleNav = (pageId) => {
    setCurrentPage(pageId);
    onClose();
    // Refresh count when navigating away from notifications
    if (pageId !== 'notifications') {
      fetchUnreadCount();
    }
  };

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="topbar-logo" />
          <span className="sidebar-brand">FinTwin</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
              onClick={() => handleNav(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
              {item.hasBadge && unreadCount > 0 && (
                <span style={{
                  background: 'var(--red)',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 700,
                  minWidth: 18,
                  height: 18,
                  borderRadius: 9,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 5px',
                  lineHeight: 1,
                }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.name || 'User'}</div>
            <div className="sidebar-user-email">{user?.email || ''}</div>
          </div>
          <button className="logout-btn" onClick={logout} aria-label="Logout" title="Logout">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </aside>
    </>
  );
}
