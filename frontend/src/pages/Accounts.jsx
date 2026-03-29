import { useState, useEffect } from 'react';
import client from '../api/client';
import RiskBar from '../components/RiskBar';
import Badge from '../components/Badge';
import { showToast } from '../components/Toast';

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [riskScores, setRiskScores] = useState({});
  const [name, setName] = useState('');
  const [type, setType] = useState('savings');
  const [balance, setBalance] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchAccounts = async () => {
    try {
      const res = await client.get('/accounts/');
      setAccounts(res.data);

      // Fetch risk scores for all accounts in parallel
      const riskResults = await Promise.all(
        res.data.map(acc =>
          client.get(`/risk/score/${acc.id}`)
            .then(r => ({ id: acc.id, score: r.data.score ?? r.data.risk_score ?? 10 }))
            .catch(() => ({ id: acc.id, score: 10 }))
        )
      );
      const scores = {};
      riskResults.forEach(r => { scores[r.id] = r.score; });
      setRiskScores(scores);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchAccounts(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await client.post('/accounts/', {
        name,
        email: `${name.toLowerCase().replace(/\s/g, '.')}@fintwin.com`,
        password: 'password123',
        type,
        balance: parseFloat(balance) || 0,
      });
      showToast('Account created successfully');
      setName('');
      setBalance('');
      fetchAccounts();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (v) => `₹${v.toLocaleString('en-IN')}`;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Accounts</h1>
        <Badge text={`${accounts.length} accounts`} variant="blue" />
      </div>

      <div className="three-col">
        {accounts.map(acc => (
          <div className="account-card" key={acc.id}>
            <div className="account-name">{acc.name}</div>
            <div className="account-meta">
              <span className="mono">{acc.id}</span>
              <Badge text={acc.type} variant={acc.type === 'savings' ? 'green' : acc.type === 'current' ? 'blue' : 'amber'} />
            </div>
            <div className="account-balance">{formatCurrency(acc.balance)}</div>
            <div style={{ marginBottom: 4, fontSize: 11, color: 'var(--text3)' }}>Risk Score</div>
            <RiskBar score={riskScores[acc.id] ?? 10} />
          </div>
        ))}
      </div>

      <div className="card" style={{ maxWidth: 520 }}>
        <div className="card-header">
          <span className="card-title">Create New Account</span>
        </div>
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Enter name" required />
          </div>
          <div className="form-group">
            <label className="form-label">Account Type</label>
            <select className="form-select" value={type} onChange={e => setType(e.target.value)}>
              <option value="savings">Savings</option>
              <option value="current">Current</option>
              <option value="portfolio">Portfolio</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Initial Deposit (₹)</label>
            <input className="form-input" type="number" value={balance} onChange={e => setBalance(e.target.value)} placeholder="0" min="0" />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Creating…' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
