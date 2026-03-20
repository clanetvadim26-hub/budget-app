import React from 'react';
import ExpenseDonutChart from '../charts/ExpenseDonutChart';
import ExpenseBarChart from '../charts/ExpenseBarChart';
import CategoryBadge from '../CategoryBadge';
import { formatCurrency } from '../../utils/calculations';
import { getCategoryById } from '../../data/categories';

export default function ExpenseBreakdownPanel({ expensesByCategory, totalExpenses, expenses, viewMode }) {
  const sorted = Object.entries(expensesByCategory)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a);

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Expense Breakdown</h2>
        <span className="panel-subtitle">{viewMode === 'monthly' ? 'This Month' : 'This Week'}</span>
      </div>

      <div className="charts-row">
        <div className="chart-box">
          <div className="chart-title">Spending Distribution</div>
          <ExpenseDonutChart expensesByCategory={expensesByCategory} />
        </div>
        <div className="chart-box">
          <div className="chart-title">Top Categories</div>
          <ExpenseBarChart expensesByCategory={expensesByCategory} />
        </div>
      </div>

      <div className="category-table">
        <div className="table-header">
          <span>Category</span>
          <span>Amount</span>
          <span>% of Total</span>
        </div>
        {sorted.length === 0 && (
          <div className="empty-state">No expenses recorded for this period.</div>
        )}
        {sorted.map(([catId, amount]) => {
          const pct = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
          return (
            <div key={catId} className="table-row">
              <CategoryBadge categoryId={catId} />
              <span className="table-amount">{formatCurrency(amount)}</span>
              <span className="table-pct">
                <span className="pct-bar-wrap">
                  <span className="pct-bar" style={{ width: `${pct}%` }} />
                </span>
                {pct.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>

      {expenses.length > 0 && (
        <div className="recent-transactions">
          <div className="chart-title" style={{ marginBottom: 12 }}>Recent Transactions</div>
          {expenses
            .slice()
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 10)
            .map((exp) => {
              const cat = getCategoryById(exp.category);
              return (
                <div key={exp.id} className="transaction-row">
                  <span className="txn-icon">{cat.icon}</span>
                  <span className="txn-desc">
                    <div className="txn-category">{cat.label}</div>
                    {exp.description && <div className="txn-note">{exp.description}</div>}
                  </span>
                  <span className="txn-date">{exp.date}</span>
                  <span className="txn-amount">{formatCurrency(exp.amount)}</span>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
