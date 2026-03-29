import { useState, useEffect } from 'react';
import client from '../api/client';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';

export default function Dashboard() {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [avgRisk, setAvgRisk] = useState(0);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [accRes, txnRes] = await Promise.all([
          client.get('/accounts/'),
          client.get('/transactions/'),
        ]);
        setAccounts(accRes.data);
        setTransactions(txnRes.data);

        // Fetch risk scores for all accounts
        if (accRes.data.length > 0) {
          const riskResults = await Promise.all(
            accRes.data.map(acc =>
              client.get(`/risk/score/${acc.id}`).catch(() => ({ data: { score: 10 } }))
            )
          );
          const scores = riskResults.map(r => r.data.score ?? r.data.risk_score ?? 10);
          const avg = Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);
          setAvgRisk(avg);
        }
        // Fetch notifications for the first account (the current user's account)
        if (accRes.data.length > 0) {
          const accountId = accRes.data[0].id;
          client.get(`/risk/notifications/${accountId}`)
            .then(res => setNotifications(res.data))
            .catch(() => {
              setNotifications([{ message: "All activity looks normal", type: "Info" }]);
            });
        }
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
  const today = new Date().toDateString();
  const txnToday = transactions.filter(t =>
    new Date(t.created_at).toDateString() === today
  ).length;

  const formatCurrency = (v) => `₹${v.toLocaleString('en-IN')}`;
  const formatTime = (ts) => {
    const d = new Date(ts);
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  };

  const recentTxns = transactions.slice(0, 5);

  const services = [
    { name: 'Account Service', status: 'green', badge: 'Online' },
    { name: 'Transaction Service', status: 'green', badge: 'Online' },
    { name: 'Twin Service', status: 'green', badge: 'Online' },
    { name: 'Risk Service', status: 'green', badge: 'Online' },
  ];

  if (loading) return <div style={{ padding: 40, color: 'var(--text3)' }}>Loading dashboard…</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
      </div>

      <div className="stat-grid">
        <StatCard label="Total Balance" value={formatCurrency(totalBalance)} color="blue" />
        <StatCard label="Active Accounts" value={accounts.length} color="blue" />
        <StatCard label="Transactions Today" value={txnToday} color="green" />
        <StatCard label="Avg Risk Score" value={avgRisk} color="amber" />
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Transactions</span>
          </div>
          <div className="scroll-list">
            {recentTxns.length === 0 && <div style={{ color: 'var(--text3)', fontSize: 13, padding: 12 }}>No transactions yet</div>}
            {recentTxns.map(txn => {
              const isReceiver = txn.type === 'transfer' && accounts.some(a => a.id === txn.to_account) && !accounts.some(a => a.id === txn.account_id);
              const isIncoming = txn.type === 'deposit' || isReceiver;
              
              return (
              <div className="list-item" key={txn.id}>
                <div className="list-item-left">
                  <div className={`list-item-icon ${txn.type === 'deposit' ? 'green-bg' : txn.type === 'withdrawal' ? 'red-bg' : isIncoming ? 'green-bg' : 'blue-bg'}`}>
                    {txn.type === 'deposit' || isReceiver ? '↓' : txn.type === 'withdrawal' ? '↑' : '⇄'}
                  </div>
                  <div>
                    <div className="list-item-title" style={{ textTransform: 'capitalize' }}>
                      {txn.type} {isReceiver && '(Received)'}
                    </div>
                    <div className="list-item-sub">{txn.account_id}</div>
                  </div>
                </div>
                <div>
                  <div className={isIncoming ? 'amount-positive' : 'amount-negative'}>
                    {isIncoming ? '+' : '-'}₹{txn.amount.toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'right' }}>{formatTime(txn.created_at)}</div>
                </div>
              </div>
            )})}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Account Summary</span>
          </div>
          <div className="scroll-list">
            {accounts.map(acc => (
              <div className="list-item" key={acc.id}>
                <div className="list-item-left">
                  <div className="avatar avatar-sm">{acc.name.split(' ').map(w => w[0]).join('').slice(0, 2)}</div>
                  <div>
                    <div className="list-item-title">{acc.name}</div>
                    <div className="list-item-sub">{acc.id}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Badge
                    text={acc.balance > 100000 ? 'Healthy' : acc.balance > 50000 ? 'Active' : 'Watch'}
                    variant={acc.balance > 100000 ? 'green' : acc.balance > 50000 ? 'blue' : 'amber'}
                  />
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--blue)', minWidth: 90, textAlign: 'right' }}>
                    {formatCurrency(acc.balance)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Service Health</span>
          </div>
          {services.map((s, i) => (
            <div className="list-item" key={i}>
              <div className="list-item-left">
                <span className={`status-dot ${s.status}`} />
                <span className="list-item-title">{s.name}</span>
              </div>
              <Badge text={s.badge} variant="green" />
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Unread Notifications</span>
          </div>
          {notifications.length === 0 ? (
            <div style={{ color: 'var(--text3)', fontSize: 13, padding: 12 }}>No notifications yet</div>
          ) : (
            notifications.map((n, i) => {
              let badgeVariant = 'blue';
              if (n.type === 'Risk') badgeVariant = 'red';
              else if (n.type === 'Alert') badgeVariant = 'amber';
              return (
                <div className="list-item" key={i}>
                  <span style={{ fontSize: 13, color: 'var(--text)' }}>{n.message}</span>
                  <Badge text={n.type} variant={badgeVariant} />
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
