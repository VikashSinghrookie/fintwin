import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import { showToast } from '../components/Toast';

export default function Portfolio() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editPrice, setEditPrice] = useState('');
  const [form, setForm] = useState({ ticker: '', company_name: '', quantity: '', buy_price: '', current_price: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    if (!user?.id) return;
    try {
      const [sumRes, holdRes] = await Promise.all([
        client.get(`/portfolio/summary/${user.id}`),
        client.get(`/portfolio/holdings/${user.id}`),
      ]);
      setSummary(sumRes.data);
      setHoldings(holdRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [user]);

  const formatCurrency = (v) => `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  const handleAddHolding = async (e) => {
    e.preventDefault();
    if (form.quantity <= 0 || form.buy_price <= 0 || form.current_price <= 0) {
      showToast('All values must be greater than 0');
      return;
    }
    setSubmitting(true);
    try {
      await client.post('/portfolio/holdings', {
        ticker: form.ticker.toUpperCase(),
        company_name: form.company_name,
        quantity: parseFloat(form.quantity),
        buy_price: parseFloat(form.buy_price),
        current_price: parseFloat(form.current_price),
      });
      showToast('Holding added');
      setForm({ ticker: '', company_name: '', quantity: '', buy_price: '', current_price: '' });
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to add holding');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePrice = async (id) => {
    if (!editPrice || parseFloat(editPrice) <= 0) {
      showToast('Price must be greater than 0');
      return;
    }
    try {
      await client.put(`/portfolio/holdings/${id}`, { current_price: parseFloat(editPrice) });
      showToast('Price updated');
      setEditingId(null);
      setEditPrice('');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to update');
    }
  };

  const handleRemove = async (holding) => {
    if (!confirm(`Remove ${holding.ticker} from your portfolio?`)) return;
    try {
      await client.delete(`/portfolio/holdings/${holding.id}`);
      showToast('Holding removed');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to remove');
    }
  };

  if (loading) {
    return (
      <div style={{ color: 'var(--text3)', textAlign: 'center', padding: 60 }}>
        Loading portfolio…
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Portfolio</h1>
      </div>

      {/* Summary Stats */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-label">Portfolio Value</div>
          <div className="stat-value blue">{summary ? formatCurrency(summary.total_portfolio_value) : '₹0'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Invested</div>
          <div className="stat-value" style={{ color: 'var(--text2)' }}>{summary ? formatCurrency(summary.total_invested) : '₹0'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Gain / Loss</div>
          <div className="stat-value" style={{ color: summary && summary.total_gain_loss >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {summary ? (summary.total_gain_loss >= 0 ? '+' : '') + formatCurrency(summary.total_gain_loss) : '₹0'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Return %</div>
          <div className="stat-value" style={{ color: summary && summary.total_return_pct >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {summary ? (summary.total_return_pct >= 0 ? '+' : '') + summary.total_return_pct.toFixed(1) + '%' : '0%'}
          </div>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <span className="card-title">Holdings ({holdings.length})</span>
        </div>
        {holdings.length === 0 ? (
          <div style={{ color: 'var(--text3)', fontSize: 13, padding: '30px 0', textAlign: 'center' }}>
            No holdings yet. Add your first stock below.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Ticker', 'Company', 'Qty', 'Buy Price', 'Current', 'Value', 'P&L', 'P&L%', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text2)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {holdings.map(h => (
                  <tr key={h.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px' }}>
                      <span style={{ background: 'var(--surface2)', padding: '3px 8px', borderRadius: 4, fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 600 }}>{h.ticker}</span>
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text)' }}>{h.company_name}</td>
                    <td style={{ padding: '12px' }}>{h.quantity}</td>
                    <td style={{ padding: '12px' }}>{formatCurrency(h.buy_price)}</td>
                    <td style={{ padding: '12px' }}>
                      {editingId === h.id ? (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <input
                            type="number"
                            className="form-input"
                            style={{ width: 100, padding: '4px 8px', fontSize: 12 }}
                            value={editPrice}
                            onChange={e => setEditPrice(e.target.value)}
                            autoFocus
                          />
                          <button className="btn btn-blue" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => handleUpdatePrice(h.id)}>Save</button>
                          <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => { setEditingId(null); setEditPrice(''); }}>✕</button>
                        </div>
                      ) : (
                        formatCurrency(h.current_price)
                      )}
                    </td>
                    <td style={{ padding: '12px', fontWeight: 600 }}>{formatCurrency(h.current_value)}</td>
                    <td style={{ padding: '12px', fontWeight: 600, color: h.gain_loss >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {h.gain_loss >= 0 ? '+' : ''}{formatCurrency(h.gain_loss)}
                    </td>
                    <td style={{ padding: '12px', fontWeight: 600, color: h.gain_loss_pct >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {h.gain_loss_pct >= 0 ? '▲' : '▼'} {Math.abs(h.gain_loss_pct).toFixed(1)}%
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-outline"
                          style={{ padding: '4px 10px', fontSize: 11 }}
                          onClick={() => { setEditingId(h.id); setEditPrice(String(h.current_price)); }}
                        >
                          Update Price
                        </button>
                        <button
                          className="btn btn-outline"
                          style={{ padding: '4px 10px', fontSize: 11, color: 'var(--red)', borderColor: 'var(--red)' }}
                          onClick={() => handleRemove(h)}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Holding Form */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Add Holding</span>
        </div>
        <form onSubmit={handleAddHolding}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Ticker Symbol</label>
              <input
                className="form-input"
                value={form.ticker}
                onChange={e => setForm({ ...form, ticker: e.target.value.toUpperCase() })}
                placeholder="e.g. RELIANCE"
                required
                style={{ textTransform: 'uppercase' }}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Company Name</label>
              <input
                className="form-input"
                value={form.company_name}
                onChange={e => setForm({ ...form, company_name: e.target.value })}
                placeholder="e.g. Reliance Industries"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Quantity</label>
              <input
                className="form-input"
                type="number"
                value={form.quantity}
                onChange={e => setForm({ ...form, quantity: e.target.value })}
                placeholder="0"
                min="0.01"
                step="any"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Buy Price per Share (₹)</label>
              <input
                className="form-input"
                type="number"
                value={form.buy_price}
                onChange={e => setForm({ ...form, buy_price: e.target.value })}
                placeholder="0"
                min="0.01"
                step="any"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Current Price per Share (₹)</label>
              <input
                className="form-input"
                type="number"
                value={form.current_price}
                onChange={e => setForm({ ...form, current_price: e.target.value })}
                placeholder="0"
                min="0.01"
                step="any"
                required
              />
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn btn-blue btn-full" type="submit" disabled={submitting}>
                {submitting ? 'Adding…' : 'Add to Portfolio'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
