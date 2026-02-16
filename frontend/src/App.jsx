import React, { useState, useCallback, useEffect } from 'react';

// No .env needed: uses '/api' (proxied to backend locally, same-origin on Vercel)
const API_BASE = import.meta.env.VITE_API_URL || '/api';

const CATEGORIES = [
  'Food',
  'Transport',
  'Shopping',
  'Bills',
  'Health',
  'Entertainment',
  'Other',
];

function formatRupees(n) {
  const num = Number(n);
  if (Number.isNaN(num)) return '₹0';
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function App() {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(todayISO());
  const [submitState, setSubmitState] = useState('idle'); // idle | submitting | success | error
  const [submitError, setSubmitError] = useState('');
  const [list, setList] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [sortOrder, setSortOrder] = useState('date_desc');
  const [idempotencyKey, setIdempotencyKey] = useState(null);

  const fetchExpenses = useCallback(async () => {
    setListLoading(true);
    setListError('');
    try {
      const params = new URLSearchParams();
      if (filterCategory) params.set('category', filterCategory);
      params.set('sort', sortOrder);
      const res = await fetch(`${API_BASE}/expenses?${params}`);
      if (!res.ok) throw new Error('Failed to load expenses');
      const data = await res.json();
      setList(Array.isArray(data) ? data : []);
    } catch (err) {
      setListError(err.message || 'Failed to load expenses');
      setList([]);
    } finally {
      setListLoading(false);
    }
  }, [filterCategory, sortOrder]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (Number.isNaN(amt) || amt < 0) {
      setSubmitError('Amount must be a non-negative number');
      setSubmitState('error');
      return;
    }
    if (!date.trim()) {
      setSubmitError('Date is required');
      setSubmitState('error');
      return;
    }

    const key = idempotencyKey || crypto.randomUUID();
    if (!idempotencyKey) setIdempotencyKey(key);

    setSubmitState('submitting');
    setSubmitError('');
    try {
      const res = await fetch(`${API_BASE}/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': key,
        },
        body: JSON.stringify({
          amount: amt,
          category: category.trim() || CATEGORIES[0],
          description: (description || '').trim(),
          date: date.trim(),
        }),
      });
      let data = {};
      try {
        data = await res.json();
      } catch (_) {
        /* non-JSON response (e.g. 502) */
      }
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create expense');
      }
      setSubmitState('success');
      setAmount('');
      setDescription('');
      setDate(todayISO());
      setIdempotencyKey(null);
      await fetchExpenses();
    } catch (err) {
      setSubmitError(err.message || 'Failed to save expense');
      setSubmitState('error');
    }
  };

  const total = list.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  return (
    <div className="app">
      <h1>Expense Tracker</h1>

      <section className="form-section">
        <h2>Add expense</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-row">
              <label htmlFor="amount">Amount (₹)</label>
              <input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div className="form-row">
              <label htmlFor="category">Category</label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="form-row full-width">
              <label htmlFor="description">Description</label>
              <input
                id="description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional note"
              />
            </div>
            <div className="form-row">
              <label htmlFor="date">Date</label>
              <input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>
          {submitState === 'error' && submitError && (
            <div className="error-msg">{submitError}</div>
          )}
          <div className="form-actions">
            <button
              type="submit"
              className="btn"
              disabled={submitState === 'submitting'}
            >
              {submitState === 'submitting' ? 'Saving…' : 'Add expense'}
            </button>
          </div>
        </form>
      </section>

      <section className="list-section">
        <h2>Expenses</h2>
        <div className="controls">
          <label htmlFor="filter">Category:</label>
          <select
            id="filter"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="">All</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <label htmlFor="sort">Sort:</label>
          <select
            id="sort"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="date_desc">Newest first</option>
          </select>
        </div>
        <div className="total">
          Total: <span>{formatRupees(total)}</span>
        </div>
        {listError && <div className="error-msg">{listError}</div>}
        {listLoading ? (
          <div className="loading">Loading…</div>
        ) : (
          <div className="table-wrap">
            {list.length === 0 ? (
              <div className="empty">No expenses yet. Add one above.</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((exp) => (
                    <tr key={exp.id}>
                      <td>{exp.date}</td>
                      <td>{exp.category}</td>
                      <td>{exp.description || '—'}</td>
                      <td className="amount">{formatRupees(exp.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
