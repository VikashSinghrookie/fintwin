import { useState, useEffect } from 'react';
import client from '../api/client';
import RiskBar from '../components/RiskBar';
import { showToast } from '../components/Toast';

export default function DigitalTwin() {
  const [accounts, setAccounts] = useState([]);
  const [accountId, setAccountId] = useState('');
  const [scenario, setScenario] = useState('withdrawal');
  const [amount, setAmount] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

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
    } catch (err) {
      showToast(err.response?.data?.detail || 'Simulation failed');
    } finally {
      setLoading(false);
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
    </div>
  );
}
