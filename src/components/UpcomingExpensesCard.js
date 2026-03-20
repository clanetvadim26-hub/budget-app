import React from 'react';
import { format } from 'date-fns';
import { getCategoryById } from '../data/categories';
import { formatCurrency } from '../utils/calculations';

export default function UpcomingExpensesCard({ upcomingExpenses, onMarkPaid }) {
  if (upcomingExpenses.length === 0) return null;

  const totalUnpaid = upcomingExpenses
    .filter((u) => !u.isPaid)
    .reduce((s, u) => s + u.expense.amount, 0);

  return (
    <div className="panel upcoming-panel">
      <div className="panel-header">
        <h2>Upcoming This Month</h2>
        <span className="panel-subtitle">
          {upcomingExpenses.filter((u) => !u.isPaid).length} remaining —{' '}
          <span className="negative">{formatCurrency(totalUnpaid)}</span>
        </span>
      </div>

      <div className="upcoming-list">
        {upcomingExpenses.map((item) => {
          const cat = getCategoryById(item.expense.category);
          const isOverdue = item.daysUntil < 0 && !item.isPaid;
          return (
            <div key={item.key} className={`upcoming-item ${item.isPaid ? 'paid' : ''} ${isOverdue ? 'overdue' : ''}`}>
              <span className="upcoming-icon">{cat.icon}</span>
              <div className="upcoming-info">
                <div className="upcoming-name">{item.expense.name}</div>
                <div className="upcoming-cat">{cat.label}</div>
              </div>
              <div className="upcoming-meta">
                <div className="upcoming-amount">{formatCurrency(item.expense.amount)}</div>
                <div className={`upcoming-date ${isOverdue ? 'negative' : ''}`}>
                  {item.isPaid
                    ? '✓ Paid'
                    : item.daysUntil === 0
                    ? 'Due today'
                    : item.daysUntil < 0
                    ? `${Math.abs(item.daysUntil)}d overdue`
                    : `${format(item.date, 'MMM d')}`}
                </div>
              </div>
              {!item.isPaid && (
                <button className="btn-mark-paid" onClick={() => onMarkPaid(item.key)}>
                  Mark Paid
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
