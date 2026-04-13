import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import RiskBar from '../components/RiskBar';
import { showToast } from '../components/Toast';

export default function DigitalTwin() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [accountId, setAccountId] = useState('');
  const [scenario, setScenario] = useState('withdrawal');
  const [amount, setAmount] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await client.get('/accounts/');
        setAccounts(res.data);
        if (res.data.length > 0) setAccountId(res.data[0].id);
      } catch (err) {
        console.error(err);
      }
    };
    fetchAccounts();
  }, []);

  const fetchHistory = async () => {
    if (!user?.id) return;
    try {
      const res = await client.get(`/simulate/history/${user.id}`);
      setHistory(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => { fetchHistory(); }, [user]);

  const handleSimulate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await client.post('/simulate/', {
        account_id: accountId,
        scenario,
        amount: parseFloat(amount),
      });
      setResult(res.data);
      showToast('Simulation complete');
      fetchHistory(); // Refresh history after simulation
    } catch (err) {
      showToast(err.response?.data?.detail || 'Simulation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!user?.id) return;
    if (!confirm('Are you sure you want to clear all simulation history?')) return;
    try {
      await client.delete(`/simulate/history/${user.id}`);
      showToast('Simulation history cleared');
      fetchHistory();
    } catch (err) {
      showToast('Failed to clear history');
    }
  };

  const handleDeleteSimulation = async (id) => {
    try {
      await client.delete(`/simulate/history/detail/${id}`);
      showToast('Simulation deleted');
      fetchHistory();
    } catch (err) {
      showToast('Failed to delete simulation');
    }
  };

  const formatCurrency = (v) => `₹${v.toLocaleString('en-IN')}`;
  const selectedAccount = accounts.find(a => a.id === accountId);
  const amountLabel = scenario === 'rate_change' ? 'Rate Change (%)' : 'Amount (₹)';

  const scenarioLabels = {
    withdrawal: 'Large Withdrawal',
    deposit: 'Large Deposit',
    rate_change: 'Interest Rate Change',
  };

  const formatTime = (ts) => {
    if (!ts) return '—';
    const d = new Date(ts);
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Digital Twin</h1>
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Configure Simulation</span>
          </div>
          <form onSubmit={handleSimulate}>
            <div className="form-group">
              <label className="form-label">Account</label>
              <select className="form-select" value={accountId} onChange={e => setAccountId(e.target.value)}>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} — {formatCurrency(a.balance)}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Scenario</label>
              <select className="form-select" value={scenario} onChange={e => setScenario(e.target.value)}>
                <option value="withdrawal">Large Withdrawal</option>
                <option value="deposit">Large Deposit</option>
                <option value="rate_change">Interest Rate Change</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{amountLabel}</label>
              <input
                className="form-input"
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0"
                required
              />
            </div>
            <button className="btn btn-blue btn-full" type="submit" disabled={loading}>
              {loading ? 'Running…' : 'Run Simulation'}
            </button>
          </form>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Simulation Result</span>
          </div>
          {!result ? (
            <div style={{ color: 'var(--text3)', fontSize: 13, padding: '40px 0', textAlign: 'center' }}>
              Configure and run a simulation to see results
            </div>
          ) : (
            <div className="sim-result">
              <div className="sim-balance-row">
                <div className="sim-balance-box before">
                  <div className="sim-balance-label">Current Balance</div>
                  <div className="sim-balance-value">{formatCurrency(result.current_balance)}</div>
                </div>
                <div className="sim-arrow">→</div>
                <div className="sim-balance-box after">
                  <div className="sim-balance-label">Virtual Balance</div>
                  <div className="sim-balance-value">{formatCurrency(result.virtual_balance)}</div>
                </div>
              </div>

              <div className="sim-risk-label">Risk Score: {result.risk_score}/100</div>
              <RiskBar score={result.risk_score} />

              {result.flags.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  {result.flags.map((f, i) => (
                    <div key={i} style={{ fontSize: 12, color: 'var(--red)', marginBottom: 4 }}>⚠ {f}</div>
                  ))}
                </div>
              )}

              <div className={`sim-alert ${result.alert_level}`}>
                {result.recommendation}
              </div>

              <div className="sim-note">
                Simulation ran on virtual twin. Real data unchanged.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Simulation History */}
      <div className="card" style={{ marginTop: 4 }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="card-title">Simulation History</span>
          {history.length > 0 && (
            <button className="btn btn-outline" style={{ fontSize: 12, padding: '4px 10px', color: 'var(--red)', borderColor: 'var(--red)' }} onClick={handleClearHistory}>
              Clear All
            </button>
          )}
        </div>
        {historyLoading ? (
          <div style={{ color: 'var(--text3)', fontSize: 13, padding: 20, textAlign: 'center' }}>Loading…</div>
        ) : history.length === 0 ? (
          <div style={{ color: 'var(--text3)', fontSize: 13, padding: '30px 0', textAlign: 'center' }}>
            No simulations yet. Run your first one above.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Date', 'Scenario', 'Amount', 'Before', 'After', 'Risk Score', 'Alert', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text2)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map(sim => (
                  <tr key={sim.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px', color: 'var(--text3)', fontSize: 12 }}>{formatTime(sim.created_at)}</td>
                    <td style={{ padding: '10px 12px', textTransform: 'capitalize' }}>{sim.scenario.replace('_', ' ')}</td>
                    <td style={{ padding: '10px 12px' }}>{formatCurrency(sim.amount)}</td>
                    <td style={{ padding: '10px 12px' }}>{formatCurrency(sim.before_balance)}</td>
                    <td style={{ padding: '10px 12px' }}>{formatCurrency(sim.after_balance)}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{sim.risk_score}/100</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className={`badge ${sim.alert_level === 'low' ? 'green' : sim.alert_level === 'medium' ? 'amber' : 'red'}`}>
                        {sim.alert_level}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <button className="btn btn-outline" style={{ padding: '2px 6px', fontSize: 11, color: 'var(--red)' }} onClick={() => handleDeleteSimulation(sim.id)}>
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
