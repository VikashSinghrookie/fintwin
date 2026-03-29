import { useState, useEffect } from 'react';
import client from '../api/client';
import { showToast } from '../components/Toast';

export default function Transactions() {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [accountId, setAccountId] = useState('');
  const [type, setType] = useState('deposit');
  const [amount, setAmount] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    try {
      const [accRes, txnRes] = await Promise.all([
        client.get('/accounts/'),
        client.get('/transactions/'),
      ]);
      setAccounts(accRes.data);
      setTransactions(txnRes.data);
      if (accRes.data.length > 0 && !accountId) {
        setAccountId(accRes.data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        account_id: accountId,
        type,
        amount: parseFloat(amount),
        note: note || null,
      };
      if (type === 'transfer') payload.to_account = toAccount;
      await client.post('/transactions/', payload);
      showToast('Transaction recorded');
      setAmount('');
      setNote('');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (v) => `₹${v.toLocaleString('en-IN')}`;
  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Transactions</h1>
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-header">
            <span className="card-title">New Transaction</span>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Account</label>
              <select className="form-select" value={accountId} onChange={e => setAccountId(e.target.value)}>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.id})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-select" value={type} onChange={e => setType(e.target.value)}>
                <option value="deposit">Deposit</option>
                <option value="withdrawal">Withdrawal</option>
                <option value="transfer">Transfer</option>
              </select>
            </div>
            {type === 'transfer' && (
              <div className="form-group">
                <label className="form-label">Destination Account ID</label>
                <input className="form-input" value={toAccount} onChange={e => setToAccount(e.target.value)} placeholder="Enter destination account ID" required />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Amount (₹)</label>
              <input className="form-input" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" min="1" required />
            </div>
            <div className="form-group">
              <label className="form-label">Note (optional)</label>
              <input className="form-input" value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note" />
            </div>
            <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
              {loading ? 'Processing…' : 'Submit Transaction'}
            </button>
          </form>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Transaction History</span>
          </div>
          <div className="scroll-list">
            {transactions.length === 0 && (
              <div style={{ color: 'var(--text3)', fontSize: 13, padding: 12 }}>No transactions yet</div>
            )}
            {transactions.map(txn => {
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
                    <div className="list-item-sub">{txn.account_id}{txn.to_account ? ` → ${txn.to_account}` : ''}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className={isIncoming ? 'amount-positive' : 'amount-negative'}>
                    {isIncoming ? '+' : '-'}{formatCurrency(txn.amount)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{formatTime(txn.created_at)}</div>
                </div>
              </div>
            )})}
          </div>
        </div>
      </div>
    </div>
  );
}
