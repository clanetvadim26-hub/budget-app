import React from 'react';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { formatCurrency } from '../../utils/calculations';

const GOALS = [
  {
    id: 'emergency',
    label: 'Emergency Fund',
    icon: '🛡️',
    targetMonths: null,
    targetFixed: null,
    color: '#4ADE80',
    description: '3–6 months of expenses',
  },
  {
    id: 'roth_ira',
    label: 'Roth IRA',
    icon: '📈',
    targetFixed: 7000,
    color: '#D4AF37',
    description: '$7,000/year IRS limit',
  },
  {
    id: 'investments',
    label: 'Investment Account',
    icon: '💼',
    targetFixed: null,
    color: '#60A5FA',
    description: 'Brokerage / Index Funds',
  },
  {
    id: 'general',
    label: 'General Savings',
    icon: '🏦',
    targetFixed: null,
    color: '#A78BFA',
    description: 'Vacation, big purchases, etc.',
  },
];

export default function SavingsTracker({ monthlyExpenses }) {
  const [savings, setSavings] = useLocalStorage('budget_savings', {
    emergency: { current: 0, target: 0 },
    roth_ira: { current: 0, target: 7000 },
    investments: { current: 0, target: 0 },
    general: { current: 0, target: 0 },
  });

  const updateSaving = (id, field, value) => {
    setSavings((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: Number(value) },
    }));
  };

  const emergencyTarget = savings.emergency.target || monthlyExpenses * 3;

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Savings Tracker</h2>
        <span className="panel-subtitle">Progress toward your goals</span>
      </div>

      <div className="savings-goals">
        {GOALS.map((goal) => {
          const current = savings[goal.id]?.current || 0;
          const target =
            goal.id === 'emergency'
              ? emergencyTarget
              : goal.targetFixed || savings[goal.id]?.target || 1;
          const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;

          return (
            <div key={goal.id} className="savings-goal-card">
              <div className="goal-header">
                <span className="goal-icon">{goal.icon}</span>
                <div className="goal-info">
                  <div className="goal-label">{goal.label}</div>
                  <div className="goal-desc">{goal.description}</div>
                </div>
                <div className="goal-pct" style={{ color: goal.color }}>
                  {pct.toFixed(0)}%
                </div>
              </div>

              <div className="progress-bar-wrap">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${pct}%`, backgroundColor: goal.color }}
                />
              </div>

              <div className="goal-amounts">
                <span style={{ color: goal.color }}>{formatCurrency(current)}</span>
                <span className="goal-sep">of</span>
                <span>{formatCurrency(target)}</span>
              </div>

              <div className="goal-inputs">
                <div className="goal-input-group">
                  <label>Current Balance ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={current}
                    onChange={(e) => updateSaving(goal.id, 'current', e.target.value)}
                  />
                </div>
                {goal.id !== 'roth_ira' && (
                  <div className="goal-input-group">
                    <label>
                      {goal.id === 'emergency' ? 'Target (auto: 3× expenses)' : 'Target ($)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={goal.id === 'emergency' ? emergencyTarget : savings[goal.id]?.target || ''}
                      onChange={(e) => updateSaving(goal.id, 'target', e.target.value)}
                      placeholder={goal.id === 'emergency' ? String(Math.round(monthlyExpenses * 3)) : ''}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
