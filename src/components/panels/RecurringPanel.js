import React, { useState } from 'react';
import { useConfirm } from '../ConfirmModal';
import { format } from 'date-fns';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { FIXED_CATEGORIES, VARIABLE_CATEGORIES } from '../../data/categories';
import { getCategoryById } from '../../data/categories';
import { formatCurrency, formatCurrencyFull } from '../../utils/calculations';
import { monthlyProjection, monthlyFixedCost, getRecurringDates } from '../../utils/recurringDates';

const ACCOUNT_OPTIONS = [
  'Capital One Checking (Vadim)',
  'Capital One Joint Savings (Joint)',
  'Wells Fargo Checking (Jessica)',
  'Other',
];

const FREQ_LABELS = { 'bi-weekly': 'Bi-Weekly', weekly: 'Weekly', monthly: 'Monthly' };

function RecurringIncomeForm({ onSave, onCancel, initial }) {
  const [form, setForm] = useState(
    initial || { name: '', person: 'Vadim', amount: '', frequency: 'bi-weekly', startDate: format(new Date(), 'yyyy-MM-dd'), account: ACCOUNT_OPTIONS[0] }
  );
  const f = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="recurring-form">
      <div className="form-row">
        <div className="form-group">
          <label>Name / Label</label>
          <input placeholder="e.g. Monthly Salary" value={form.name} onChange={(e) => f('name', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Amount ($)</label>
          <input type="number" min="0" step="0.01" placeholder="0.00" value={form.amount} onChange={(e) => f('amount', e.target.value)} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Person</label>
          <div className="source-buttons">
            {['Vadim', 'Jessica'].map((p) => (
              <button key={p} type="button" className={`source-btn ${form.person === p ? 'active' : ''}`} onClick={() => f('person', p)}>
                {p === 'Vadim' ? '👨' : '👩'} {p}
              </button>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label>Frequency</label>
          <select value={form.frequency} onChange={(e) => f('frequency', e.target.value)}>
            <option value="bi-weekly">Bi-Weekly (every 2 weeks)</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>First Pay Date</label>
          <input type="date" value={form.startDate} onChange={(e) => f('startDate', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Deposits To</label>
          <select value={form.account} onChange={(e) => f('account', e.target.value)}>
            {ACCOUNT_OPTIONS.map((a) => <option key={a}>{a}</option>)}
          </select>
        </div>
      </div>
      <div className="form-actions">
        <button className="btn-primary" onClick={() => form.name && form.amount && onSave({ ...form, amount: Number(form.amount) })}>
          {initial ? 'Update' : 'Add Recurring Income'}
        </button>
        <button className="btn-cancel-lg" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function RecurringExpenseForm({ onSave, onCancel, initial }) {
  const [form, setForm] = useState(
    initial || { name: '', category: '', amount: '', frequency: 'monthly', startDate: format(new Date(), 'yyyy-MM-dd') }
  );
  const f = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="recurring-form">
      <div className="form-row">
        <div className="form-group">
          <label>Name</label>
          <input placeholder="e.g. Netflix, Gym" value={form.name} onChange={(e) => f('name', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Amount ($)</label>
          <input type="number" min="0" step="0.01" placeholder="0.00" value={form.amount} onChange={(e) => f('amount', e.target.value)} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Category</label>
          <select value={form.category} onChange={(e) => f('category', e.target.value)}>
            <option value="">Select...</option>
            <optgroup label="Fixed">
              {FIXED_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
            </optgroup>
            <optgroup label="Variable">
              {VARIABLE_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
            </optgroup>
          </select>
        </div>
        <div className="form-group">
          <label>Frequency</label>
          <select value={form.frequency} onChange={(e) => f('frequency', e.target.value)}>
            <option value="monthly">Monthly</option>
            <option value="bi-weekly">Bi-Weekly</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
      </div>
      <div className="form-group">
        <label>Start / Next Due Date</label>
        <input type="date" value={form.startDate} onChange={(e) => f('startDate', e.target.value)} />
      </div>
      <div className="form-actions">
        <button className="btn-primary" onClick={() => form.name && form.amount && form.category && onSave({ ...form, amount: Number(form.amount) })}>
          {initial ? 'Update' : 'Add Recurring Expense'}
        </button>
        <button className="btn-cancel-lg" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function NextDates({ startDate, frequency }) {
  const dates = getRecurringDates(startDate, frequency, new Date(new Date().getFullYear(), new Date().getMonth() + 3, 1))
    .filter((d) => d >= new Date())
    .slice(0, 4);
  return (
    <div className="next-dates">
      <span className="next-dates-label">Next: </span>
      {dates.map((d) => (
        <span key={d.toISOString()} className="next-date-chip">{format(d, 'MMM d')}</span>
      ))}
    </div>
  );
}

export default function RecurringPanel() {
  const [recurringIncomes, setRecurringIncomes] = useLocalStorage('budget_recurring_incomes', []);
  const [recurringExpenses, setRecurringExpenses] = useLocalStorage('budget_recurring_expenses', []);

  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingIncome, setEditingIncome] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);

  const saveIncome = (data) => {
    if (editingIncome) {
      setRecurringIncomes((p) => p.map((i) => (i.id === editingIncome.id ? { ...i, ...data } : i)));
      setEditingIncome(null);
    } else {
      setRecurringIncomes((p) => [...p, { ...data, id: Date.now().toString(), active: true }]);
      setShowIncomeForm(false);
    }
  };

  const saveExpense = (data) => {
    if (editingExpense) {
      setRecurringExpenses((p) => p.map((e) => (e.id === editingExpense.id ? { ...e, ...data } : e)));
      setEditingExpense(null);
    } else {
      setRecurringExpenses((p) => [...p, { ...data, id: Date.now().toString(), active: true }]);
      setShowExpenseForm(false);
    }
  };

  const confirm = useConfirm();

  const toggleIncome = (id) =>
    setRecurringIncomes((p) => p.map((i) => (i.id === id ? { ...i, active: !i.active } : i)));
  const deleteIncome = async (id, name) => {
    const ok = await confirm(name);
    if (ok) setRecurringIncomes((p) => p.filter((i) => i.id !== id));
  };
  const toggleExpense = (id) =>
    setRecurringExpenses((p) => p.map((e) => (e.id === id ? { ...e, active: !e.active } : e)));
  const deleteExpense = async (id, name) => {
    const ok = await confirm(name);
    if (ok) setRecurringExpenses((p) => p.filter((e) => e.id !== id));
  };

  const projectedMonthlyIncome = monthlyProjection(recurringIncomes);
  const projectedMonthlyExpenses = monthlyFixedCost(recurringExpenses);

  return (
    <div>
      {/* Budget Projection Summary */}
      <div className="panel">
        <div className="panel-header"><h2>Monthly Budget Projection</h2></div>
        <div className="projection-grid">
          <div className="projection-card income-card">
            <div className="proj-label">Projected Monthly Income</div>
            <div className="proj-amount positive">{formatCurrency(projectedMonthlyIncome)}</div>
            <div className="proj-note">From {recurringIncomes.filter((i) => i.active).length} recurring income source(s)</div>
          </div>
          <div className="projection-card expense-card">
            <div className="proj-label">Projected Fixed Expenses</div>
            <div className="proj-amount negative">{formatCurrency(projectedMonthlyExpenses)}</div>
            <div className="proj-note">From {recurringExpenses.filter((e) => e.active).length} recurring expense(s)</div>
          </div>
          <div className="projection-card net-card">
            <div className="proj-label">Projected Net (before variable)</div>
            <div className={`proj-amount ${projectedMonthlyIncome - projectedMonthlyExpenses >= 0 ? 'positive' : 'negative'}`}>
              {formatCurrency(projectedMonthlyIncome - projectedMonthlyExpenses)}
            </div>
            <div className="proj-note">Remaining after fixed costs</div>
          </div>
        </div>
      </div>

      {/* Recurring Income */}
      <div className="panel">
        <div className="panel-header">
          <h2>Recurring Income</h2>
          <button className="btn-add-small" onClick={() => { setShowIncomeForm(true); setEditingIncome(null); }}>+ Add</button>
        </div>

        {(showIncomeForm && !editingIncome) && (
          <RecurringIncomeForm onSave={saveIncome} onCancel={() => setShowIncomeForm(false)} />
        )}

        <div className="recurring-list">
          {recurringIncomes.length === 0 && !showIncomeForm && (
            <div className="empty-state">No recurring income set up yet. Add your salary to get started.</div>
          )}
          {recurringIncomes.map((inc) => (
            <div key={inc.id} className={`recurring-item ${!inc.active ? 'inactive' : ''}`}>
              {editingIncome?.id === inc.id ? (
                <RecurringIncomeForm initial={inc} onSave={saveIncome} onCancel={() => setEditingIncome(null)} />
              ) : (
                <>
                  <div className="recurring-item-main">
                    <span className="recurring-who" style={{ color: inc.person === 'Vadim' ? '#60A5FA' : '#F472B6' }}>
                      {inc.person === 'Vadim' ? '👨' : '👩'} {inc.person}
                    </span>
                    <div className="recurring-info">
                      <div className="recurring-name">{inc.name}</div>
                      <div className="recurring-meta">
                        <span className="freq-badge">{FREQ_LABELS[inc.frequency]}</span>
                        <span className="recurring-account">→ {inc.account}</span>
                      </div>
                      <NextDates startDate={inc.startDate} frequency={inc.frequency} />
                    </div>
                    <div className="recurring-amount">{formatCurrencyFull(inc.amount)}<span className="per-period">/{inc.frequency === 'monthly' ? 'mo' : inc.frequency === 'weekly' ? 'wk' : '2wk'}</span></div>
                  </div>
                  <div className="recurring-actions">
                    <button className={`btn-toggle ${inc.active ? '' : 'off'}`} onClick={() => toggleIncome(inc.id)}>
                      {inc.active ? 'Active' : 'Paused'}
                    </button>
                    <button className="btn-icon" onClick={() => { setEditingIncome(inc); setShowIncomeForm(false); }}>✏️</button>
                    <button className="btn-icon danger" onClick={() => deleteIncome(inc.id, inc.name)}>🗑️</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recurring Expenses */}
      <div className="panel">
        <div className="panel-header">
          <h2>Recurring Expenses</h2>
          <button className="btn-add-small" onClick={() => { setShowExpenseForm(true); setEditingExpense(null); }}>+ Add</button>
        </div>

        {(showExpenseForm && !editingExpense) && (
          <RecurringExpenseForm onSave={saveExpense} onCancel={() => setShowExpenseForm(false)} />
        )}

        <div className="recurring-list">
          {recurringExpenses.length === 0 && !showExpenseForm && (
            <div className="empty-state">No recurring expenses yet. Add fixed bills like rent, utilities, subscriptions.</div>
          )}
          {recurringExpenses.map((exp) => {
            const cat = getCategoryById(exp.category);
            return (
              <div key={exp.id} className={`recurring-item ${!exp.active ? 'inactive' : ''}`}>
                {editingExpense?.id === exp.id ? (
                  <RecurringExpenseForm initial={exp} onSave={saveExpense} onCancel={() => setEditingExpense(null)} />
                ) : (
                  <>
                    <div className="recurring-item-main">
                      <span className="recurring-cat-icon">{cat.icon}</span>
                      <div className="recurring-info">
                        <div className="recurring-name">{exp.name}</div>
                        <div className="recurring-meta">
                          <span className="freq-badge">{FREQ_LABELS[exp.frequency]}</span>
                          <span className="recurring-account">{cat.label}</span>
                        </div>
                        <NextDates startDate={exp.startDate} frequency={exp.frequency} />
                      </div>
                      <div className="recurring-amount">{formatCurrencyFull(exp.amount)}<span className="per-period">/{exp.frequency === 'monthly' ? 'mo' : exp.frequency === 'weekly' ? 'wk' : '2wk'}</span></div>
                    </div>
                    <div className="recurring-actions">
                      <button className={`btn-toggle ${exp.active ? '' : 'off'}`} onClick={() => toggleExpense(exp.id)}>
                        {exp.active ? 'Active' : 'Paused'}
                      </button>
                      <button className="btn-icon" onClick={() => { setEditingExpense(exp); setShowExpenseForm(false); }}>✏️</button>
                      <button className="btn-icon danger" onClick={() => deleteExpense(exp.id, exp.name)}>🗑️</button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
