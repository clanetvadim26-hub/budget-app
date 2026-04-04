import React, { useState, useMemo } from 'react';
import CashFlowLineChart from '../charts/CashFlowLineChart';
import { formatCurrency, getCashFlowDataFromDate } from '../../utils/calculations';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import {
  startOfWeek, endOfWeek, format, addDays,
  startOfMonth, endOfMonth, isWithinInterval,
} from 'date-fns';

function getWeeklyData(incomes, expenses) {
  const now = new Date();
  // Build 8 weeks back
  const weeks = [];
  let cursor = startOfWeek(addDays(now, -49), { weekStartsOn: 1 });
  while (cursor <= now) {
    const wEnd = endOfWeek(cursor, { weekStartsOn: 1 });
    weeks.push({ start: new Date(cursor), end: new Date(wEnd) });
    cursor = addDays(wEnd, 1);
  }
  return weeks.map(w => {
    const label = `${format(w.start, 'M/d')}–${format(w.end, 'M/d')}`;
    const weekIncome = (incomes || [])
      .filter(i => isWithinInterval(new Date(i.date), { start: w.start, end: w.end }))
      .reduce((s, i) => s + Number(i.amount || 0), 0);
    const weekExp = (expenses || [])
      .filter(e => isWithinInterval(new Date(e.date), { start: w.start, end: w.end }))
      .reduce((s, e) => s + Number(e.amount || 0), 0);
    return { month: label, income: weekIncome, expenses: weekExp, net: weekIncome - weekExp };
  });
}

export default function CashFlowPanel() {
  const [mode, setMode] = useState('monthly'); // 'monthly' | 'weekly'
  const [expenses] = useLocalStorage('budget_expenses', []);
  const [incomes]  = useLocalStorage('budget_incomes',  []);

  const now    = new Date();
  const mStart = startOfMonth(now);
  const mEnd   = endOfMonth(now);

  const monthlyData = useMemo(
    () => getCashFlowDataFromDate(incomes, expenses, '2026-03-01'),
    [incomes, expenses]
  );

  const weeklyData = useMemo(
    () => getWeeklyData(incomes, expenses),
    [incomes, expenses]
  );

  const chartData = mode === 'monthly' ? monthlyData : weeklyData;

  // Averages: only count months/weeks with actual data
  const activeRows = chartData.filter(d => d.income > 0 || d.expenses > 0);
  const count = activeRows.length || 1;
  const avgIncome   = activeRows.reduce((s, d) => s + d.income,   0) / count;
  const avgExpenses = activeRows.reduce((s, d) => s + d.expenses, 0) / count;
  const avgNet      = avgIncome - avgExpenses;

  // Current month stats
  const currentIncome = (incomes || [])
    .filter(i => isWithinInterval(new Date(i.date), { start: mStart, end: mEnd }))
    .reduce((s, i) => s + Number(i.amount || 0), 0);
  const currentExpenses = (expenses || [])
    .filter(e => isWithinInterval(new Date(e.date), { start: mStart, end: mEnd }))
    .reduce((s, e) => s + Number(e.amount || 0), 0);

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Cash Flow Timeline</h2>
        <div style={{ display: 'flex', gap: 6 }}>
          {['monthly', 'weekly'].map(m => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              style={{
                padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: mode === m ? '#D4AF37' : 'transparent',
                color: mode === m ? '#0A0F1E' : '#64748B',
                border: `1px solid ${mode === m ? '#D4AF37' : '#2D3F55'}`,
              }}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="cashflow-summary">
        <div className="cf-stat">
          <div className="cf-stat-label">Avg {mode === 'monthly' ? 'Monthly' : 'Weekly'} Income</div>
          <div className="cf-stat-value positive">{formatCurrency(avgIncome)}</div>
        </div>
        <div className="cf-stat">
          <div className="cf-stat-label">Avg {mode === 'monthly' ? 'Monthly' : 'Weekly'} Expenses</div>
          <div className="cf-stat-value negative">{formatCurrency(avgExpenses)}</div>
        </div>
        <div className="cf-stat">
          <div className="cf-stat-label">Avg {mode === 'monthly' ? 'Monthly' : 'Weekly'} Net</div>
          <div className={`cf-stat-value ${avgNet >= 0 ? 'positive' : 'negative'}`}>{formatCurrency(avgNet)}</div>
        </div>
        <div className="cf-stat">
          <div className="cf-stat-label">This Month Income</div>
          <div className="cf-stat-value positive">{formatCurrency(currentIncome)}</div>
        </div>
        <div className="cf-stat">
          <div className="cf-stat-label">This Month Expenses</div>
          <div className="cf-stat-value negative">{formatCurrency(currentExpenses)}</div>
        </div>
      </div>

      <CashFlowLineChart data={chartData} />

      <div className="cashflow-table">
        <div className="table-header">
          <span>{mode === 'monthly' ? 'Month' : 'Week'}</span>
          <span>Income</span>
          <span>Expenses</span>
          <span>Net</span>
        </div>
        {chartData.map((row) => (
          <div key={row.month} className="table-row">
            <span className="month-label">{row.month}</span>
            <span className={row.income > 0 ? 'positive' : ''}>{formatCurrency(row.income)}</span>
            <span className={row.expenses > 0 ? 'negative' : ''}>{formatCurrency(row.expenses)}</span>
            <span className={row.net >= 0 ? 'positive' : 'negative'}>{formatCurrency(row.net)}</span>
          </div>
        ))}
        {chartData.length === 0 && (
          <div className="empty-state">No data yet. Add income and expenses to see trends.</div>
        )}
      </div>
    </div>
  );
}
