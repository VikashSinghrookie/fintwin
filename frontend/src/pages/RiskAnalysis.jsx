import { useState, useEffect } from 'react';
import client from '../api/client';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import RiskBar from '../components/RiskBar';
import { showToast } from '../components/Toast';

export default function RiskAnalysis() {
  const [accounts, setAccounts] = useState([]);
  const [riskScores, setRiskScores] = useState({});
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchAccounts = async () => {
    try {
      const res = await client.get('/accounts/');
      setAccounts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRiskScores = async () => {
    const scores = {};
    const allFlags = [];
    for (const acc of accounts) {
      try {
        const res = await client.get(`/risk/score/${acc.id}`);
        scores[acc.id] = res.data;
        if (res.data.flags) {
          res.data.flags.forEach(f => {
            allFlags.push({ account: acc.name, accountId: acc.id, description: f, score: res.data.score });
          });
        }
      } catch {
        // No risk score yet for this account
      }
    }
    setRiskScores(scores);
    setFlags(allFlags);
  };

  useEffect(() => { fetchAccounts(); }, []);
  useEffect(() => { if (accounts.length > 0) fetchRiskScores(); }, [accounts]);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      for (const acc of accounts) {
        let txns = [];
        try {
          const txnRes = await client.get(`/transactions/account/${acc.id}`);
          txns = txnRes.data;
        } catch { /* no transactions */ }

        await client.post('/risk/analyze', {
          account_id: acc.id,
          current_balance: acc.balance,
          recent_transactions: txns,
        });
      }
      await fetchRiskScores();
      showToast('Risk analysis complete');
    } catch (err) {
      showToast('Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const getColor = (score) => {
    if (score > 60) return 'red';
    if (score > 30) return 'amber';
    return 'green';
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Risk Analysis</h1>
        <button className="btn btn-blue" onClick={runAnalysis} disabled={loading}>
          {loading ? 'Analyzing…' : 'Run Analysis'}
        </button>
      </div>

      <div className="three-col">
        {accounts.map(acc => {
          const risk = riskScores[acc.id];
          const score = risk?.score ?? 0;
          return (
            <div className="stat-card" key={acc.id}>
              <div className="stat-label">{acc.name}</div>
              <div className={`stat-value ${getColor(score)}`}>{score}</div>
              <div style={{ marginTop: 8, marginBottom: 4, fontSize: 11, color: 'var(--text3)' }}>
                {acc.id} · {risk?.alert_level || 'N/A'}
              </div>
              <RiskBar score={score} />
            </div>
          );
        })}
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Flagged Events</span>
          <Badge text={`${flags.length} flags`} variant={flags.length > 3 ? 'red' : flags.length > 0 ? 'amber' : 'green'} />
        </div>
        <div className="scroll-list">
          {flags.length === 0 && (
            <div style={{ color: 'var(--text3)', fontSize: 13, padding: 12 }}>
              No flags. Run analysis to check for risk events.
            </div>
          )}
          {flags.map((f, i) => (
            <div className="list-item" key={i}>
              <div className="list-item-left">
                <div className={`list-item-icon ${getColor(f.score)}-bg`}>⚠</div>
                <div>
                  <div className="list-item-title">{f.account}</div>
                  <div className="list-item-sub">{f.accountId}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, color: 'var(--text2)', maxWidth: 260 }}>{f.description}</span>
                <Badge
                  text={f.score > 60 ? 'High' : f.score > 30 ? 'Medium' : 'Low'}
                  variant={getColor(f.score)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
