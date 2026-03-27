import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { formatCurrencyFull } from '../utils/calculations';
import {
  calcVadimAllocation, getVadimMessage,
} from '../utils/paycheckAllocation';
import { useLocalStorage } from '../hooks/useLocalStorage';

const SLICE_COLORS = {
  bills:        '#F87171',
  carIns:       '#FBBF24',
  jointSavings: '#4ADE80',
  rothIRA:      '#D4AF37',
  brokerage:    '#38BDF8',
  groceries:    '#86EFAC',
  gas:          '#FDE68A',
  dining:       '#FB923C',
  discretionary:'#A78BFA',
};

function AllocationTooltip({ active, payload }) {
  if (active && payload?.length) {
    return (
      <div className="chart-tooltip">
        <div>{payload[0].name}</div>
        <div className="tooltip-amount">{formatCurrencyFull(payload[0].value)}</div>
      </div>
    );
  }
  return null;
}

export default function PaycheckAllocationModal({ paycheckItem, recurringExpenses, confirmedCount, onConfirm, onClose }) {
  const paydayDate = paycheckItem?.date || new Date();

  const alloc = useMemo(
    () => calcVadimAllocation(paydayDate, recurringExpenses),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [paycheckItem?.key],
  );

  const motivationalMsg = getVadimMessage(confirmedCount || 0);

  const pieData = [
    { name: 'Bills Due',      value: alloc.billsTotal,             color: SLICE_COLORS.bills },
    { name: 'Car Insurance',  value: alloc.carInsAllocation,       color: SLICE_COLORS.carIns },
    { name: 'Joint Savings',  value: alloc.savings.jointSavings,   color: SLICE_COLORS.jointSavings },
    alloc.savings.isRoth
      ? { name: 'Roth IRA',   value: alloc.savings.rothAmount,     color: SLICE_COLORS.rothIRA }
      : null,
    { name: 'Brokerage',      value: alloc.savings.brokerage,      color: SLICE_COLORS.brokerage },
    { name: 'Groceries',      value: alloc.variable.groceries,     color: SLICE_COLORS.groceries },
    { name: 'Gas',            value: alloc.variable.gas,           color: SLICE_COLORS.gas },
    { name: 'Dining Out',     value: alloc.variable.dining,        color: SLICE_COLORS.dining },
    { name: 'Discretionary',  value: alloc.discretionary,          color: SLICE_COLORS.discretionary },
  ].filter(Boolean).filter((d) => d.value > 0);

  const [, setDeferredPaychecks] = useLocalStorage('budget_deferred_paychecks', {});

  const handleConfirm = () => {
    onConfirm(paycheckItem);
  };

  const handleDefer = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const deferUntil = tomorrow.toISOString().slice(0, 10);
    setDeferredPaychecks((prev) => ({ ...prev, [paycheckItem.key]: { deferUntil } }));
    onClose();
  };

  return (
    <div className="pa-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pa-modal">
        {/* Header */}
        <div className="pa-header">
          <div>
            <h2 className="pa-title">💰 Paycheck Allocation</h2>
            <div className="pa-subtitle">
              👨 Vadim — {format(paydayDate, 'MMMM d, yyyy')}
            </div>
          </div>
          <button className="pa-close" onClick={onClose}>×</button>
        </div>

        {/* Paycheck total */}
        <div className="pa-total-banner">
          <span className="pa-total-label">Net Paycheck</span>
          <span className="pa-total-amount">{formatCurrencyFull(alloc.paycheck)}</span>
        </div>

        {/* Motivational message */}
        <div className="pa-motivational">"{motivationalMsg}"</div>

        {/* Pie chart + legend */}
        <div className="pa-chart-wrap">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%" cy="50%"
                innerRadius={55} outerRadius={85}
                paddingAngle={2}
                dataKey="value"
              >
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip content={<AllocationTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div className="pa-legend">
            {pieData.map((d) => (
              <div key={d.name} className="pa-legend-item">
                <span className="pa-legend-dot" style={{ background: d.color }} />
                <span className="pa-legend-name">{d.name}</span>
                <span className="pa-legend-val">{formatCurrencyFull(d.value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Breakdown sections */}
        <div className="pa-sections">

          {/* Bills due this period */}
          <div className="pa-section">
            <div className="pa-section-title" style={{ color: SLICE_COLORS.bills }}>
              📋 Bills Due This Pay Period
              <span className="pa-section-total">{formatCurrencyFull(alloc.totalBills)}</span>
            </div>
            {alloc.bills.map((bill) => (
              <div key={bill.id} className="pa-row">
                <span>{bill.name}{bill.isOneTime ? ' 🔴 Last!' : ''}</span>
                <span>
                  {bill.isVariable ? '~' : ''}{formatCurrencyFull(bill.amount)}
                  <span className="pa-due-date"> due {bill.dueDate}</span>
                </span>
              </div>
            ))}
            <div className="pa-row pa-subdued">
              <span>Car Insurance (monthly allocation)</span>
              <span>{formatCurrencyFull(alloc.carInsAllocation)}</span>
            </div>
            {alloc.overBudget && (
              <div className="pa-warning">
                ⚠ Total allocation exceeds paycheck — heavy bill month. Some may carry from savings.
              </div>
            )}
          </div>

          {/* Savings & Investments */}
          <div className="pa-section">
            <div className="pa-section-title" style={{ color: SLICE_COLORS.jointSavings }}>
              📈 Savings & Investments
              <span className="pa-section-total">{formatCurrencyFull(alloc.savings.total)}</span>
            </div>
            <div className="pa-row">
              <span>Capital One Joint Savings</span>
              <span>{formatCurrencyFull(alloc.savings.jointSavings)}</span>
            </div>
            {alloc.savings.isRoth && (
              <div className="pa-row">
                <span>
                  Roth IRA 2025
                  <span className="pa-chip gold"> until Apr 15</span>
                </span>
                <span style={{ color: '#D4AF37' }}>{formatCurrencyFull(alloc.savings.rothAmount)}</span>
              </div>
            )}
            {!alloc.savings.isRoth && (
              <div className="pa-row pa-subdued">
                <span>Roth IRA → Redirected to Brokerage</span>
                <span>+{formatCurrencyFull(291.67)}</span>
              </div>
            )}
            <div className="pa-row">
              <span>
                Ameriprise Joint Brokerage
                {!alloc.savings.isRoth && <span className="pa-chip blue"> +Roth redirect</span>}
              </span>
              <span style={{ color: '#38BDF8' }}>{formatCurrencyFull(alloc.savings.brokerage)}</span>
            </div>
            {alloc.is401kSoon && (
              <div className="pa-row pa-subdued">
                <span>401k <span className="pa-chip">Coming June 2026</span></span>
                <span>—</span>
              </div>
            )}
          </div>

          {/* Variable spending */}
          <div className="pa-section">
            <div className="pa-section-title" style={{ color: SLICE_COLORS.groceries }}>
              🛒 Variable Spending Budgets (½ monthly)
              <span className="pa-section-total">{formatCurrencyFull(alloc.variable.total)}</span>
            </div>
            <div className="pa-row">
              <span>Groceries</span>
              <span>{formatCurrencyFull(alloc.variable.groceries)}</span>
            </div>
            <div className="pa-row">
              <span>Gas</span>
              <span>{formatCurrencyFull(alloc.variable.gas)}</span>
            </div>
            <div className="pa-row">
              <span>Dining Out</span>
              <span>{formatCurrencyFull(alloc.variable.dining)}</span>
            </div>
          </div>

          {/* Discretionary */}
          <div className="pa-section pa-discretionary-section">
            <div className="pa-row pa-discretionary-row">
              <span>🎉 Discretionary Spending</span>
              <span style={{ color: alloc.discretionary > 0 ? '#4ADE80' : '#F87171', fontWeight: 700 }}>
                {formatCurrencyFull(alloc.discretionary)}
              </span>
            </div>
          </div>
        </div>

        {/* Confirm button */}
        <div className="pa-footer">
          <button className="pa-confirm-btn" onClick={handleConfirm}>
            ✓ Confirm & Post Income
          </button>
          <button className="pa-skip-btn" onClick={onClose}>Remind Me Later</button>
          <button className="paycheck-defer-btn" onClick={handleDefer}>
            ❌ Not Paid Yet — Ask Me Tomorrow
          </button>
        </div>
      </div>
    </div>
  );
}
