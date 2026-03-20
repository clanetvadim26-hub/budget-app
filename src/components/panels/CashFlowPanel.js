import React from 'react';
import CashFlowLineChart from '../charts/CashFlowLineChart';
import { formatCurrency } from '../../utils/calculations';

export default function CashFlowPanel({ chartData }) {
  const avgIncome = chartData.reduce((s, d) => s + d.income, 0) / (chartData.length || 1);
  const avgExpenses = chartData.reduce((s, d) => s + d.expenses, 0) / (chartData.length || 1);
  const avgNet = avgIncome - avgExpenses;

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Cash Flow Timeline</h2>
        <span className="panel-subtitle">Last 6 Months</span>
      </div>

      <div className="cashflow-summary">
        <div className="cf-stat">
          <div className="cf-stat-label">Avg Monthly Income</div>
          <div className="cf-stat-value positive">{formatCurrency(avgIncome)}</div>
        </div>
        <div className="cf-stat">
          <div className="cf-stat-label">Avg Monthly Expenses</div>
          <div className="cf-stat-value negative">{formatCurrency(avgExpenses)}</div>
        </div>
        <div className="cf-stat">
          <div className="cf-stat-label">Avg Monthly Net</div>
          <div className={`cf-stat-value ${avgNet >= 0 ? 'positive' : 'negative'}`}>{formatCurrency(avgNet)}</div>
        </div>
      </div>

      <CashFlowLineChart data={chartData} />

      <div className="cashflow-table">
        <div className="table-header">
          <span>Month</span>
          <span>Income</span>
          <span>Expenses</span>
          <span>Net</span>
        </div>
        {chartData.map((row) => (
          <div key={row.month} className="table-row">
            <span className="month-label">{row.month}</span>
            <span className="positive">{formatCurrency(row.income)}</span>
            <span className="negative">{formatCurrency(row.expenses)}</span>
            <span className={row.net >= 0 ? 'positive' : 'negative'}>{formatCurrency(row.net)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
