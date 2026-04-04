import React, { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { FIXED_CATEGORIES, VARIABLE_CATEGORIES } from '../../data/categories';
import { useLocalStorage } from '../../hooks/useLocalStorage';

const defaultForm = {
  date: format(new Date(), 'yyyy-MM-dd'),
  category: '',
  description: '',
  amount: '',
};

function normalizeBudgetName(name) {
  return (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

export default function AddExpenseForm({ onAdd }) {
  const [form, setForm] = useState(defaultForm);
  const [success, setSuccess] = useState(false);
  const [expenses] = useLocalStorage('budget_expenses', []);
  const [recurringExpenses] = useLocalStorage('budget_recurring_expenses', []);

  const now = new Date();
  const mStart = startOfMonth(now);
  const mEnd   = endOfMonth(now);

  // Find budget for selected category
  const budgetInfo = useMemo(() => {
    if (!form.category) return null;
    const budgets = (recurringExpenses || []).filter(e => e.metadata?.isBudget && e.active);
    const match = budgets.find(b => normalizeBudgetName(b.name) === form.category || normalizeBudgetName(b.name) === normalizeBudgetName(form.category));
    if (!match) return null;
    const monthlyBudget = Number(match.amount) || 0;
    const spent = (expenses || [])
      .filter(e => {
        const d = new Date(e.date);
        return d >= mStart && d <= mEnd && (e.category === form.category || normalizeBudgetName(e.category) === form.category);
      })
      .reduce((s, e) => s + Number(e.amount), 0);
    return { name: match.name, monthly: monthlyBudget, spent };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.category, expenses, recurringExpenses]);

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

        {budgetInfo && (() => {
          const remaining = budgetInfo.monthly - budgetInfo.spent;
          const enteredAmt = Number(form.amount) || 0;
          const wouldBeOver = enteredAmt > 0 && budgetInfo.spent + enteredAmt > budgetInfo.monthly;
          const overBy = budgetInfo.spent + enteredAmt - budgetInfo.monthly;
          return (
            <div style={{
              margin: '-4px 0 12px',
              padding: '8px 12px',
              background: remaining < 0 ? 'rgba(248,113,113,0.08)' : 'rgba(74,222,128,0.06)',
              border: `1px solid ${remaining < 0 ? 'rgba(248,113,113,0.25)' : 'rgba(74,222,128,0.15)'}`,
              borderRadius: 8,
              fontSize: 12,
            }}>
              <span style={{ color: remaining < 0 ? '#F87171' : '#4ADE80' }}>
                {budgetInfo.name}: {remaining >= 0 ? `$${remaining.toFixed(2)} remaining` : `$${Math.abs(remaining).toFixed(2)} over budget`} of ${budgetInfo.monthly.toFixed(2)} this month
              </span>
              {wouldBeOver && (
                <div style={{ color: '#FBBF24', marginTop: 4 }}>
                  ⚠ This puts {budgetInfo.name} ${overBy.toFixed(2)} over budget
                </div>
              )}
            </div>
          );
        })()}

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
