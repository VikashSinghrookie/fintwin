import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import { showToast } from '../components/Toast';

const typeConfig = {
  risk:  { color: 'var(--red)',   bg: 'var(--red-bg)',   icon: '⚠', label: 'Risk' },
  alert: { color: 'var(--amber)', bg: 'var(--amber-bg)', icon: '🔔', label: 'Alert' },
  info:  { color: 'var(--blue)',  bg: 'var(--blue-bg)',  icon: 'ℹ', label: 'Info' },
};

const tabs = [
  { id: null, label: 'All' },
  { id: 'risk', label: 'Risk' },
  { id: 'alert', label: 'Alert' },
  { id: 'info', label: 'Info' },
];

function timeAgo(dateStr) {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 172800) return 'yesterday';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async (typeFilter) => {
    if (!user?.id) return;
    try {
      let url = `/notifications/${user.id}`;
      if (typeFilter) url += `?type=${typeFilter}`;
      const res = await client.get(url);
      setNotifications(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotifications(activeTab); }, [user, activeTab]);

  const handleMarkRead = async (id) => {
    try {
      await client.put(`/notifications/read/${id}`);
      fetchNotifications(activeTab);
    } catch (err) {
      showToast('Failed to mark as read');
    }
  };

  const handleMarkAllRead = async () => {
    if (!user?.id) return;
    try {
      const res = await client.put(`/notifications/read-all/${user.id}`);
      showToast(`Marked ${res.data.count} notifications as read`);
      fetchNotifications(activeTab);
    } catch (err) {
      showToast('Failed to mark all as read');
    }
  };

  const handleDelete = async (id) => {
    try {
      await client.delete(`/notifications/${id}`);
      showToast('Notification deleted');
      fetchNotifications(activeTab);
    } catch (err) {
      showToast('Failed to delete');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Notifications</h1>
        <button className="btn btn-outline" onClick={handleMarkAllRead}>
          Mark all as read
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {tabs.map(tab => (
          <button
            key={tab.label}
            className="btn"
            style={{
              padding: '8px 18px',
              fontSize: 13,
              fontWeight: activeTab === tab.id ? 700 : 500,
              background: activeTab === tab.id ? 'var(--text)' : 'var(--surface)',
              color: activeTab === tab.id ? 'var(--bg)' : 'var(--text2)',
              border: activeTab === tab.id ? 'none' : '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="card">
        {loading ? (
          <div style={{ color: 'var(--text3)', textAlign: 'center', padding: 40, fontSize: 13 }}>
            Loading notifications…
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ color: 'var(--text3)', textAlign: 'center', padding: 50, fontSize: 13 }}>
            No notifications yet. They will appear here as you use the app.
          </div>
        ) : (
          <div>
            {notifications.map(n => {
              const cfg = typeConfig[n.type] || typeConfig.info;
              return (
                <div
                  key={n.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 14,
                    padding: '14px 0',
                    borderBottom: '1px solid var(--border)',
                    background: n.is_read ? 'transparent' : 'var(--surface2)',
                    margin: n.is_read ? 0 : '0 -20px',
                    padding: n.is_read ? '14px 0' : '14px 20px',
                    borderRadius: n.is_read ? 0 : 'var(--radius-sm)',
                  }}
                >
                  {/* Icon */}
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: cfg.bg,
                    color: cfg.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    flexShrink: 0,
                  }}>
                    {cfg.icon}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: n.is_read ? 500 : 700, fontSize: 13, color: 'var(--text)', marginBottom: 2 }}>
                      {n.title}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>
                      {n.message}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                      {timeAgo(n.created_at)}
                    </div>
                  </div>

                  {/* Right section */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span className={`badge ${n.type === 'risk' ? 'red' : n.type === 'alert' ? 'amber' : 'blue'}`}>
                      {cfg.label}
                    </span>
                    {!n.is_read && (
                      <button
                        className="btn btn-outline"
                        style={{ padding: '4px 10px', fontSize: 11 }}
                        onClick={() => handleMarkRead(n.id)}
                      >
                        Mark read
                      </button>
                    )}
                    <button
                      className="btn btn-outline"
                      style={{ padding: '4px 8px', fontSize: 11, color: 'var(--red)' }}
                      onClick={() => handleDelete(n.id)}
                      title="Delete"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
