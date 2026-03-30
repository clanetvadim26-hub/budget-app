import React, { useState, useMemo } from 'react';
import { addMonths, format, differenceInDays, parseISO } from 'date-fns';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { DEFAULT_ACCOUNTS } from '../../data/accounts';
import { DEFAULT_RECURRING_EXPENSES } from '../../data/defaultRecurring';
import { DEFAULT_BUDGET_SETTINGS } from '../../data/defaultBudgetSettings';
import { formatCurrencyFull } from '../../utils/calculations';
import { getCategoryById } from '../../data/categories';
import InlineEdit from '../InlineEdit';

// ── Static fallback lists (used when budget_settings JSON keys are absent) ───
const VADIM_SAVINGS_DEFAULT = [
  { key: 'vadim_savings_cap1_monthly',          accountId: 'cap1_joint_savings',       label: 'Capital One Joint Savings (Emergency Fund)', targetGoal: 20000 },
  { key: 'vadim_savings_roth_monthly',          accountId: 'roth_ira_vadim',           label: 'Vadim Roth IRA 2025',                         targetGoal: 7000, deadline: '2026-04-15' },
  { key: 'vadim_savings_brokerage_monthly',     accountId: 'brokerage_joint',          label: 'Ameriprise Joint Brokerage',                  targetGoal: 0 },
  { key: 'vadim_savings_ameriprise_monthly',    accountId: 'ameriprise_savings_vadim', label: 'Ameriprise Savings (Vacation & Fun)',          targetGoal: 5000 },
  { key: 'vadim_savings_401k_monthly',          accountId: '401k_vadim',               label: 'Vadim 401k (starts June 2026)',               targetGoal: 0, startDate: '2026-06-01' },
];

const JESSICA_SAVINGS_DEFAULT = [
  { key: 'jessica_savings_roth_monthly',    accountId: 'roth_ira_jessica',   label: 'Jessica Roth IRA 2025',          targetGoal: 7000, deadline: '2026-04-15' },
  { key: 'jessica_savings_cap1_monthly',    accountId: 'cap1_joint_savings', label: 'Capital One Joint Savings',      targetGoal: 0 },
];

const JESSICA_ALLOCS_DEFAULT = [
  { key: 'jessica_alloc_household', label: '🏠 Household contribution',   color: '#60A5FA' },
  { key: 'jessica_alloc_savings',   label: '💰 Capital One Joint Savings', color: '#4ADE80' },
  { key: 'jessica_alloc_roth',      label: '📈 Jessica Roth IRA',          color: '#D4AF37' },
  { key: 'jessica_alloc_personal',  label: '👩 Personal spending',          color: '#F472B6' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function tryParseDate(str) {
  if (!str) return null;
  // ISO: YYYY-MM-DD
  let d = parseISO(str);
  if (!isNaN(d.getTime())) return d;
  // MM/DD/YYYY or MM/DD/YY
  const parts = str.split('/');
  if (parts.length === 3) {
    const [m, day, y] = parts;
    const year = y.length === 2 ? `20${y}` : y;
    d = new Date(`${year}-${m.padStart(2,'0')}-${day.padStart(2,'0')}`);
    if (!isNaN(d.getTime())) return d;
  }
  // Anything Date can parse
  d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

/** "in X days (MM/DD/YY)" — handles ISO and MM/DD/YYYY inputs */
function formatPayday(dateStr) {
  if (!dateStr) return '—';
  try {
    const date = tryParseDate(dateStr);
    if (!date) return dateStr;
    const days = differenceInDays(date, new Date());
    const formatted = format(date, 'MM/dd/yy');
    if (days < 0)   return `Overdue (${formatted})`;
    if (days === 0)  return `Today! (${formatted})`;
    if (days === 1)  return `Tomorrow (${formatted})`;
    return `in ${days} days (${formatted})`;
  } catch { return dateStr; }
}

function projectedDateLabel(balance, target, monthly) {
  if (!monthly || monthly <= 0) return 'Set contribution to project';
  const gap = target - balance;
  if (gap <= 0) return 'Goal reached!';
  const months = Math.ceil(gap / monthly);
  return `Goal in ~${months}mo (${format(addMonths(new Date(), months), 'MMM yyyy')})`;
}

function parseJson(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

// ── Shared UI pieces ─────────────────────────────────────────────────────────
function SectionHeader({ title, icon, total, totalColor }) {
  return (
    <div className="fbp-section-header">
      <span className="fbp-section-icon">{icon}</span>
      <span className="fbp-section-title">{title}</span>
      {total != null && (
        <span className="fbp-section-total" style={{ color: totalColor }}>
          {formatCurrencyFull(total)}/mo
        </span>
      )}
    </div>
  );
}

function SummaryBar({ income, fixed, variable, savings }) {
  const disc = Math.max(0, income - fixed - variable - savings);
  const total = income || 1;
  const segs = [
    { label: 'Fixed',         value: fixed,    color: '#F87171' },
    { label: 'Variable',      value: variable, color: '#FBBF24' },
    { label: 'Savings',       value: savings,  color: '#4ADE80' },
    { label: 'Discretionary', value: disc,     color: '#A78BFA' },
  ];
  const savingsRate = income > 0 ? ((savings / income) * 100).toFixed(1) : '0.0';
  const srColor = savingsRate >= 20 ? '#4ADE80' : savingsRate >= 10 ? '#FBBF24' : '#F87171';
  return (
    <div className="fbp-summary">
      <div className="fbp-summary-title">Monthly Summary</div>
      <div className="fbp-summary-grid">
        <div className="fbp-summary-row"><span>Total Income</span><span className="fbp-summary-val positive">{formatCurrencyFull(income)}</span></div>
        <div className="fbp-summary-row"><span>Fixed Expenses</span><span className="fbp-summary-val" style={{color:'#F87171'}}>−{formatCurrencyFull(fixed)}</span></div>
        <div className="fbp-summary-row"><span>Variable Budgets</span><span className="fbp-summary-val" style={{color:'#FBBF24'}}>−{formatCurrencyFull(variable)}</span></div>
        <div className="fbp-summary-row"><span>Savings & Investments</span><span className="fbp-summary-val" style={{color:'#4ADE80'}}>−{formatCurrencyFull(savings)}</span></div>
        <div className="fbp-summary-row fbp-summary-disc">
          <span>Discretionary</span>
          <span className="fbp-summary-val" style={{color: disc > 0 ? '#A78BFA' : '#F87171', fontWeight:700}}>
            {formatCurrencyFull(income - fixed - variable - savings)}
          </span>
        </div>
        <div className="fbp-summary-row"><span>Savings Rate</span><span className="fbp-summary-val" style={{color:srColor}}>{savingsRate}%</span></div>
      </div>
      <div className="fbp-bar-wrap">
        {segs.map(s => <div key={s.label} className="fbp-bar-seg" style={{width:`${Math.max(0,(s.value/total)*100)}%`,background:s.color}} title={`${s.label}: ${formatCurrencyFull(s.value)}`} />)}
      </div>
      <div className="fbp-bar-legend">
        {segs.map(s => <span key={s.label} className="fbp-legend-item"><span className="fbp-legend-dot" style={{background:s.color}} />{s.label}</span>)}
      </div>
    </div>
  );
}

// ── Account link dropdown ────────────────────────────────────────────────────
function AccountLinkSelect({ value, onChange, accounts, style = {} }) {
  const groups = [
    { label: 'Checking & Savings', types: ['checking', 'savings', 'money_market', 'cd'] },
    { label: 'Credit Cards', types: ['credit', 'store_credit'] },
    { label: 'Loans', types: ['mortgage', 'auto_loan', 'personal_loan', 'student_loan'] },
    { label: 'Retirement', types: ['roth_ira', 'traditional_ira', '401k', 'roth_401k', '403b', 'hsa'] },
    { label: 'Investment', types: ['brokerage', 'reit', 'crypto'] },
  ];
  return (
    <select
      value={value || ''}
      onChange={e => onChange(e.target.value || null)}
      style={{ background: '#0A1020', border: '1px solid #1E293B', color: value ? '#F1F5F9' : '#64748B', borderRadius: 6, padding: '3px 6px', fontSize: 11, cursor: 'pointer', ...style }}
    >
      <option value="">🔗 link</option>
      {groups.map(g => {
        const accs = (accounts || []).filter(a => g.types.includes(a.type));
        if (!accs.length) return null;
        return (
          <optgroup key={g.label} label={g.label}>
            {accs.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </optgroup>
        );
      })}
    </select>
  );
}

// Shared Add/Delete table for fixed expense rows
function ExpenseTable({ expenses, onUpdate, onDelete, onAdd, accounts, onLink }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [amt, setAmt]   = useState('');
  const [due, setDue]   = useState('');

  const submit = () => {
    const amount = Number(amt);
    if (!name.trim() || !amount) return;
    onAdd({ name: name.trim(), amount, dueDay: due ? Number(due) : null });
    setName(''); setAmt(''); setDue(''); setAdding(false);
  };
  const cancel = () => { setAdding(false); setName(''); setAmt(''); setDue(''); };

  return (
    <div className="fbp-table fbp-expenses-table">
      <div className="fbp-table-head"><span>Bill</span><span>Amount</span><span className="fbp-col-due">Due</span><span /></div>
      {expenses.length === 0 && !adding && (
        <div className="fbp-empty-row">No expenses yet — click ＋ to add one</div>
      )}
      {expenses.map(exp => {
        const cat = getCategoryById(exp.category);
        const meta = exp.metadata || {};
        return (
          <div key={exp.id} className="fbp-table-row">
            <span className="fbp-row-name">
              {cat.icon}{' '}
              <InlineEdit value={exp.name} onSave={v => onUpdate(exp.id,'name',v)} type="text" formatFn={v=>v} className="fbp-ie fbp-ie-name" />
              {meta.isOneTime  && <span className="fbp-chip red">One-time</span>}
              {meta.isPrepaid  && <span className="fbp-chip yellow">Prepaid</span>}
              {meta.isVariable && <span className="fbp-chip blue">Variable</span>}
            </span>
            <InlineEdit value={exp.amount} onSave={v => onUpdate(exp.id,'amount',v)} formatFn={formatCurrencyFull} className="fbp-ie" />
            <span className="fbp-col-due fbp-subdued">
              <InlineEdit value={exp.dueDay??0} onSave={v => onUpdate(exp.id,'dueDay',v)} formatFn={v=>v>0?`${v}th`:'—'} className="fbp-ie" min={0} step="1" />
            </span>
            <button className="fbp-delete-btn" onClick={() => onDelete(exp.id)} title="Delete">×</button>
            {onLink && <AccountLinkSelect value={exp.metadata?.linkedAccountId} onChange={id => onLink(exp.id, id)} accounts={accounts} />}
          </div>
        );
      })}
      {adding ? (
        <div className="fbp-add-row">
          <input className="fbp-add-input fbp-add-name" placeholder="Expense name" value={name} onChange={e=>setName(e.target.value)} autoFocus onKeyDown={e=>e.key==='Enter'&&submit()} />
          <input className="fbp-add-input fbp-add-amount" type="number" min="0" step="0.01" placeholder="Amount" value={amt} onChange={e=>setAmt(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()} />
          <input className="fbp-add-input fbp-add-due" type="number" min="1" max="31" placeholder="Day" value={due} onChange={e=>setDue(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()} />
          <button className="fbp-add-confirm" onClick={submit}>✓ Add</button>
          <button className="fbp-add-cancel" onClick={cancel}>✕</button>
        </div>
      ) : (
        <button className="fbp-add-btn" onClick={()=>setAdding(true)}>＋ Add expense</button>
      )}
    </div>
  );
}

// Modal for adding a savings goal
function AddSavingsModal({ accounts, onAdd, onClose, keyPrefix = 'vadim_savings' }) {
  const [accountId, setAccountId] = useState('');
  const [label, setLabel]         = useState('');
  const [monthly, setMonthly]     = useState('');
  const [targetGoal, setTargetGoal] = useState('');
  const [startDate, setStartDate]   = useState('');

  const savingsAccounts = (accounts || []).filter(a =>
    ['savings', 'money_market', 'cd', 'roth_ira', 'traditional_ira', '401k', 'roth_401k', '403b', 'hsa', 'brokerage', 'reit', 'crypto'].includes(a.type)
  );

  const handleAccountChange = (id) => {
    setAccountId(id);
    const acct = savingsAccounts.find(a => a.id === id);
    if (acct) setLabel(acct.name);
  };

  const submit = () => {
    const lbl = label.trim() || (savingsAccounts.find(a=>a.id===accountId)?.name) || 'Savings';
    const id = accountId || `custom_${Date.now()}`;
    onAdd({
      key:        `${keyPrefix}_${id}_monthly`,
      accountId:  accountId || null,
      label:      lbl,
      targetGoal: Number(targetGoal) || 0,
      startDate:  startDate || undefined,
      _initMonthly: Number(monthly) || 0,
    });
    onClose();
  };

  return (
    <div className="fbp-modal-overlay" onClick={onClose}>
      <div className="fbp-modal" onClick={e=>e.stopPropagation()}>
        <div className="fbp-modal-title">Add Savings Goal</div>
        <div className="fbp-modal-field">
          <label>Account</label>
          <select className="fbp-modal-select" value={accountId} onChange={e=>handleAccountChange(e.target.value)}>
            <option value="">— Custom / Not linked —</option>
            {savingsAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div className="fbp-modal-field">
          <label>Label</label>
          <input className="fbp-modal-input" placeholder="e.g. Emergency Fund" value={label} onChange={e=>setLabel(e.target.value)} autoFocus />
        </div>
        <div className="fbp-modal-field">
          <label>Monthly Amount ($)</label>
          <input className="fbp-modal-input" type="number" min="0" placeholder="0" value={monthly} onChange={e=>setMonthly(e.target.value)} />
        </div>
        <div className="fbp-modal-field">
          <label>Target Goal ($)</label>
          <input className="fbp-modal-input" type="number" min="0" placeholder="0" value={targetGoal} onChange={e=>setTargetGoal(e.target.value)} />
        </div>
        <div className="fbp-modal-field">
          <label>Start Date (optional, YYYY-MM-DD)</label>
          <input className="fbp-modal-input" type="text" placeholder="2026-06-01" value={startDate} onChange={e=>setStartDate(e.target.value)} />
        </div>
        <div className="fbp-modal-actions">
          <button className="fbp-add-cancel" onClick={onClose}>Cancel</button>
          <button className="fbp-add-confirm" onClick={submit}>Add Goal</button>
        </div>
      </div>
    </div>
  );
}

// ── VADIM VIEW ────────────────────────────────────────────────────────────────
function VadimView({ settings, setSetting, accounts, setAccounts, recurringExpenses, setRecurringExpenses }) {
  const [showAddSavings, setShowAddSavings] = useState(false);
  const [addingVarBudget, setAddingVarBudget] = useState(false);
  const [newBudgetName, setNewBudgetName] = useState('');
  const [newBudgetAmt, setNewBudgetAmt]   = useState('');

  const paycheck      = settings['vadim_paycheck'] ?? 2200;
  const monthlyIncome = paycheck * 2;

  // Dynamic savings list from JSON or static fallback
  const savingsList = useMemo(
    () => parseJson(settings['vadim_savings_list'], null) || VADIM_SAVINGS_DEFAULT,
    [settings]
  );

  const addSavingsEntry = (entry) => {
    const newList = [...savingsList, { key: entry.key, accountId: entry.accountId, label: entry.label, targetGoal: entry.targetGoal, startDate: entry.startDate }];
    setSetting('vadim_savings_list', JSON.stringify(newList));
    if (entry._initMonthly > 0) setSetting(entry.key, entry._initMonthly);
  };

  const deleteSavingsEntry = (key) => {
    const newList = savingsList.filter(sv => sv.key !== key);
    setSetting('vadim_savings_list', JSON.stringify(newList));
  };

  const updateSavings = (settingKey, accountId, value) => {
    setSetting(settingKey, value);
    if (accountId) {
      setAccounts(prev => prev.map(a => a.id === accountId ? { ...a, monthlyContribution: value } : a));
    }
  };

  // Variable budgets from recurringExpenses where isBudget: true
  const varBudgets = useMemo(
    () => (recurringExpenses || []).filter(e => { const m = e.metadata||{}; return m.isBudget && e.active; }),
    [recurringExpenses]
  );

  const addVarBudget = () => {
    const amount = Number(newBudgetAmt);
    if (!newBudgetName.trim() || !amount) return;
    setRecurringExpenses(prev => [...prev, {
      id: `re_budget_${Date.now()}`,
      name: newBudgetName.trim(), amount, active: true,
      category: 'miscellaneous', frequency: 'monthly',
      metadata: { tag: 'budget', isBudget: true },
    }]);
    setNewBudgetName(''); setNewBudgetAmt(''); setAddingVarBudget(false);
  };

  const deleteVarBudget = (id) => setRecurringExpenses(prev => prev.filter(e => e.id !== id));

  const updateVarBudget = (id, value) => {
    setRecurringExpenses(prev => prev.map(e => e.id === id ? { ...e, amount: Number(value) } : e));
  };

  // Fixed expenses
  const fixedExpenses = useMemo(
    () => (recurringExpenses || []).filter(e => { const m = e.metadata||{}; return !m.isBudget && m.owner !== 'jessica' && e.active; }),
    [recurringExpenses]
  );

  const updateExpense = (id, field, value) =>
    setRecurringExpenses(prev => prev.map(e => e.id === id ? { ...e, [field]: field === 'amount' ? Number(value) : value } : e));
  const deleteExpense = id => setRecurringExpenses(prev => prev.filter(e => e.id !== id));
  const addExpense = ({ name, amount, dueDay }) =>
    setRecurringExpenses(prev => [...prev, {
      id: `re_vadim_${Date.now()}`, name, amount, active: true,
      category: 'housing', frequency: 'monthly', dueDay,
      metadata: { tag: 'fixed', owner: 'vadim' },
    }]);
  const linkExpense = (id, accountId) => {
    setRecurringExpenses(prev => prev.map(e => e.id === id ? { ...e, metadata: { ...(e.metadata||{}), linkedAccountId: accountId } } : e));
  };

  const totalFixed    = fixedExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const totalVariable = varBudgets.reduce((s, e) => s + (e.amount || 0), 0);
  const totalSavings  = savingsList.reduce((s, sv) => s + (settings[sv.key] || 0), 0);

  return (
    <div className="fbp-view">
      {/* ── Income ── */}
      <div className="fbp-section">
        <SectionHeader title="Income" icon="💰" total={monthlyIncome} totalColor="#4ADE80" />
        <div className="fbp-table">
          <div className="fbp-table-row">
            <span className="fbp-row-label">Bi-weekly paycheck (net)</span>
            <InlineEdit value={paycheck} onSave={v => setSetting('vadim_paycheck', v)} formatFn={formatCurrencyFull} className="fbp-ie" />
          </div>
          <div className="fbp-table-row fbp-subdued">
            <span>Monthly (2 paychecks)</span>
            <span>{formatCurrencyFull(monthlyIncome)}</span>
          </div>
          <div className="fbp-table-row">
            <span className="fbp-row-label">Next payday</span>
            <span className="fbp-payday">
              <InlineEdit value={settings['vadim_next_payday'] || '2026-03-21'}
                onSave={v => setSetting('vadim_next_payday', v)} type="text" formatFn={formatPayday} className="fbp-ie" />
            </span>
          </div>
        </div>
      </div>

      {/* ── Fixed Expenses ── */}
      <div className="fbp-section">
        <SectionHeader title="Fixed Expenses" icon="📋" total={totalFixed} totalColor="#F87171" />
        <ExpenseTable expenses={fixedExpenses} onUpdate={updateExpense} onDelete={deleteExpense} onAdd={addExpense} accounts={accounts} onLink={linkExpense} />
      </div>

      {/* ── Variable Budgets ── */}
      <div className="fbp-section">
        <SectionHeader title="Variable Budgets" icon="🧾" total={totalVariable} totalColor="#FBBF24" />
        <div className="fbp-table">
          {varBudgets.length === 0 && !addingVarBudget && (
            <div className="fbp-empty-row">No variable budgets — click ＋ to add one</div>
          )}
          {varBudgets.map(exp => {
            const cat = getCategoryById(exp.category);
            return (
              <div key={exp.id} className="fbp-table-row fbp-varbudget-row">
                <span className="fbp-row-label">{cat.icon}{' '}
                  <InlineEdit value={exp.name} onSave={v => setRecurringExpenses(prev => prev.map(e => e.id===exp.id?{...e,name:v}:e))}
                    type="text" formatFn={v=>v} className="fbp-ie fbp-ie-name" />
                </span>
                <InlineEdit value={exp.amount} onSave={v => updateVarBudget(exp.id, v)} formatFn={formatCurrencyFull} className="fbp-ie" suffix="/mo" />
                <button className="fbp-delete-btn" onClick={() => deleteVarBudget(exp.id)} title="Delete">×</button>
                <AccountLinkSelect value={exp.metadata?.linkedAccountId} onChange={id => linkExpense(exp.id, id)} accounts={accounts} />
              </div>
            );
          })}
          {addingVarBudget ? (
            <div className="fbp-add-row">
              <input className="fbp-add-input fbp-add-name" placeholder="Budget name (e.g. Groceries)" value={newBudgetName}
                onChange={e => setNewBudgetName(e.target.value)} autoFocus onKeyDown={e => e.key==='Enter' && addVarBudget()} />
              <input className="fbp-add-input fbp-add-amount" type="number" min="0" placeholder="Amount/mo" value={newBudgetAmt}
                onChange={e => setNewBudgetAmt(e.target.value)} onKeyDown={e => e.key==='Enter' && addVarBudget()} />
              <button className="fbp-add-confirm" onClick={addVarBudget}>✓ Add</button>
              <button className="fbp-add-cancel" onClick={() => { setAddingVarBudget(false); setNewBudgetName(''); setNewBudgetAmt(''); }}>✕</button>
            </div>
          ) : (
            <button className="fbp-add-btn" onClick={() => setAddingVarBudget(true)}>＋ Add variable budget</button>
          )}
        </div>
      </div>

      {/* ── Savings & Investments ── */}
      <div className="fbp-section">
        <SectionHeader title="Savings & Investments" icon="📈" total={totalSavings} totalColor="#4ADE80" />
        <div className="fbp-table fbp-savings-table">
          <div className="fbp-table-head fbp-savings-head">
            <span>Account</span><span>Monthly</span><span>/Paycheck</span><span />
          </div>
          {savingsList.map(({ key, accountId, label, targetGoal, startDate }) => {
            const monthly     = settings[key] ?? 0;
            const perPaycheck = monthly / 2;
            const acct        = (accounts || []).find(a => a.id === accountId);
            const isFuture    = startDate && new Date(startDate) > new Date();
            const daysTo      = isFuture ? differenceInDays(parseISO(startDate), new Date()) : 0;
            const projected   = acct && targetGoal > 0 ? projectedDateLabel(acct.balance || 0, targetGoal, monthly) : null;
            return (
              <div key={key} className={`fbp-table-row fbp-savings-row ${isFuture ? 'fbp-future' : ''}`}>
                <div className="fbp-savings-name">
                  <span>{label}{accountId ? ' 🔗' : ''}</span>
                  {isFuture && (
                    <span className="fbp-chip purple">Starts {format(parseISO(startDate), 'MMM yyyy')} · {daysTo}d</span>
                  )}
                  {projected && <span className="fbp-projected">{projected}</span>}
                </div>
                <InlineEdit value={monthly} onSave={v => updateSavings(key, accountId, v)} formatFn={formatCurrencyFull} className="fbp-ie" suffix="/mo" />
                <span className="fbp-subdued">{formatCurrencyFull(perPaycheck)}</span>
                <button className="fbp-delete-btn" onClick={() => deleteSavingsEntry(key)} title="Remove">×</button>
              </div>
            );
          })}
          <button className="fbp-add-btn" onClick={() => setShowAddSavings(true)}>＋ Add savings goal</button>
        </div>
      </div>

      <SummaryBar income={monthlyIncome} fixed={totalFixed} variable={totalVariable} savings={totalSavings} />

      {showAddSavings && (
        <AddSavingsModal accounts={accounts} onAdd={addSavingsEntry} onClose={() => setShowAddSavings(false)} />
      )}
    </div>
  );
}

// ── JESSICA VIEW ──────────────────────────────────────────────────────────────
function JessicaView({ settings, setSetting, recurringExpenses, setRecurringExpenses, accounts, setAccounts }) {
  const [addingAlloc, setAddingAlloc] = useState(false);
  const [newAllocLabel, setNewAllocLabel] = useState('');
  const [newAllocPct, setNewAllocPct]     = useState('');
  const [showAddSavings, setShowAddSavings] = useState(false);

  const estMonthly = settings['jessica_estimated_monthly'] ?? 2000;

  // Dynamic alloc list from JSON or static fallback
  const allocList = useMemo(
    () => parseJson(settings['jessica_alloc_list'], null) || JESSICA_ALLOCS_DEFAULT,
    [settings]
  );

  const addAlloc = () => {
    if (!newAllocLabel.trim()) return;
    const key = `jessica_alloc_custom_${Date.now()}`;
    const entry = { key, label: newAllocLabel.trim(), color: '#94A3B8' };
    const newList = [...allocList, entry];
    setSetting('jessica_alloc_list', JSON.stringify(newList));
    setSetting(key, Number(newAllocPct) || 0);
    setNewAllocLabel(''); setNewAllocPct(''); setAddingAlloc(false);
  };

  const deleteAlloc = (key) => {
    const newList = allocList.filter(a => a.key !== key);
    setSetting('jessica_alloc_list', JSON.stringify(newList));
  };

  const allocValues = {};
  for (const a of allocList) {
    allocValues[a.key] = settings[a.key] ?? 0;
  }
  const allocTotal   = Object.values(allocValues).reduce((s, v) => s + (v || 0), 0);
  const allocWarning = allocTotal !== 100;

  const spendableIncome = estMonthly * (1 - Number(settings['jessica_1099_tax_rate'] || 25) / 100);

  const amounts = {};
  for (const a of allocList) {
    amounts[a.key] = Math.round(spendableIncome * (allocValues[a.key] || 0) / 100 * 100) / 100;
  }

  // Jessica's fixed expenses
  const jessicaFixed = useMemo(
    () => (recurringExpenses || []).filter(e => { const m = e.metadata||{}; return m.owner === 'jessica' && e.active; }),
    [recurringExpenses]
  );
  const updateExpense = (id, field, value) =>
    setRecurringExpenses(prev => prev.map(e => e.id===id?{...e,[field]:field==='amount'?Number(value):value}:e));
  const deleteExpense = id => setRecurringExpenses(prev => prev.filter(e => e.id !== id));
  const addExpense = ({ name, amount, dueDay }) =>
    setRecurringExpenses(prev => [...prev, {
      id: `re_jessica_${Date.now()}`, name, amount, active: true,
      category: 'loan_payments', frequency: 'monthly', dueDay,
      metadata: { tag: 'fixed', owner: 'jessica' },
    }]);
  const linkExpense = (id, accountId) => {
    setRecurringExpenses(prev => prev.map(e => e.id === id ? { ...e, metadata: { ...(e.metadata||{}), linkedAccountId: accountId } } : e));
  };

  const totalFixed = jessicaFixed.reduce((s, e) => s + (e.amount || 0), 0);

  const taxRate       = Number(settings['jessica_1099_tax_rate'] || 25);
  const taxReserve    = Math.round(estMonthly * taxRate / 100 * 100) / 100;
  const ytdSetAside   = Number(settings['jessica_1099_ytd_setaside'] || 0);

  // Jessica savings list (mirrors Vadim's savings section)
  const jessicaSavingsList = useMemo(
    () => parseJson(settings['jessica_savings_list'], null) || JESSICA_SAVINGS_DEFAULT,
    [settings]
  );

  const addJessicaSavingsEntry = (entry) => {
    const newList = [...jessicaSavingsList, { key: entry.key, accountId: entry.accountId, label: entry.label, targetGoal: entry.targetGoal, startDate: entry.startDate }];
    setSetting('jessica_savings_list', JSON.stringify(newList));
    if (entry._initMonthly > 0) setSetting(entry.key, entry._initMonthly);
  };

  const deleteJessicaSavingsEntry = (key) => {
    const newList = jessicaSavingsList.filter(sv => sv.key !== key);
    setSetting('jessica_savings_list', JSON.stringify(newList));
  };

  const updateJessicaSavings = (settingKey, accountId, value) => {
    setSetting(settingKey, value);
    if (accountId && setAccounts) {
      setAccounts(prev => prev.map(a => a.id === accountId ? { ...a, monthlyContribution: value } : a));
    }
  };

  const totalJessicaSavings = jessicaSavingsList.reduce((s, sv) => s + (Number(settings[sv.key]) || 0), 0);

  return (
    <div className="fbp-view">
      {/* ── Income ── */}
      <div className="fbp-section">
        <SectionHeader title="Income (Variable)" icon="💰" total={estMonthly} totalColor="#4ADE80" />
        <div className="fbp-table">
          <div className="fbp-table-row">
            <span className="fbp-row-label">Estimated monthly income</span>
            <InlineEdit value={estMonthly} onSave={v=>setSetting('jessica_estimated_monthly',v)} formatFn={formatCurrencyFull} className="fbp-ie" suffix="/mo" />
          </div>
          <div className="fbp-table-row fbp-subdued">
            <span>Competitive Edge LLC next payday</span>
            <span className="fbp-payday">
              <InlineEdit value={settings['jessica_next_ce_payday']||'2026-04-01'} onSave={v=>setSetting('jessica_next_ce_payday',v)} type="text" formatFn={formatPayday} className="fbp-ie" />
            </span>
          </div>
          <div className="fbp-table-row fbp-subdued">
            <span>Orange Theory next payday</span>
            <span className="fbp-payday">
              <InlineEdit value={settings['jessica_next_ot_payday']||'2026-03-27'} onSave={v=>setSetting('jessica_next_ot_payday',v)} type="text" formatFn={formatPayday} className="fbp-ie" />
            </span>
          </div>
        </div>
      </div>

      {/* ── 1099 Tax Reserve ── */}
      <div className="fbp-section">
        <SectionHeader title="1099 Tax Reserve" icon="📋" total={taxReserve} totalColor="#F87171" />
        <div className="fbp-table">
          <div className="fbp-table-row fbp-subdued" style={{fontSize:12,color:'#64748B',padding:'6px 14px'}}>
            <span>Competitive Edge is 1099 income — set aside each month for taxes</span>
          </div>
          <div className="fbp-table-row">
            <span className="fbp-row-label">Set-aside rate</span>
            <InlineEdit value={taxRate} onSave={v=>setSetting('jessica_1099_tax_rate',v)} formatFn={v=>`${v}%`} className="fbp-ie" step="1" />
          </div>
          <div className="fbp-table-row fbp-subdued">
            <span>Monthly set-aside ({taxRate}%)</span>
            <span style={{color:'#F87171'}}>{formatCurrencyFull(taxReserve)}</span>
          </div>
          <div className="fbp-table-row fbp-subdued">
            <span>Spendable after set-aside</span>
            <span style={{color:'#4ADE80'}}>{formatCurrencyFull(spendableIncome)}</span>
          </div>
          <div className="fbp-table-row fbp-subdued">
            <span>YTD set aside</span>
            <InlineEdit value={ytdSetAside} onSave={v=>setSetting('jessica_1099_ytd_setaside',v)} formatFn={formatCurrencyFull} className="fbp-ie" />
          </div>
          <div className="fbp-table-row fbp-subdued" style={{fontSize:11,color:'#475569',padding:'4px 14px'}}>
            <span>Quarterly estimated payments: Apr 15 · Jun 15 · Sep 15 · Jan 15 · Tax year: 2026 (due Apr 15, 2027)</span>
          </div>
        </div>
      </div>

      {/* ── Allocation ── */}
      <div className="fbp-section">
        <SectionHeader title="Paycheck Allocation" icon="📊" />
        {allocWarning && <div className="fbp-warning">⚠ Allocations sum to {allocTotal}% — must equal 100%</div>}
        <div className="fbp-table fbp-alloc-table">
          <div className="fbp-table-head fbp-alloc-head">
            <span>Category</span><span>%</span><span>~Monthly</span><span />
          </div>
          {allocList.map(({ key, label, color }) => (
            <div key={key} className="fbp-table-row">
              <span className="fbp-row-label" style={{ color }}>{label}</span>
              <InlineEdit value={allocValues[key]??0} onSave={v=>setSetting(key,v)} formatFn={v=>`${v}%`} className="fbp-ie" step="1" />
              <span className="fbp-subdued">{formatCurrencyFull(amounts[key])}</span>
              <button className="fbp-delete-btn" onClick={() => deleteAlloc(key)} title="Remove">×</button>
            </div>
          ))}
          <div className="fbp-table-row fbp-total-row fbp-subdued">
            <span>Total</span>
            <span style={{ color: allocWarning ? '#F87171' : '#4ADE80', fontWeight: 700 }}>{allocTotal}%</span>
            <span /><span />
          </div>
          {addingAlloc ? (
            <div className="fbp-add-row">
              <input className="fbp-add-input fbp-add-name" placeholder="Category name" value={newAllocLabel}
                onChange={e=>setNewAllocLabel(e.target.value)} autoFocus onKeyDown={e=>e.key==='Enter'&&addAlloc()} />
              <input className="fbp-add-input fbp-add-due" type="number" min="0" max="100" placeholder="%" value={newAllocPct}
                onChange={e=>setNewAllocPct(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addAlloc()} />
              <button className="fbp-add-confirm" onClick={addAlloc}>✓ Add</button>
              <button className="fbp-add-cancel" onClick={()=>{setAddingAlloc(false);setNewAllocLabel('');setNewAllocPct('');}}>✕</button>
            </div>
          ) : (
            <button className="fbp-add-btn" onClick={()=>setAddingAlloc(true)}>＋ Add allocation category</button>
          )}
        </div>
      </div>

      {/* ── Fixed Expenses ── */}
      <div className="fbp-section">
        <SectionHeader title="Fixed Expenses" icon="📋" total={totalFixed} totalColor="#F87171" />
        <ExpenseTable expenses={jessicaFixed} onUpdate={updateExpense} onDelete={deleteExpense} onAdd={addExpense} accounts={accounts} onLink={linkExpense} />
      </div>

      {/* ── Savings & Investments ── */}
      <div className="fbp-section">
        <SectionHeader title="Savings & Investments" icon="📈" total={totalJessicaSavings} totalColor="#4ADE80" />
        <div className="fbp-table fbp-savings-table">
          <div className="fbp-table-head fbp-savings-head">
            <span>Account</span><span>Monthly</span><span>Linked</span><span />
          </div>
          {jessicaSavingsList.map(({ key, accountId, label, targetGoal, startDate }) => {
            const monthly  = settings[key] ?? 0;
            const acct     = (accounts || []).find(a => a.id === accountId);
            const isFuture = startDate && new Date(startDate) > new Date();
            const projected = acct && targetGoal > 0 ? projectedDateLabel(acct.balance || 0, targetGoal, monthly) : null;
            return (
              <div key={key} className={`fbp-table-row fbp-savings-row ${isFuture ? 'fbp-future' : ''}`}>
                <div className="fbp-savings-name">
                  <span>{label}{accountId ? ' 🔗' : ''}</span>
                  {projected && <span className="fbp-projected">{projected}</span>}
                </div>
                <InlineEdit value={monthly} onSave={v => updateJessicaSavings(key, accountId, v)} formatFn={formatCurrencyFull} className="fbp-ie" suffix="/mo" />
                <span className="fbp-subdued">{acct?.name || (accountId || '—')}</span>
                <button className="fbp-delete-btn" onClick={() => deleteJessicaSavingsEntry(key)} title="Remove">×</button>
              </div>
            );
          })}
          <button className="fbp-add-btn" onClick={() => setShowAddSavings(true)}>＋ Add savings goal</button>
        </div>
      </div>

      <SummaryBar income={estMonthly} fixed={totalFixed} variable={0} savings={totalJessicaSavings} />

      {showAddSavings && (
        <AddSavingsModal accounts={accounts} onAdd={addJessicaSavingsEntry} onClose={() => setShowAddSavings(false)} keyPrefix="jessica_savings" />
      )}
    </div>
  );
}

// ── HOUSEHOLD VIEW ────────────────────────────────────────────────────────────
function HouseholdView({ settings, accounts, recurringExpenses }) {
  const vadimPaycheck   = settings['vadim_paycheck']            ?? 2200;
  const vadimMonthly    = vadimPaycheck * 2;
  const jessicaMonthly  = settings['jessica_estimated_monthly'] ?? 2000;
  const totalMonthly    = vadimMonthly + jessicaMonthly;

  const vadimFixed     = (recurringExpenses||[]).filter(e=>{const m=e.metadata||{};return !m.isBudget&&m.owner!=='jessica'&&e.active;});
  const jessicaFixed   = (recurringExpenses||[]).filter(e=>{const m=e.metadata||{};return m.owner==='jessica'&&e.active;});
  const varBudgets     = (recurringExpenses||[]).filter(e=>{const m=e.metadata||{};return m.isBudget&&e.active;});

  const vadimFixedTotal   = vadimFixed.reduce((s,e)=>s+(e.amount||0),0);
  const jessicaFixedTotal = jessicaFixed.reduce((s,e)=>s+(e.amount||0),0);
  const combinedFixed     = vadimFixedTotal + jessicaFixedTotal;
  const combinedVariable  = varBudgets.reduce((s,e)=>s+(e.amount||0),0);

  const savingsList = parseJson(settings['vadim_savings_list'], null) || VADIM_SAVINGS_DEFAULT;
  const vadimSavings    = savingsList.reduce((s,sv)=>s+(settings[sv.key]||0),0);
  const jessicaSavPct   = (settings['jessica_alloc_savings']||0) + (settings['jessica_alloc_roth']||0);
  const jessicaSavings  = Math.round(jessicaMonthly * jessicaSavPct / 100 * 100) / 100;
  const combinedSavings = vadimSavings + jessicaSavings;

  const vadimDisc    = Math.max(0, vadimMonthly  - vadimFixedTotal  - combinedVariable - vadimSavings);
  const jessicaDisc  = Math.max(0, jessicaMonthly - jessicaFixedTotal - 0              - jessicaSavings);
  const combinedDisc = vadimDisc + jessicaDisc;

  const fmt = v => typeof v === 'number' ? formatCurrencyFull(v) : v;
  const vadimRate    = vadimMonthly   > 0 ? ((vadimSavings/vadimMonthly)*100).toFixed(1)   : '0.0';
  const jessicaRate  = jessicaMonthly > 0 ? ((jessicaSavings/jessicaMonthly)*100).toFixed(1) : '0.0';
  const combinedRate = totalMonthly   > 0 ? ((combinedSavings/totalMonthly)*100).toFixed(1) : '0.0';

  const totalAssets = (accounts||[]).filter(a=>!['credit','store_credit','mortgage','auto_loan','personal_loan','student_loan'].includes(a.type)).reduce((s,a)=>s+(a.balance||0),0);
  const totalDebt   = (accounts||[]).filter(a=>['credit','store_credit','mortgage','auto_loan','personal_loan','student_loan'].includes(a.type)).reduce((s,a)=>s+(a.balance||0),0);
  const rothVadim   = (accounts||[]).find(a=>a.id==='roth_ira_vadim');
  const rothJessica = (accounts||[]).find(a=>a.id==='roth_ira_jessica');
  const combinedRothYTD = (rothVadim?.ytdContributions||0) + (rothJessica?.ytdContributions||0);
  const rothTarget = 14000;

  const rows = [
    { label:'Income',          v:{color:'#4ADE80'}, vadim:vadimMonthly,    jessica:jessicaMonthly,    combined:totalMonthly    },
    { label:'Fixed Expenses',  v:{color:'#F87171',neg:true}, vadim:vadimFixedTotal,  jessica:jessicaFixedTotal,  combined:combinedFixed   },
    { label:'Variable Budgets',v:{color:'#FBBF24',neg:true}, vadim:combinedVariable, jessica:0,                  combined:combinedVariable },
    { label:'Savings',         v:{color:'#4ADE80',neg:true}, vadim:vadimSavings,     jessica:jessicaSavings,     combined:combinedSavings  },
    { label:'Discretionary',   v:{color:'#A78BFA',bold:true},vadim:vadimDisc,        jessica:jessicaDisc,        combined:combinedDisc     },
    { label:'Savings Rate',    v:{color:'#D4AF37',isRate:true},vadim:`${vadimRate}%`, jessica:`${jessicaRate}%`,  combined:`${combinedRate}%` },
  ];

  return (
    <div className="fbp-view">
      <div className="fbp-section">
        <SectionHeader title="Combined Budget Breakdown" icon="🏠" />
        <div className="fbp-household-table">
          <div className="fbp-household-head">
            <span /><span style={{color:'#60A5FA'}}>👨 Vadim</span><span style={{color:'#F472B6'}}>👩 Jessica</span><span style={{color:'#4ADE80'}}>🏠 Combined</span>
          </div>
          {rows.map(({ label, v, vadim, jessica, combined }) => (
            <div key={label} className={`fbp-household-row ${v.bold?'fbp-total-row':''}`}>
              <span className="fbp-row-label">{label}</span>
              {[vadim, jessica, combined].map((val, i) => (
                <span key={i} style={{ color: v.color, fontWeight: v.bold ? 700 : undefined }}>
                  {v.isRate ? val : `${v.neg?'−':''}${fmt(val)}`}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="fbp-section">
        <SectionHeader title="Net Worth Snapshot" icon="💎" />
        <div className="fbp-table">
          <div className="fbp-table-row"><span className="fbp-row-label">Total Assets</span><span className="positive">{fmt(totalAssets)}</span></div>
          <div className="fbp-table-row"><span className="fbp-row-label">Total Debt</span><span className="negative">−{fmt(totalDebt)}</span></div>
          <div className="fbp-table-row fbp-total-row">
            <span>Net Worth</span>
            <span className={totalAssets-totalDebt>=0?'positive fbp-bold':'negative fbp-bold'}>{fmt(totalAssets-totalDebt)}</span>
          </div>
        </div>
      </div>

      <div className="fbp-section">
        <SectionHeader title="Combined Roth IRA (2025)" icon="📈" />
        <div className="fbp-table">
          <div className="fbp-table-row"><span className="fbp-row-label">YTD Contributed</span><span style={{color:'#D4AF37'}}>{fmt(combinedRothYTD)}</span></div>
          <div className="fbp-table-row"><span className="fbp-row-label">Annual Limit (2 people)</span><span>{fmt(rothTarget)}</span></div>
          <div className="fbp-table-row fbp-total-row"><span>Remaining (deadline Apr 15, 2026)</span><span style={{color:'#F87171'}}>{fmt(Math.max(0,rothTarget-combinedRothYTD))}</span></div>
        </div>
        <div className="progress-bar-wrap" style={{margin:'8px 14px 4px'}}>
          <div className="progress-bar-fill" style={{width:`${Math.min((combinedRothYTD/rothTarget)*100,100)}%`,backgroundColor:'#D4AF37'}} />
        </div>
      </div>

      <div className="fbp-section">
        <SectionHeader title="Joint Contributions" icon="🤝" />
        <div className="fbp-table">
          <div className="fbp-table-row">
            <span className="fbp-row-label">Capital One Joint Savings</span>
            <span>{fmt((settings['vadim_savings_cap1_monthly']||0) + Math.round(jessicaMonthly*(settings['jessica_alloc_savings']||0)/100*100)/100)}/mo</span>
          </div>
          <div className="fbp-table-row">
            <span className="fbp-row-label">Ameriprise Joint Brokerage</span>
            <span>{fmt(settings['vadim_savings_brokerage_monthly']||0)}/mo</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MAIN PANEL ────────────────────────────────────────────────────────────────
export default function FullBudgetPlanPanel({ defaultTab = 'vadim' }) {
  const [settings, setSettings] = useLocalStorage('budget_settings', DEFAULT_BUDGET_SETTINGS);
  const [accounts, setAccounts] = useLocalStorage('budget_accounts',  DEFAULT_ACCOUNTS);
  const [recurringExpenses, setRecurringExpenses] = useLocalStorage('budget_recurring_expenses', DEFAULT_RECURRING_EXPENSES);
  const [activeTab, setActiveTab] = useState(defaultTab);

  const setSetting = (key, value) => setSettings(prev => ({ ...(prev||{}), [key]: value }));

  const TABS = [
    { id: 'vadim',     label: '👨 Vadim'     },
    { id: 'jessica',   label: '👩 Jessica'   },
    { id: 'household', label: '🏠 Household' },
  ];

  return (
    <div className="fbp-container">
      <div className="fbp-tab-bar">
        {TABS.map(t => (
          <button key={t.id} className={`fbp-tab ${activeTab===t.id?'active':''}`} onClick={()=>setActiveTab(t.id)}>{t.label}</button>
        ))}
      </div>
      {activeTab === 'vadim' && (
        <VadimView settings={settings||{}} setSetting={setSetting} accounts={accounts} setAccounts={setAccounts}
          recurringExpenses={recurringExpenses} setRecurringExpenses={setRecurringExpenses} />
      )}
      {activeTab === 'jessica' && (
        <JessicaView settings={settings||{}} setSetting={setSetting} accounts={accounts} setAccounts={setAccounts}
          recurringExpenses={recurringExpenses} setRecurringExpenses={setRecurringExpenses} />
      )}
      {activeTab === 'household' && (
        <HouseholdView settings={settings||{}} accounts={accounts} recurringExpenses={recurringExpenses} />
      )}
    </div>
  );
}
