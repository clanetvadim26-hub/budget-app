import React, { useState } from 'react';
import { addMonths, format, differenceInDays, parseISO } from 'date-fns';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { DEFAULT_ACCOUNTS } from '../../data/accounts';
import { DEFAULT_RECURRING_EXPENSES } from '../../data/defaultRecurring';
import { DEFAULT_BUDGET_SETTINGS } from '../../data/defaultBudgetSettings';
import { formatCurrencyFull } from '../../utils/calculations';
import { getCategoryById } from '../../data/categories';
import InlineEdit from '../InlineEdit';

// ── Constants ────────────────────────────────────────────────────────────────
const VADIM_SAVINGS = [
  { key: 'vadim_savings_cap1_monthly',          accountId: 'cap1_joint_savings',       label: 'Capital One Joint Savings (Emergency Fund)', targetGoal: 20000 },
  { key: 'vadim_savings_roth_monthly',          accountId: 'roth_ira_vadim',           label: 'Vadim Roth IRA 2025',                         targetGoal: 7000, deadline: '2026-04-15' },
  { key: 'vadim_savings_brokerage_monthly',     accountId: 'brokerage_joint',          label: 'Ameriprise Joint Brokerage',                  targetGoal: 0 },
  { key: 'vadim_savings_ameriprise_monthly',    accountId: 'ameriprise_savings_vadim', label: 'Ameriprise Savings (Vacation & Fun)',          targetGoal: 5000 },
  { key: 'vadim_savings_401k_monthly',          accountId: '401k_vadim',               label: 'Vadim 401k (starts June 2026)',               targetGoal: 0, startDate: '2026-06-01' },
];

const VADIM_BUDGETS = [
  { key: 'vadim_budget_groceries',    label: 'Groceries',   icon: '🛒' },
  { key: 'vadim_budget_gas',          label: 'Gas',         icon: '⛽' },
  { key: 'vadim_budget_dining',       label: 'Dining Out',  icon: '🍽️' },
  { key: 'vadim_budget_electricity',  label: 'Electricity', icon: '⚡' },
  { key: 'vadim_budget_water',        label: 'Water',       icon: '💧' },
];

const JESSICA_ALLOCS = [
  { key: 'jessica_alloc_household', label: '🏠 Household contribution',   color: '#60A5FA' },
  { key: 'jessica_alloc_savings',   label: '💰 Capital One Joint Savings', color: '#4ADE80' },
  { key: 'jessica_alloc_roth',      label: '📈 Jessica Roth IRA',          color: '#D4AF37' },
  { key: 'jessica_alloc_personal',  label: '👩 Personal spending',          color: '#F472B6' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Format a YYYY-MM-DD date string as "in X days (MM/DD/YY)" */
function formatPayday(dateStr) {
  if (!dateStr) return '—';
  try {
    const date = parseISO(dateStr);
    const days = differenceInDays(date, new Date());
    const formatted = format(date, 'MM/dd/yy');
    if (days < 0)  return `${Math.abs(days)}d ago (${formatted})`;
    if (days === 0) return `Today! (${formatted})`;
    if (days === 1) return `Tomorrow (${formatted})`;
    return `in ${days} days (${formatted})`;
  } catch { return dateStr; }
}

function projectedDateLabel(balance, target, monthly) {
  if (!monthly || monthly <= 0) return 'Set contribution to project';
  const gap = target - balance;
  if (gap <= 0) return 'Goal reached!';
  const months = Math.ceil(gap / monthly);
  const date = addMonths(new Date(), months);
  return `Goal in ~${months} month${months !== 1 ? 's' : ''} (${format(date, 'MMM yyyy')})`;
}

// ── Shared sub-components ────────────────────────────────────────────────────
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
        <div className="fbp-summary-row"><span>Fixed Expenses</span><span className="fbp-summary-val" style={{ color: '#F87171' }}>−{formatCurrencyFull(fixed)}</span></div>
        <div className="fbp-summary-row"><span>Variable Budgets</span><span className="fbp-summary-val" style={{ color: '#FBBF24' }}>−{formatCurrencyFull(variable)}</span></div>
        <div className="fbp-summary-row"><span>Savings & Investments</span><span className="fbp-summary-val" style={{ color: '#4ADE80' }}>−{formatCurrencyFull(savings)}</span></div>
        <div className="fbp-summary-row fbp-summary-disc">
          <span>Discretionary</span>
          <span className="fbp-summary-val" style={{ color: disc > 0 ? '#A78BFA' : '#F87171', fontWeight: 700 }}>
            {formatCurrencyFull(income - fixed - variable - savings)}
          </span>
        </div>
        <div className="fbp-summary-row"><span>Savings Rate</span><span className="fbp-summary-val" style={{ color: srColor }}>{savingsRate}%</span></div>
      </div>
      <div className="fbp-bar-wrap">
        {segs.map((s) => (
          <div key={s.label} className="fbp-bar-seg"
            style={{ width: `${Math.max(0, (s.value / total) * 100)}%`, background: s.color }}
            title={`${s.label}: ${formatCurrencyFull(s.value)}`} />
        ))}
      </div>
      <div className="fbp-bar-legend">
        {segs.map((s) => (
          <span key={s.label} className="fbp-legend-item">
            <span className="fbp-legend-dot" style={{ background: s.color }} />{s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Reusable Add/Delete expense table used by both Vadim and Jessica ─────────
function ExpenseTable({ expenses, onUpdate, onDelete, onAdd }) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAmt, setNewAmt]   = useState('');
  const [newDue, setNewDue]   = useState('');

  const submit = () => {
    const amount = Number(newAmt);
    if (!newName.trim() || !amount) return;
    onAdd({ name: newName.trim(), amount, dueDay: newDue ? Number(newDue) : null });
    setNewName(''); setNewAmt(''); setNewDue('');
    setAdding(false);
  };

  const cancel = () => {
    setAdding(false); setNewName(''); setNewAmt(''); setNewDue('');
  };

  return (
    <div className="fbp-table fbp-expenses-table">
      <div className="fbp-table-head">
        <span>Bill</span><span>Amount</span><span className="fbp-col-due">Due</span><span />
      </div>

      {expenses.length === 0 && !adding && (
        <div className="fbp-empty-row">No fixed expenses — click ＋ to add one</div>
      )}

      {expenses.map((exp) => {
        const cat  = getCategoryById(exp.category);
        const meta = exp.metadata || {};
        return (
          <div key={exp.id} className="fbp-table-row">
            <span className="fbp-row-name">
              {cat.icon}{' '}
              <InlineEdit value={exp.name} onSave={(v) => onUpdate(exp.id, 'name', v)}
                type="text" formatFn={(v) => v} className="fbp-ie fbp-ie-name" />
              {meta.isOneTime  && <span className="fbp-chip red">One-time</span>}
              {meta.isPrepaid  && <span className="fbp-chip yellow">Prepaid</span>}
              {meta.isVariable && <span className="fbp-chip blue">Variable</span>}
            </span>
            <InlineEdit value={exp.amount} onSave={(v) => onUpdate(exp.id, 'amount', v)}
              formatFn={formatCurrencyFull} className="fbp-ie" />
            <span className="fbp-col-due fbp-subdued">
              <InlineEdit value={exp.dueDay ?? 0} onSave={(v) => onUpdate(exp.id, 'dueDay', v)}
                formatFn={(v) => v > 0 ? `${v}th` : '—'} className="fbp-ie" min={0} step="1" />
            </span>
            <button className="fbp-delete-btn" onClick={() => onDelete(exp.id)} title="Delete">×</button>
          </div>
        );
      })}

      {adding ? (
        <div className="fbp-add-row">
          <input className="fbp-add-input fbp-add-name" placeholder="Expense name"
            value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus
            onKeyDown={(e) => e.key === 'Enter' && submit()} />
          <input className="fbp-add-input fbp-add-amount" type="number" min="0" step="0.01"
            placeholder="Amount" value={newAmt} onChange={(e) => setNewAmt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()} />
          <input className="fbp-add-input fbp-add-due" type="number" min="1" max="31"
            placeholder="Day" value={newDue} onChange={(e) => setNewDue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()} />
          <button className="fbp-add-confirm" onClick={submit}>✓ Add</button>
          <button className="fbp-add-cancel"  onClick={cancel}>✕</button>
        </div>
      ) : (
        <button className="fbp-add-btn" onClick={() => setAdding(true)}>＋ Add expense</button>
      )}
    </div>
  );
}

// ── VADIM VIEW ───────────────────────────────────────────────────────────────
function VadimView({ settings, setSetting, accounts, setAccounts, recurringExpenses, setRecurringExpenses }) {
  const paycheck      = settings['vadim_paycheck']    ?? 2200;
  const monthlyIncome = Math.round((paycheck * 26) / 12 * 100) / 100;

  // Bidirectional: savings setting → accounts.monthlyContribution
  const updateSavings = (settingKey, accountId, value) => {
    setSetting(settingKey, value);
    setAccounts((prev) => prev.map((a) =>
      a.id === accountId ? { ...a, monthlyContribution: value } : a
    ));
  };

  const updateExpense = (id, field, value) => {
    setRecurringExpenses((prev) => prev.map((e) =>
      e.id === id ? { ...e, [field]: field === 'amount' ? Number(value) : value } : e
    ));
  };

  const deleteExpense = (id) => setRecurringExpenses((prev) => prev.filter((e) => e.id !== id));

  const addExpense = ({ name, amount, dueDay }) => {
    setRecurringExpenses((prev) => [...prev, {
      id: `re_vadim_${Date.now()}`,
      name, amount, active: true,
      category: 'housing', frequency: 'monthly', dueDay,
      metadata: { tag: 'fixed', owner: 'vadim' },
    }]);
  };

  // Fixed = not a budget line, not Jessica's, active
  const fixedExpenses = (recurringExpenses || []).filter((e) => {
    const meta = e.metadata || {};
    return !meta.isBudget && meta.owner !== 'jessica' && e.active;
  });

  const totalFixed    = fixedExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const totalVariable = VADIM_BUDGETS.reduce((s, b) => s + (settings[b.key] || 0), 0);
  const totalSavings  = VADIM_SAVINGS.reduce((s, sv) => s + (settings[sv.key] || 0), 0);

  return (
    <div className="fbp-view">
      {/* ── Income ── */}
      <div className="fbp-section">
        <SectionHeader title="Income" icon="💰" total={monthlyIncome} totalColor="#4ADE80" />
        <div className="fbp-table">
          <div className="fbp-table-row">
            <span className="fbp-row-label">Bi-weekly paycheck (net)</span>
            <InlineEdit value={paycheck} onSave={(v) => setSetting('vadim_paycheck', v)}
              formatFn={formatCurrencyFull} className="fbp-ie" />
          </div>
          <div className="fbp-table-row fbp-subdued">
            <span>Monthly equivalent (×26/12)</span>
            <span>{formatCurrencyFull(monthlyIncome)}</span>
          </div>
          <div className="fbp-table-row">
            <span className="fbp-row-label">Next payday</span>
            <span className="fbp-payday">
              <InlineEdit
                value={settings['vadim_next_payday'] || '2026-03-21'}
                onSave={(v) => setSetting('vadim_next_payday', v)}
                type="text" formatFn={formatPayday} className="fbp-ie"
              />
            </span>
          </div>
        </div>
      </div>

      {/* ── Fixed Expenses ── */}
      <div className="fbp-section">
        <SectionHeader title="Fixed Expenses" icon="📋" total={totalFixed} totalColor="#F87171" />
        <ExpenseTable
          expenses={fixedExpenses}
          onUpdate={updateExpense}
          onDelete={deleteExpense}
          onAdd={addExpense}
        />
      </div>

      {/* ── Variable Budgets ── */}
      <div className="fbp-section">
        <SectionHeader title="Variable Budgets" icon="🧾" total={totalVariable} totalColor="#FBBF24" />
        <div className="fbp-table">
          {VADIM_BUDGETS.map(({ key, label, icon }) => (
            <div key={key} className="fbp-table-row">
              <span className="fbp-row-label">{icon} {label}</span>
              <InlineEdit value={settings[key] ?? 0} onSave={(v) => setSetting(key, v)}
                formatFn={formatCurrencyFull} className="fbp-ie" suffix="/mo" />
            </div>
          ))}
        </div>
      </div>

      {/* ── Savings & Investments ── */}
      <div className="fbp-section">
        <SectionHeader title="Savings & Investments" icon="📈" total={totalSavings} totalColor="#4ADE80" />
        <div className="fbp-table fbp-savings-table">
          <div className="fbp-table-head fbp-savings-head">
            <span>Account</span><span>Monthly</span><span>/Paycheck</span>
          </div>
          {VADIM_SAVINGS.map(({ key, accountId, label, targetGoal, startDate }) => {
            const monthly     = settings[key] ?? 0;
            const perPaycheck = monthly / 2;
            const acct        = (accounts || []).find((a) => a.id === accountId);
            const isFuture    = startDate && new Date(startDate) > new Date();
            const daysTo      = isFuture ? differenceInDays(parseISO(startDate), new Date()) : 0;
            const projected   = acct && targetGoal > 0
              ? projectedDateLabel(acct.balance || 0, targetGoal, monthly)
              : null;

            return (
              <div key={key} className={`fbp-table-row fbp-savings-row ${isFuture ? 'fbp-future' : ''}`}>
                <div className="fbp-savings-name">
                  <span>{label}</span>
                  {isFuture && (
                    <span className="fbp-chip purple">
                      Starts {format(parseISO(startDate), 'MMM yyyy')} · {daysTo}d
                    </span>
                  )}
                  {projected && <span className="fbp-projected">{projected}</span>}
                </div>
                <InlineEdit value={monthly} onSave={(v) => updateSavings(key, accountId, v)}
                  formatFn={formatCurrencyFull} className="fbp-ie" suffix="/mo" />
                <span className="fbp-subdued">{formatCurrencyFull(perPaycheck)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <SummaryBar income={monthlyIncome} fixed={totalFixed} variable={totalVariable} savings={totalSavings} />
    </div>
  );
}

// ── JESSICA VIEW ─────────────────────────────────────────────────────────────
function JessicaView({ settings, setSetting, recurringExpenses, setRecurringExpenses }) {
  const estMonthly = settings['jessica_estimated_monthly'] ?? 2000;

  const allocValues = {
    jessica_alloc_household: settings['jessica_alloc_household'] ?? 40,
    jessica_alloc_savings:   settings['jessica_alloc_savings']   ?? 10,
    jessica_alloc_roth:      settings['jessica_alloc_roth']      ?? 10,
    jessica_alloc_personal:  settings['jessica_alloc_personal']  ?? 40,
  };
  const allocTotal   = Object.values(allocValues).reduce((s, v) => s + (v || 0), 0);
  const allocWarning = allocTotal !== 100;

  const amounts = {};
  for (const a of JESSICA_ALLOCS) {
    amounts[a.key] = Math.round(estMonthly * (allocValues[a.key] || 0) / 100 * 100) / 100;
  }

  // Jessica's fixed expenses filtered from shared recurringExpenses by owner
  const jessicaFixed = (recurringExpenses || []).filter((e) => {
    const meta = e.metadata || {};
    return meta.owner === 'jessica' && e.active;
  });

  const updateExpense = (id, field, value) => {
    setRecurringExpenses((prev) => prev.map((e) =>
      e.id === id ? { ...e, [field]: field === 'amount' ? Number(value) : value } : e
    ));
  };
  const deleteExpense = (id) => setRecurringExpenses((prev) => prev.filter((e) => e.id !== id));
  const addExpense = ({ name, amount, dueDay }) => {
    setRecurringExpenses((prev) => [...prev, {
      id: `re_jessica_${Date.now()}`,
      name, amount, active: true,
      category: 'loan_payments', frequency: 'monthly', dueDay,
      metadata: { tag: 'fixed', owner: 'jessica' },
    }]);
  };

  const totalFixed   = jessicaFixed.reduce((s, e) => s + (e.amount || 0), 0);
  const totalSavings = amounts['jessica_alloc_savings'] + amounts['jessica_alloc_roth'];

  return (
    <div className="fbp-view">
      {/* ── Income ── */}
      <div className="fbp-section">
        <SectionHeader title="Income (Variable)" icon="💰" total={estMonthly} totalColor="#4ADE80" />
        <div className="fbp-table">
          <div className="fbp-table-row">
            <span className="fbp-row-label">Estimated monthly income</span>
            <InlineEdit value={estMonthly} onSave={(v) => setSetting('jessica_estimated_monthly', v)}
              formatFn={formatCurrencyFull} className="fbp-ie" suffix="/mo" />
          </div>
          <div className="fbp-table-row fbp-subdued">
            <span>Competitive Edge LLC next payday</span>
            <span className="fbp-payday">
              <InlineEdit value={settings['jessica_next_ce_payday'] || '2026-04-01'}
                onSave={(v) => setSetting('jessica_next_ce_payday', v)}
                type="text" formatFn={formatPayday} className="fbp-ie" />
            </span>
          </div>
          <div className="fbp-table-row fbp-subdued">
            <span>Orange Theory next payday</span>
            <span className="fbp-payday">
              <InlineEdit value={settings['jessica_next_ot_payday'] || '2026-03-27'}
                onSave={(v) => setSetting('jessica_next_ot_payday', v)}
                type="text" formatFn={formatPayday} className="fbp-ie" />
            </span>
          </div>
        </div>
      </div>

      {/* ── Allocation ── */}
      <div className="fbp-section">
        <SectionHeader title="Paycheck Allocation" icon="📊" />
        {allocWarning && (
          <div className="fbp-warning">⚠ Allocations sum to {allocTotal}% — must equal 100%</div>
        )}
        <div className="fbp-table fbp-alloc-table">
          <div className="fbp-table-head fbp-alloc-head">
            <span>Category</span><span>%</span><span>~Monthly</span>
          </div>
          {JESSICA_ALLOCS.map(({ key, label, color }) => (
            <div key={key} className="fbp-table-row">
              <span className="fbp-row-label" style={{ color }}>{label}</span>
              <InlineEdit value={allocValues[key] ?? 0} onSave={(v) => setSetting(key, v)}
                formatFn={(v) => `${v}%`} className="fbp-ie" step="1" />
              <span className="fbp-subdued">{formatCurrencyFull(amounts[key])}</span>
            </div>
          ))}
          <div className="fbp-table-row fbp-total-row fbp-subdued">
            <span>Total</span>
            <span style={{ color: allocWarning ? '#F87171' : '#4ADE80', fontWeight: 700 }}>{allocTotal}%</span>
            <span />
          </div>
        </div>
      </div>

      {/* ── Fixed Expenses ── */}
      <div className="fbp-section">
        <SectionHeader title="Fixed Expenses" icon="📋" total={totalFixed} totalColor="#F87171" />
        <ExpenseTable
          expenses={jessicaFixed}
          onUpdate={updateExpense}
          onDelete={deleteExpense}
          onAdd={addExpense}
        />
      </div>

      <SummaryBar income={estMonthly} fixed={totalFixed} variable={0} savings={totalSavings} />
    </div>
  );
}

// ── HOUSEHOLD VIEW — 3-column combined breakdown ──────────────────────────────
function HouseholdView({ settings, accounts, recurringExpenses }) {
  const vadimPaycheck   = settings['vadim_paycheck']            ?? 2200;
  const vadimMonthly    = Math.round((vadimPaycheck * 26) / 12 * 100) / 100;
  const jessicaMonthly  = settings['jessica_estimated_monthly'] ?? 2000;
  const totalMonthly    = vadimMonthly + jessicaMonthly;

  const vadimFixed = (recurringExpenses || []).filter((e) => {
    const meta = e.metadata || {};
    return !meta.isBudget && meta.owner !== 'jessica' && e.active;
  });
  const jessicaFixed = (recurringExpenses || []).filter((e) => {
    const meta = e.metadata || {};
    return meta.owner === 'jessica' && e.active;
  });
  const vadimFixedTotal    = vadimFixed.reduce((s, e) => s + (e.amount || 0), 0);
  const jessicaFixedTotal  = jessicaFixed.reduce((s, e) => s + (e.amount || 0), 0);
  const combinedFixed      = vadimFixedTotal + jessicaFixedTotal;

  const vadimVariable  = VADIM_BUDGETS.reduce((s, b) => s + (settings[b.key] || 0), 0);
  // Jessica has no variable budget in the system yet (she uses allocations)
  const combinedVariable = vadimVariable;

  const vadimSavings     = VADIM_SAVINGS.reduce((s, sv) => s + (settings[sv.key] || 0), 0);
  const jessicaSavPct    = (settings['jessica_alloc_savings'] || 0) + (settings['jessica_alloc_roth'] || 0);
  const jessicaSavings   = Math.round(jessicaMonthly * jessicaSavPct / 100 * 100) / 100;
  const combinedSavings  = vadimSavings + jessicaSavings;

  const vadimDisc    = Math.max(0, vadimMonthly  - vadimFixedTotal  - vadimVariable  - vadimSavings);
  const jessicaDisc  = Math.max(0, jessicaMonthly - jessicaFixedTotal - 0             - jessicaSavings);
  const combinedDisc = vadimDisc + jessicaDisc;

  const vadimRate    = vadimMonthly   > 0 ? ((vadimSavings   / vadimMonthly)   * 100).toFixed(1) : '0.0';
  const jessicaRate  = jessicaMonthly > 0 ? ((jessicaSavings / jessicaMonthly) * 100).toFixed(1) : '0.0';
  const combinedRate = totalMonthly   > 0 ? ((combinedSavings / totalMonthly)  * 100).toFixed(1) : '0.0';

  const totalAssets = (accounts || [])
    .filter((a) => !['credit', 'store_credit', 'mortgage', 'auto_loan', 'personal_loan', 'student_loan'].includes(a.type))
    .reduce((s, a) => s + (a.balance || 0), 0);
  const totalDebt = (accounts || [])
    .filter((a) => ['credit', 'store_credit', 'mortgage', 'auto_loan', 'personal_loan', 'student_loan'].includes(a.type))
    .reduce((s, a) => s + (a.balance || 0), 0);

  const rothVadim       = (accounts || []).find((a) => a.id === 'roth_ira_vadim');
  const rothJessica     = (accounts || []).find((a) => a.id === 'roth_ira_jessica');
  const combinedRothYTD = (rothVadim?.ytdContributions || 0) + (rothJessica?.ytdContributions || 0);
  const rothTarget      = 14000;

  const rows = [
    { label: 'Income',         vadim: vadimMonthly,    jessica: jessicaMonthly,    combined: totalMonthly,    color: '#4ADE80' },
    { label: 'Fixed Expenses', vadim: vadimFixedTotal,  jessica: jessicaFixedTotal,  combined: combinedFixed,   color: '#F87171', neg: true },
    { label: 'Variable Budgets', vadim: vadimVariable,  jessica: 0,                  combined: combinedVariable, color: '#FBBF24', neg: true },
    { label: 'Savings',        vadim: vadimSavings,    jessica: jessicaSavings,    combined: combinedSavings, color: '#4ADE80', neg: true },
    { label: 'Discretionary',  vadim: vadimDisc,       jessica: jessicaDisc,       combined: combinedDisc,    color: '#A78BFA', bold: true },
    { label: 'Savings Rate',   vadim: `${vadimRate}%`, jessica: `${jessicaRate}%`, combined: `${combinedRate}%`, color: '#D4AF37', isRate: true },
  ];

  return (
    <div className="fbp-view">
      {/* 3-column combined table */}
      <div className="fbp-section">
        <SectionHeader title="Combined Budget Breakdown" icon="🏠" />
        <div className="fbp-household-table">
          <div className="fbp-household-head">
            <span />
            <span style={{ color: '#60A5FA' }}>👨 Vadim</span>
            <span style={{ color: '#F472B6' }}>👩 Jessica</span>
            <span style={{ color: '#4ADE80' }}>🏠 Combined</span>
          </div>
          {rows.map(({ label, vadim, jessica, combined, color, neg, bold, isRate }) => (
            <div key={label} className={`fbp-household-row ${bold ? 'fbp-total-row' : ''}`}>
              <span className="fbp-row-label">{label}</span>
              <span style={{ color: color || undefined }}>
                {isRate ? vadim : `${neg ? '−' : ''}${typeof vadim === 'number' ? formatCurrencyFull(vadim) : vadim}`}
              </span>
              <span style={{ color: color || undefined }}>
                {isRate ? jessica : `${neg ? '−' : ''}${typeof jessica === 'number' ? formatCurrencyFull(jessica) : jessica}`}
              </span>
              <span style={{ color: color || undefined, fontWeight: bold ? 700 : undefined }}>
                {isRate ? combined : `${neg ? '−' : ''}${typeof combined === 'number' ? formatCurrencyFull(combined) : combined}`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Net Worth */}
      <div className="fbp-section">
        <SectionHeader title="Net Worth Snapshot" icon="💎" />
        <div className="fbp-table">
          <div className="fbp-table-row"><span className="fbp-row-label">Total Assets</span><span className="positive">{formatCurrencyFull(totalAssets)}</span></div>
          <div className="fbp-table-row"><span className="fbp-row-label">Total Debt</span><span className="negative">−{formatCurrencyFull(totalDebt)}</span></div>
          <div className="fbp-table-row fbp-total-row">
            <span>Net Worth</span>
            <span className={totalAssets - totalDebt >= 0 ? 'positive fbp-bold' : 'negative fbp-bold'}>
              {formatCurrencyFull(totalAssets - totalDebt)}
            </span>
          </div>
        </div>
      </div>

      {/* Combined Roth */}
      <div className="fbp-section">
        <SectionHeader title="Combined Roth IRA (2025)" icon="📈" />
        <div className="fbp-table">
          <div className="fbp-table-row"><span className="fbp-row-label">YTD Contributed</span><span style={{ color: '#D4AF37' }}>{formatCurrencyFull(combinedRothYTD)}</span></div>
          <div className="fbp-table-row"><span className="fbp-row-label">Annual Limit (2 people)</span><span>{formatCurrencyFull(rothTarget)}</span></div>
          <div className="fbp-table-row fbp-total-row">
            <span>Remaining (deadline Apr 15, 2026)</span>
            <span style={{ color: '#F87171' }}>{formatCurrencyFull(Math.max(0, rothTarget - combinedRothYTD))}</span>
          </div>
        </div>
        <div className="progress-bar-wrap" style={{ margin: '8px 14px 4px' }}>
          <div className="progress-bar-fill" style={{ width: `${Math.min((combinedRothYTD / rothTarget) * 100, 100)}%`, backgroundColor: '#D4AF37' }} />
        </div>
      </div>

      {/* Joint contributions */}
      <div className="fbp-section">
        <SectionHeader title="Joint Contributions" icon="🤝" />
        <div className="fbp-table">
          <div className="fbp-table-row">
            <span className="fbp-row-label">Capital One Joint Savings</span>
            <span>{formatCurrencyFull(
              (settings['vadim_savings_cap1_monthly'] || 0) +
              Math.round(jessicaMonthly * (settings['jessica_alloc_savings'] || 0) / 100 * 100) / 100
            )}/mo</span>
          </div>
          <div className="fbp-table-row">
            <span className="fbp-row-label">Ameriprise Joint Brokerage</span>
            <span>{formatCurrencyFull(settings['vadim_savings_brokerage_monthly'] || 0)}/mo</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MAIN PANEL ────────────────────────────────────────────────────────────────
export default function FullBudgetPlanPanel() {
  const [settings, setSettings]   = useLocalStorage('budget_settings',           DEFAULT_BUDGET_SETTINGS);
  const [accounts, setAccounts]   = useLocalStorage('budget_accounts',            DEFAULT_ACCOUNTS);
  const [recurringExpenses, setRecurringExpenses] = useLocalStorage('budget_recurring_expenses', DEFAULT_RECURRING_EXPENSES);
  const [activeTab, setActiveTab] = useState('vadim');

  const setSetting = (key, value) => {
    setSettings((prev) => ({ ...(prev || {}), [key]: value }));
  };

  const TABS = [
    { id: 'vadim',     label: '👨 Vadim'     },
    { id: 'jessica',   label: '👩 Jessica'   },
    { id: 'household', label: '🏠 Household' },
  ];

  return (
    <div className="fbp-container">
      <div className="fbp-tab-bar">
        {TABS.map((t) => (
          <button key={t.id} className={`fbp-tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {activeTab === 'vadim' && (
        <VadimView
          settings={settings || {}} setSetting={setSetting}
          accounts={accounts}       setAccounts={setAccounts}
          recurringExpenses={recurringExpenses} setRecurringExpenses={setRecurringExpenses}
        />
      )}
      {activeTab === 'jessica' && (
        <JessicaView
          settings={settings || {}} setSetting={setSetting}
          recurringExpenses={recurringExpenses} setRecurringExpenses={setRecurringExpenses}
        />
      )}
      {activeTab === 'household' && (
        <HouseholdView settings={settings || {}} accounts={accounts} recurringExpenses={recurringExpenses} />
      )}
    </div>
  );
}
