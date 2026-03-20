import React, { useState } from 'react';
import { format } from 'date-fns';

const defaultForm = {
  date: format(new Date(), 'yyyy-MM-dd'),
  source: 'Vadim',
  description: '',
  amount: '',
};

export default function AddIncomeForm({ onAdd }) {
  const [form, setForm] = useState(defaultForm);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) return;
    onAdd({
      id: Date.now().toString(),
      date: form.date,
      source: form.source,
      description: form.description,
      amount: Number(form.amount),
    });
    setForm({ ...defaultForm, date: form.date });
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  };

  return (
    <div className="form-card">
      <div className="form-title">
        <span>💵</span> Add Income
      </div>
      {success && <div className="form-success">Income added successfully!</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Amount ($)</label>
            <input
              type="number"
              placeholder="0.00"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label>Income Source</label>
          <div className="source-buttons">
            {['Vadim', 'Jessica', 'Other'].map((src) => (
              <button
                key={src}
                type="button"
                className={`source-btn ${form.source === src ? 'active' : ''}`}
                onClick={() => setForm({ ...form, source: src })}
              >
                {src === 'Vadim' ? '👨' : src === 'Jessica' ? '👩' : '🌐'} {src}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Description (optional)</label>
          <input
            type="text"
            placeholder="e.g. Monthly salary, Freelance project"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <button type="submit" className="btn-primary">
          Add Income
        </button>
      </form>

      <div className="recent-entries-note">
        Income will be saved immediately to your browser.
      </div>
    </div>
  );
}
