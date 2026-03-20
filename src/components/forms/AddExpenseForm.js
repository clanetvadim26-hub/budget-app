import React, { useState } from 'react';
import { format } from 'date-fns';
import { FIXED_CATEGORIES, VARIABLE_CATEGORIES } from '../../data/categories';

const defaultForm = {
  date: format(new Date(), 'yyyy-MM-dd'),
  category: '',
  description: '',
  amount: '',
};

export default function AddExpenseForm({ onAdd }) {
  const [form, setForm] = useState(defaultForm);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.category || !form.amount || Number(form.amount) <= 0) return;
    onAdd({
      id: Date.now().toString(),
      date: form.date,
      category: form.category,
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
        <span>➕</span> Add Expense
      </div>
      {success && <div className="form-success">Expense added successfully!</div>}
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
          <label>Category</label>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            required
          >
            <option value="">Select a category...</option>
            <optgroup label="Fixed / Non-Negotiable">
              {FIXED_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Variable">
              {VARIABLE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.label}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        <div className="form-group">
          <label>Description (optional)</label>
          <input
            type="text"
            placeholder="e.g. Whole Foods run"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <button type="submit" className="btn-primary">
          Add Expense
        </button>
      </form>

      <div className="recent-entries-note">
        Expense will be saved immediately to your browser.
      </div>
    </div>
  );
}
