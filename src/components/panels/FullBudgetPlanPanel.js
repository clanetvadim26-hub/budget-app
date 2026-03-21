import React, { useState } from 'react';
import { addMonths, format, differenceInDays, parseISO } from 'date-fns';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { DEFAULT_ACCOUNTS } from '../../data/accounts';
import { DEFAULT_RECURRING_EXPENSES } from '../../data/defaultRecurring';
import { DEFAULT_BUDGET_SETTINGS } from '../../data/defaultBudgetSettings';
import { formatCurrencyFull } from '../../utils/calculations';
import { getCategoryById } from '../../data/categories';
import InlineEdit from '../InlineEdit';

// ── Helpers ────────────────────────────────────────────────────────────
function deepSet(obj, path, value) {
  if (path.length === 0) return value;
  const [head, ...rest] = path;
  return { ...obj, [head]: deepSet(obj[head] || {}, rest, value) };
}

function projectedMonths(balance, target, monthly) {
  if (!monthly || monthly <= 0) return null;
  const gap = target - balance;
  if (gap <= 0) return 0;
  return Math.ceil(gap / monthly);
}

function projectedDateLabel(balance, target, monthly) {
  const months = projectedMonths(balance, target, monthly);
  if (months === null) return 'Set contribution to project';
  if (months === 0)    return 'Goal reached!';
  const date = addMonths(new Date(), months);
  return `Goal in ~${months} month${months !== 1 ? 's' : ''} (${format(date, 'MMM yyyy')})`;
}

const VADIM_PAYCHECK = 2200;

// ── Sub-components ─────────────────────────────────────────────────────
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
        <div className="fbp-summary-row">
          <span>Total Income</span>
          <span className="fbp-summary-val positive">{formatCurrencyFull(income)}</span>
        </div>
        <div className="fbp-summary-row">
          <span>Fixed Expenses</span>
          <span className="fbp-summary-val" style={{ color: '#F87171' }}>−{formatCurrencyFull(fixed)}</span>
        </div>
        <div className="fbp-summary-row">
          <span>Variable Budgets</span>
          <span className="fbp-summary-val" style={{ color: '#FBBF24' }}>−{formatCurrencyFull(variable)}</span>
        </div>
        <div className="fbp-summary-row">
          <span>Savings & Investments</span>
          <span className="fbp-summary-val" style={{ color: '#4ADE80' }}>−{formatCurrencyFull(savings)}</span>
        </div>
        <div className="fbp-summary-row fbp-summary-disc">
          <span>Discretionary</span>
          <span className="fbp-summary-val" style={{ color: disc > 0 ? '#A78BFA' : '#F87171', fontWeight: 700 }}>
            {formatCurrencyFull(income - fixed - variable - savings)}
          </span>
        </div>
        <div className="fbp-summary-row">
          <span>Savings Rate</span>
          <span className="fbp-summary-val" style={{ color: srColor }}>{savingsRate}%</span>
        </div>
      </div>
      <div className="fbp-bar-wrap">
        {segs.map((s) => (
          <div
            key={s.label}
            className="fbp-bar-seg"
            style={{ width: `${Math.max(0, (s.value / total) * 100)}%`, background: s.color }}
            title={`${s.label}: ${formatCurrencyFull(s.value)}`}
          />
        ))}
      </div>
      <div className="fbp-bar-legend">
        {segs.map((s) => (
          <span key={s.label} className="fbp-legend-item">
            <span className="fbp-legend-dot" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── VADIM VIEW ─────────────────────────────────────────────────────────
function VadimView({ settings, setSettings, accounts, setAccounts, recurringExpenses, setRecurringExpenses }) {
  const vSet = settings.vadim || {};

  const updateVadim = (path, value) => {
    setSettings((prev) => deepSet(prev, ['vadim', ...path], value));
  };

  const updateSavings = (accountId, field, value) => {
    const monthly     = field === 'monthly'     ? value : (vSet.savings?.[accountId]?.monthly     || 0);
    const perPaycheck = field === 'perPaycheck' ? value : (vSet.savings?.[accountId]?.perPaycheck || 0);
    setSettings((prev) => deepSet(prev, ['vadim', 'savings', accountId], {
      ...(prev.vadim?.savings?.[accountId] || {}),
      monthly,
      perPaycheck: field === 'monthly' ? monthly / 2 : perPaycheck,
      [field]: value,
    }));
    // Sync to accounts
    if (field === 'monthly') {
      setAccounts((prev) => prev.map((a) => a.id === accountId ? { ...a, monthlyContribution: value } : a));
    }
  };

  const updateVarBudget = (key, value) => {
    setSettings((prev) => deepSet(prev, ['vadim', 'variableBudgets', key], value));
  };

  const updateExpense = (id, field, value) => {
    setRecurringExpenses((prev) => prev.map((e) => e.id === id ? { ...e, [field]: field === 'amount' ? Number(value) : value } : e));
  };

  const paycheck       = vSet.paycheck    || VADIM_PAYCHECK;
  const monthlyIncome  = Math.round((paycheck * 26) / 12 * 100) / 100;
  const savingsObj     = vSet.savings     || {};
  const varBudgets     = vSet.variableBudgets || {};

  const fixedExpenses  = (recurringExpenses || []).filter((e) => {
    const meta = e.metadata || {};
    return !meta.isBudget && e.active;
  });

  const totalFixed    = fixedExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const totalVariable = Object.values(varBudgets).reduce((s, v) => s + (v || 0), 0);
  const totalSavings  = Object.values(savingsObj).reduce((s, sv) => s + (sv?.monthly || 0), 0);

  const VARIABLE_LABELS = {
    groceries: { label: 'Groceries', icon: '🛒' },
    gas:       { label: 'Gas',       icon: '⛽' },
    dining_out:{ label: 'Dining Out',icon: '🍽️' },
    electricity:{ label: 'Electricity', icon: '⚡' },
    water:     { label: 'Water',     icon: '💧' },
  };

  return (
    <div className="fbp-view">
      {/* ── Income ── */}
      <div className="fbp-section">
        <SectionHeader title="Income" icon="💰" total={monthlyIncome} totalColor="#4ADE80" />
        <div className="fbp-table">
          <div className="fbp-table-row">
            <span className="fbp-row-label">Bi-weekly paycheck (net)</span>
            <span>
              <InlineEdit
                value={paycheck}
                onSave={(v) => updateVadim(['paycheck'], v)}
                formatFn={formatCurrencyFull}
                className="fbp-ie"
              />
            </span>
          </div>
          <div className="fbp-table-row fbp-subdued">
            <span>Monthly equivalent (×26/12)</span>
            <span>{formatCurrencyFull(monthlyIncome)}</span>
          </div>
          <div className="fbp-table-row">
            <span className="fbp-row-label">Next payday</span>
            <span>
              <InlineEdit
                value={vSet.nextPayday || '2026-03-21'}
                onSave={(v) => updateVadim(['nextPayday'], v)}
                type="text"
                formatFn={(v) => v}
                className="fbp-ie"
                prefix=""
              />
            </span>
          </div>
        </div>
      </div>

      {/* ── Fixed Expenses ── */}
      <div className="fbp-section">
        <SectionHeader title="Fixed Expenses" icon="📋" total={totalFixed} totalColor="#F87171" />
        <div className="fbp-table fbp-expenses-table">
          <div className="fbp-table-head">
            <span>Bill</span>
            <span>Amount</span>
            <span className="fbp-col-due">Due</span>
          </div>
          {fixedExpenses.map((exp) => {
            const cat   = getCategoryById(exp.category);
            const meta  = exp.metadata || {};
            return (
              <div key={exp.id} className="fbp-table-row">
                <span className="fbp-row-name">
                  {cat.icon} {exp.name}
                  {meta.isOneTime  && <span className="fbp-chip red">One-time</span>}
                  {meta.isPrepaid  && <span className="fbp-chip yellow">Prepaid</span>}
                  {meta.isVariable && <span className="fbp-chip blue">Variable</span>}
                </span>
                <span>
                  <InlineEdit
                    value={exp.amount}
                    onSave={(v) => updateExpense(exp.id, 'amount', v)}
                    formatFn={formatCurrencyFull}
                    className="fbp-ie"
                  />
                </span>
                <span className="fbp-col-due fbp-subdued">
                  {exp.dueDay ? `${exp.dueDay}th` : 'monthly'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Variable Budgets ── */}
      <div className="fbp-section">
        <SectionHeader title="Variable Budgets" icon="🧾" total={totalVariable} totalColor="#FBBF24" />
        <div className="fbp-table">
          {Object.entries(varBudgets).map(([key, amount]) => {
            const meta = VARIABLE_LABELS[key] || { label: key, icon: '💰' };
            return (
              <div key={key} className="fbp-table-row">
                <span className="fbp-row-label">{meta.icon} {meta.label}</span>
                <span>
                  <InlineEdit
                    value={amount}
                    onSave={(v) => updateVarBudget(key, v)}
                    formatFn={formatCurrencyFull}
                    className="fbp-ie"
                    suffix="/mo"
                  />
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Savings & Investments ── */}
      <div className="fbp-section">
        <SectionHeader title="Savings & Investments" icon="📈" total={totalSavings} totalColor="#4ADE80" />
        <div className="fbp-table fbp-savings-table">
          <div className="fbp-table-head fbp-savings-head">
            <span>Account</span>
            <span>Monthly</span>
            <span>/Paycheck</span>
          </div>
          {Object.entries(savingsObj).map(([accountId, sv]) => {
            const acct = (accounts || []).find((a) => a.id === accountId);
            const monthly = sv?.monthly || 0;
            const perPay  = sv?.perPaycheck || (monthly / 2);
            const startDate = sv?.startDate;
            const isFuture  = startDate && new Date(startDate) > new Date();
            const daysTo    = isFuture ? differenceInDays(parseISO(startDate), new Date()) : 0;
            const projected = acct && sv?.targetGoal > 0
              ? projectedDateLabel(acct.balance || 0, sv.targetGoal, monthly)
              : null;

            return (
              <div key={accountId} className={`fbp-table-row fbp-savings-row ${isFuture ? 'fbp-future' : ''}`}>
                <div className="fbp-savings-name">
                  <span>{sv.label || accountId}</span>
                  {isFuture && (
                    <span className="fbp-chip purple">Starts {format(parseISO(startDate), 'MMM yyyy')} · {daysTo}d</span>
                  )}
                  {projected && <span className="fbp-projected">{projected}</span>}
                </div>
                <span>
                  {isFuture ? (
                    <InlineEdit value={monthly} onSave={(v) => updateSavings(accountId, 'monthly', v)} formatFn={formatCurrencyFull} className="fbp-ie" suffix="/mo" />
                  ) : (
                    <InlineEdit value={monthly} onSave={(v) => updateSavings(accountId, 'monthly', v)} formatFn={formatCurrencyFull} className="fbp-ie" suffix="/mo" />
                  )}
                </span>
                <span className="fbp-subdued">
                  {formatCurrencyFull(perPay)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Summary ── */}
      <SummaryBar
        income={monthlyIncome}
        fixed={totalFixed}
        variable={totalVariable}
        savings={totalSavings}
      />
    </div>
  );
}

// ── JESSICA VIEW ───────────────────────────────────────────────────────
function JessicaView({ settings, setSettings, accounts, setAccounts }) {
  const jSet = settings.jessica || {};
  const alloc = jSet.allocations || { household: 40, jointSavings: 10, rothIRA: 10, personal: 40 };
  const estMonthly = jSet.estimatedMonthlyIncome || 2000;
  const allocTotal = Object.values(alloc).reduce((s, v) => s + (v || 0), 0);
  const allocWarning = allocTotal !== 100;

  const updateJessica = (path, value) => setSettings((prev) => deepSet(prev, ['jessica', ...path], value));
  const updateAlloc   = (key, value) => setSettings((prev) => deepSet(prev, ['jessica', 'allocations', key], value));

  const amounts = {
    household:    Math.round(estMonthly * (alloc.household    || 0) / 100 * 100) / 100,
    jointSavings: Math.round(estMonthly * (alloc.jointSavings || 0) / 100 * 100) / 100,
    rothIRA:      Math.round(estMonthly * (alloc.rothIRA      || 0) / 100 * 100) / 100,
    personal:     Math.round(estMonthly * (alloc.personal     || 0) / 100 * 100) / 100,
  };

  const ALLOC_META = [
    { key: 'household',    label: '🏠 Household contribution',  color: '#60A5FA' },
    { key: 'jointSavings', label: '💰 Capital One Joint Savings', color: '#4ADE80' },
    { key: 'rothIRA',      label: '📈 Jessica Roth IRA',        color: '#D4AF37' },
    { key: 'personal',     label: '👩 Personal spending',        color: '#F472B6' },
  ];

  const fixedExpenses = jSet.fixedExpenses || [];
  const totalFixed    = fixedExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const totalSavings  = amounts.jointSavings + amounts.rothIRA;

  return (
    <div className="fbp-view">
      {/* ── Income ── */}
      <div className="fbp-section">
        <SectionHeader title="Income (Variable)" icon="💰" total={estMonthly} totalColor="#4ADE80" />
        <div className="fbp-table">
          <div className="fbp-table-row">
            <span className="fbp-row-label">Estimated monthly income</span>
            <InlineEdit
              value={estMonthly}
              onSave={(v) => updateJessica(['estimatedMonthlyIncome'], v)}
              formatFn={formatCurrencyFull}
              className="fbp-ie"
              suffix="/mo"
            />
          </div>
          <div className="fbp-table-row fbp-subdued">
            <span>Competitive Edge LLC next payday</span>
            <InlineEdit value={jSet.nextCEPayday || '2026-04-01'} type="text" onSave={(v) => updateJessica(['nextCEPayday'], v)} formatFn={(v) => v} className="fbp-ie" prefix="" />
          </div>
          <div className="fbp-table-row fbp-subdued">
            <span>Orange Theory next payday</span>
            <InlineEdit value={jSet.nextOTPayday || '2026-03-27'} type="text" onSave={(v) => updateJessica(['nextOTPayday'], v)} formatFn={(v) => v} className="fbp-ie" prefix="" />
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
            <span>Category</span>
            <span>%</span>
            <span>~Monthly</span>
          </div>
          {ALLOC_META.map(({ key, label, color }) => (
            <div key={key} className="fbp-table-row">
              <span className="fbp-row-label" style={{ color }}>{label}</span>
              <span>
                <InlineEdit
                  value={alloc[key] || 0}
                  onSave={(v) => updateAlloc(key, v)}
                  formatFn={(v) => `${v}%`}
                  suffix=""
                  prefix=""
                  className="fbp-ie"
                  step="1"
                />
              </span>
              <span className="fbp-subdued">{formatCurrencyFull(amounts[key])}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Fixed Expenses ── */}
      {fixedExpenses.length > 0 && (
        <div className="fbp-section">
          <SectionHeader title="Fixed Expenses" icon="📋" total={totalFixed} totalColor="#F87171" />
          <div className="fbp-table">
            {fixedExpenses.map((exp) => (
              <div key={exp.id} className="fbp-table-row">
                <span className="fbp-row-label">💳 {exp.name}</span>
                <InlineEdit
                  value={exp.amount}
                  onSave={(v) => {
                    setSettings((prev) => deepSet(prev, ['jessica', 'fixedExpenses'],
                      (prev.jessica?.fixedExpenses || []).map((e) => e.id === exp.id ? { ...e, amount: v } : e)
                    ));
                  }}
                  formatFn={formatCurrencyFull}
                  className="fbp-ie"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Summary ── */}
      <SummaryBar
        income={estMonthly}
        fixed={totalFixed}
        variable={0}
        savings={totalSavings}
      />
    </div>
  );
}

// ── HOUSEHOLD VIEW ─────────────────────────────────────────────────────
function HouseholdView({ settings, accounts }) {
  const vSet = settings.vadim   || {};
  const jSet = settings.jessica || {};

  const vadimPaycheck    = vSet.paycheck || VADIM_PAYCHECK;
  const vadimMonthly     = Math.round((vadimPaycheck * 26) / 12 * 100) / 100;
  const jessicaMonthly   = jSet.estimatedMonthlyIncome || 2000;
  const totalMonthly     = vadimMonthly + jessicaMonthly;

  const vadimSavings     = Object.values(vSet.savings || {}).reduce((s, sv) => s + (sv?.monthly || 0), 0);
  const jessicaAllocMonthly = jessicaMonthly * ((jSet.allocations?.jointSavings || 0) + (jSet.allocations?.rothIRA || 0)) / 100;
  const totalSavings     = vadimSavings + jessicaAllocMonthly;

  const totalNetWorth    = (accounts || [])
    .filter((a) => !['credit', 'store_credit', 'mortgage', 'auto_loan', 'personal_loan', 'student_loan'].includes(a.type))
    .reduce((s, a) => s + (a.balance || 0), 0);
  const totalDebt        = (accounts || [])
    .filter((a) => ['credit', 'store_credit', 'mortgage', 'auto_loan', 'personal_loan', 'student_loan'].includes(a.type))
    .reduce((s, a) => s + (a.balance || 0), 0);

  const vadimSavingsRate  = vadimMonthly  > 0 ? ((vadimSavings / vadimMonthly) * 100).toFixed(1) : '0.0';
  const jessicaSavingsRate= jessicaMonthly > 0 ? ((jessicaAllocMonthly / jessicaMonthly) * 100).toFixed(1) : '0.0';
  const combinedRate      = totalMonthly > 0 ? ((totalSavings / totalMonthly) * 100).toFixed(1) : '0.0';

  const rothVadim   = (accounts || []).find((a) => a.id === 'roth_ira_vadim');
  const rothJessica = (accounts || []).find((a) => a.id === 'roth_ira_jessica');
  const combinedRothYTD = (rothVadim?.ytdContributions || 0) + (rothJessica?.ytdContributions || 0);
  const rothTarget  = 14000;

  return (
    <div className="fbp-view">
      <div className="fbp-section">
        <SectionHeader title="Combined Income" icon="🏠" total={totalMonthly} totalColor="#4ADE80" />
        <div className="fbp-table">
          <div className="fbp-table-row">
            <span className="fbp-row-label">👨 Vadim (bi-weekly × 26/12)</span>
            <span className="positive">{formatCurrencyFull(vadimMonthly)}</span>
          </div>
          <div className="fbp-table-row">
            <span className="fbp-row-label">👩 Jessica (estimated)</span>
            <span className="positive">{formatCurrencyFull(jessicaMonthly)}</span>
          </div>
          <div className="fbp-table-row fbp-total-row">
            <span>Total Household Income</span>
            <span className="positive fbp-bold">{formatCurrencyFull(totalMonthly)}</span>
          </div>
        </div>
      </div>

      <div className="fbp-section">
        <SectionHeader title="Net Worth Snapshot" icon="💎" />
        <div className="fbp-table">
          <div className="fbp-table-row">
            <span className="fbp-row-label">Total Assets</span>
            <span className="positive">{formatCurrencyFull(totalNetWorth)}</span>
          </div>
          <div className="fbp-table-row">
            <span className="fbp-row-label">Total Debt</span>
            <span className="negative">−{formatCurrencyFull(totalDebt)}</span>
          </div>
          <div className="fbp-table-row fbp-total-row">
            <span>Net Worth</span>
            <span className={totalNetWorth - totalDebt >= 0 ? 'positive fbp-bold' : 'negative fbp-bold'}>
              {formatCurrencyFull(totalNetWorth - totalDebt)}
            </span>
          </div>
        </div>
      </div>

      <div className="fbp-section">
        <SectionHeader title="Savings Rate Comparison" icon="📊" />
        <div className="fbp-table">
          {[
            { label: '👨 Vadim',    rate: vadimSavingsRate,    savings: vadimSavings,         color: '#60A5FA' },
            { label: '👩 Jessica',  rate: jessicaSavingsRate,  savings: jessicaAllocMonthly,  color: '#F472B6' },
            { label: '🏠 Combined', rate: combinedRate,         savings: totalSavings,         color: '#4ADE80' },
          ].map(({ label, rate, savings, color }) => (
            <div key={label} className="fbp-table-row">
              <span className="fbp-row-label">{label}</span>
              <div className="fbp-rate-wrap">
                <div className="fbp-rate-bar-track">
                  <div className="fbp-rate-bar-fill" style={{ width: `${Math.min(Number(rate), 100)}%`, background: color }} />
                </div>
                <span style={{ color, fontWeight: 700, minWidth: 44 }}>{rate}%</span>
                <span className="fbp-subdued">{formatCurrencyFull(savings)}/mo</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="fbp-section">
        <SectionHeader title="Combined Roth IRA (2025)" icon="📈" />
        <div className="fbp-table">
          <div className="fbp-table-row">
            <span className="fbp-row-label">YTD Contributed</span>
            <span style={{ color: '#D4AF37' }}>{formatCurrencyFull(combinedRothYTD)}</span>
          </div>
          <div className="fbp-table-row">
            <span className="fbp-row-label">Annual Limit (2 people)</span>
            <span>{formatCurrencyFull(rothTarget)}</span>
          </div>
          <div className="fbp-table-row fbp-total-row">
            <span>Remaining (deadline Apr 15, 2026)</span>
            <span style={{ color: '#F87171' }}>{formatCurrencyFull(Math.max(0, rothTarget - combinedRothYTD))}</span>
          </div>
        </div>
        <div className="progress-bar-wrap" style={{ margin: '8px 14px 4px' }}>
          <div className="progress-bar-fill" style={{ width: `${Math.min((combinedRothYTD / rothTarget) * 100, 100)}%`, backgroundColor: '#D4AF37' }} />
        </div>
      </div>

      <div className="fbp-section">
        <SectionHeader title="Joint Contributions" icon="🤝" />
        <div className="fbp-table">
          <div className="fbp-table-row">
            <span className="fbp-row-label">Capital One Joint Savings</span>
            <span>{formatCurrencyFull((vSet.savings?.cap1_joint_savings?.monthly || 0) + (jessicaMonthly * (jSet.allocations?.jointSavings || 0) / 100))}/mo</span>
          </div>
          <div className="fbp-table-row">
            <span className="fbp-row-label">Ameriprise Joint Brokerage</span>
            <span>{formatCurrencyFull(vSet.savings?.brokerage_joint?.monthly || 0)}/mo</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MAIN PANEL ─────────────────────────────────────────────────────────
export default function FullBudgetPlanPanel() {
  const [settings, setSettings]               = useLocalStorage('budget_settings',           DEFAULT_BUDGET_SETTINGS);
  const [accounts, setAccounts]               = useLocalStorage('budget_accounts',            DEFAULT_ACCOUNTS);
  const [recurringExpenses, setRecurringExpenses] = useLocalStorage('budget_recurring_expenses', DEFAULT_RECURRING_EXPENSES);
  const [activeTab, setActiveTab]             = useState('vadim');

  const TABS = [
    { id: 'vadim',     label: '👨 Vadim'     },
    { id: 'jessica',   label: '👩 Jessica'   },
    { id: 'household', label: '🏠 Household' },
  ];

  return (
    <div className="fbp-container">
      <div className="fbp-tab-bar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`fbp-tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'vadim' && (
        <VadimView
          settings={settings}
          setSettings={setSettings}
          accounts={accounts}
          setAccounts={setAccounts}
          recurringExpenses={recurringExpenses}
          setRecurringExpenses={setRecurringExpenses}
        />
      )}
      {activeTab === 'jessica' && (
        <JessicaView
          settings={settings}
          setSettings={setSettings}
          accounts={accounts}
          setAccounts={setAccounts}
        />
      )}
      {activeTab === 'household' && (
        <HouseholdView settings={settings} accounts={accounts} />
      )}
    </div>
  );
}
