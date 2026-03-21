import React, { useState } from 'react';
import { formatCurrencyFull, formatCurrency } from '../../utils/calculations';

// Vadim's monthly budget plan (from spec)
const MONTHLY_INCOME = 4400;

const FIXED_EXPENSES = [
  { name: 'Rent (via Bilt CC)',        amount: 1435,   icon: '🏠' },
  { name: 'Car Payment',               amount: 397,    icon: '🚗' },
  { name: 'Phone Bill',                amount: 135,    icon: '📱' },
  { name: 'WiFi / Internet',           amount: 57,     icon: '📡' },
  { name: 'Claude AI',                 amount: 30,     icon: '🤖' },
  { name: 'iCloud+',                   amount: 3,      icon: '☁️' },
  { name: 'Amazon Prime',              amount: 8,      icon: '📦' },
  { name: 'Wells Fargo CC Payment',    amount: 177.41, icon: '💳' },
  { name: 'Car Insurance (monthly equiv.)', amount: 311.17, icon: '🚗' },
];

const VARIABLE_BUDGETS = [
  { name: 'Groceries',    amount: 300, icon: '🛒' },
  { name: 'Gas',          amount: 160, icon: '⛽' },
  { name: 'Dining Out',   amount: 150, icon: '🍽️' },
];

const SAVINGS = [
  { name: 'Capital One Joint Savings', amount: 400,    icon: '💰', note: '2× $200/paycheck' },
  { name: 'Roth IRA 2025',             amount: 583.34, icon: '📈', note: 'until Apr 15' },
  { name: 'Ameriprise Brokerage',      amount: 200,    icon: '💼', note: '2× $100/paycheck' },
];

const FIXED_TOTAL    = FIXED_EXPENSES.reduce((s, e) => s + e.amount, 0);
const VARIABLE_TOTAL = VARIABLE_BUDGETS.reduce((s, e) => s + e.amount, 0);
const SAVINGS_TOTAL  = SAVINGS.reduce((s, e) => s + e.amount, 0);
const DISCRETIONARY  = MONTHLY_INCOME - FIXED_TOTAL - VARIABLE_TOTAL - SAVINGS_TOTAL;

function BudgetRow({ icon, name, amount, note, amountColor }) {
  return (
    <div className="bp-row">
      <span className="bp-row-icon">{icon}</span>
      <span className="bp-row-name">
        {name}
        {note && <span className="bp-row-note"> · {note}</span>}
      </span>
      <span className="bp-row-amount" style={{ color: amountColor }}>{formatCurrencyFull(amount)}</span>
    </div>
  );
}

function Section({ title, total, totalColor, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bp-section">
      <div className="bp-section-header" onClick={() => setOpen(!open)}>
        <span className="bp-section-title">{title}</span>
        <span className="bp-section-total" style={{ color: totalColor }}>{formatCurrencyFull(total)}</span>
        <span className="bp-section-toggle">{open ? '▲' : '▼'}</span>
      </div>
      {open && <div className="bp-section-body">{children}</div>}
    </div>
  );
}

export default function BudgetPlanPanel() {
  return (
    <div className="panel bp-panel">
      <div className="panel-header">
        <h2>👨 Vadim's Monthly Budget Plan</h2>
        <span className="panel-subtitle">2× $2,200 bi-weekly paychecks</span>
      </div>

      {/* Income hero */}
      <div className="bp-income-hero">
        <div className="bp-income-label">Monthly Take-Home</div>
        <div className="bp-income-amount">{formatCurrency(MONTHLY_INCOME)}</div>
        <div className="bp-income-sub">2 paychecks × $2,200</div>
      </div>

      {/* Visual bar */}
      <div className="bp-bar-wrap">
        {[
          { label: 'Fixed', value: FIXED_TOTAL,    color: '#F87171' },
          { label: 'Variable', value: VARIABLE_TOTAL, color: '#FBBF24' },
          { label: 'Savings', value: SAVINGS_TOTAL,  color: '#4ADE80' },
          { label: 'Discretionary', value: Math.max(0, DISCRETIONARY), color: '#A78BFA' },
        ].map((seg) => (
          <div
            key={seg.label}
            className="bp-bar-seg"
            style={{
              width: `${(seg.value / MONTHLY_INCOME) * 100}%`,
              background: seg.color,
            }}
            title={`${seg.label}: ${formatCurrencyFull(seg.value)}`}
          />
        ))}
      </div>
      <div className="bp-bar-legend">
        {[
          { label: 'Fixed Bills', color: '#F87171' },
          { label: 'Variable', color: '#FBBF24' },
          { label: 'Savings', color: '#4ADE80' },
          { label: 'Discretionary', color: '#A78BFA' },
        ].map((l) => (
          <span key={l.label} className="bp-legend-item">
            <span className="bp-legend-dot" style={{ background: l.color }} />
            {l.label}
          </span>
        ))}
      </div>

      {/* Collapsible sections */}
      <div className="bp-sections">
        <Section title="Fixed Expenses" total={FIXED_TOTAL} totalColor="#F87171" defaultOpen>
          {FIXED_EXPENSES.map((e) => (
            <BudgetRow key={e.name} {...e} amountColor="#F87171" />
          ))}
        </Section>

        <Section title="Variable Budgets" total={VARIABLE_TOTAL} totalColor="#FBBF24">
          {VARIABLE_BUDGETS.map((e) => (
            <BudgetRow key={e.name} {...e} amountColor="#FBBF24" />
          ))}
        </Section>

        <Section title="Savings & Investments" total={SAVINGS_TOTAL} totalColor="#4ADE80">
          {SAVINGS.map((e) => (
            <BudgetRow key={e.name} {...e} amountColor="#4ADE80" />
          ))}
        </Section>

        {/* Discretionary */}
        <div className="bp-section">
          <div className="bp-section-header bp-discretionary-header">
            <span className="bp-section-title">🎉 Discretionary</span>
            <span className="bp-section-total" style={{ color: '#A78BFA' }}>
              {formatCurrencyFull(Math.max(0, DISCRETIONARY))}/mo
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
