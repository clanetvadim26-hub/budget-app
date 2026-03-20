import React from 'react';
import { formatCurrency } from '../utils/calculations';

export default function StatCard({ label, amount, subtitle, variant = 'default', icon }) {
  const getAmountClass = () => {
    if (variant === 'income') return 'stat-amount positive';
    if (variant === 'expense') return 'stat-amount negative';
    if (variant === 'net') return amount >= 0 ? 'stat-amount positive' : 'stat-amount negative';
    return 'stat-amount';
  };

  return (
    <div className={`stat-card ${variant}`}>
      <div className="stat-header">
        <span className="stat-icon">{icon}</span>
        <span className="stat-label">{label}</span>
      </div>
      <div className={getAmountClass()}>{formatCurrency(amount)}</div>
      {subtitle && <div className="stat-subtitle">{subtitle}</div>}
    </div>
  );
}
