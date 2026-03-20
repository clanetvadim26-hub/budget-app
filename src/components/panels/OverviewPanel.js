import React from 'react';
import StatCard from '../StatCard';
import { formatCurrency, getIncomeBySource } from '../../utils/calculations';

export default function OverviewPanel({ income, expenses, net, savingsRate, viewMode, incomes }) {
  const { vadim, jessica, other } = getIncomeBySource(incomes);

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Overview</h2>
        <span className="panel-subtitle">{viewMode === 'monthly' ? 'This Month' : 'This Week'}</span>
      </div>

      <div className="stats-grid">
        <StatCard label="Total Income" amount={income} icon="💰" variant="income" subtitle={viewMode === 'monthly' ? 'This month' : 'This week'} />
        <StatCard label="Total Expenses" amount={expenses} icon="💸" variant="expense" subtitle={viewMode === 'monthly' ? 'This month' : 'This week'} />
        <StatCard
          label="Net Cash Flow"
          amount={net}
          icon={net >= 0 ? '📈' : '📉'}
          variant="net"
          subtitle={net >= 0 ? 'You are on track!' : 'Spending exceeds income'}
        />
        <div className="stat-card savings-rate-card">
          <div className="stat-header">
            <span className="stat-icon">💹</span>
            <span className="stat-label">Savings Rate</span>
          </div>
          <div className={`stat-amount ${savingsRate >= 20 ? 'positive' : savingsRate >= 10 ? 'warning' : 'negative'}`}>
            {savingsRate.toFixed(1)}%
          </div>
          <div className="savings-bar-wrap">
            <div
              className="savings-bar-fill"
              style={{
                width: `${Math.min(savingsRate, 100)}%`,
                backgroundColor: savingsRate >= 20 ? '#4ADE80' : savingsRate >= 10 ? '#FACC15' : '#F87171',
              }}
            />
          </div>
          <div className="stat-subtitle">Target: 20%</div>
        </div>
      </div>

      <div className="income-breakdown">
        <div className="breakdown-title">Income Breakdown</div>
        <div className="income-sources">
          {vadim > 0 && (
            <div className="income-source-row">
              <span className="source-name">👨 Vadim</span>
              <span className="source-bar-wrap">
                <span className="source-bar" style={{ width: `${income > 0 ? (vadim / income) * 100 : 0}%`, backgroundColor: '#60A5FA' }} />
              </span>
              <span className="source-amount">{formatCurrency(vadim)}</span>
            </div>
          )}
          {jessica > 0 && (
            <div className="income-source-row">
              <span className="source-name">👩 Jessica</span>
              <span className="source-bar-wrap">
                <span className="source-bar" style={{ width: `${income > 0 ? (jessica / income) * 100 : 0}%`, backgroundColor: '#F472B6' }} />
              </span>
              <span className="source-amount">{formatCurrency(jessica)}</span>
            </div>
          )}
          {other > 0 && (
            <div className="income-source-row">
              <span className="source-name">🌐 Other</span>
              <span className="source-bar-wrap">
                <span className="source-bar" style={{ width: `${income > 0 ? (other / income) * 100 : 0}%`, backgroundColor: '#A78BFA' }} />
              </span>
              <span className="source-amount">{formatCurrency(other)}</span>
            </div>
          )}
          {vadim === 0 && jessica === 0 && other === 0 && (
            <div className="empty-state">No income recorded for this period. Go to Add Income to get started.</div>
          )}
        </div>
      </div>
    </div>
  );
}
