import React from 'react';
import { formatCurrency } from '../../utils/calculations';
import { useLocalStorage } from '../../hooks/useLocalStorage';

function AdviceCard({ icon, title, body, priority, color }) {
  const colors = {
    high: '#F87171',
    medium: '#FACC15',
    low: '#4ADE80',
    gold: '#D4AF37',
  };
  const c = colors[color] || colors[priority] || '#94A3B8';
  return (
    <div className="advice-card" style={{ borderLeftColor: c }}>
      <div className="advice-header">
        <span className="advice-icon">{icon}</span>
        <div>
          <div className="advice-title">{title}</div>
          <span className="advice-priority" style={{ color: c }}>
            {priority === 'high' ? '🔴 High Priority' : priority === 'medium' ? '🟡 Medium Priority' : '🟢 Good Progress'}
          </span>
        </div>
      </div>
      <div className="advice-body">{body}</div>
    </div>
  );
}

function AllocationBar({ label, amount, total, color }) {
  const pct = total > 0 ? (amount / total) * 100 : 0;
  return (
    <div className="alloc-row">
      <span className="alloc-label">{label}</span>
      <div className="alloc-bar-wrap">
        <div className="alloc-bar-fill" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="alloc-amount" style={{ color }}>{formatCurrency(amount)}</span>
    </div>
  );
}

export default function FinancialAdvicePanel({ income, expenses, savingsRate, monthlyIncome }) {
  const [savings] = useLocalStorage('budget_savings', {
    emergency: { current: 0, target: 0 },
    roth_ira: { current: 0, target: 7000 },
    investments: { current: 0, target: 0 },
    general: { current: 0, target: 0 },
  });

  const adviceList = [];
  const net = income - expenses;
  const emergencyCurrent = savings.emergency?.current || 0;
  const emergencyTarget = savings.emergency?.target || expenses * 3;
  const rothCurrent = savings.roth_ira?.current || 0;
  const rothTarget = 7000;

  // Emergency fund
  if (emergencyCurrent < emergencyTarget) {
    adviceList.push({
      icon: '🛡️',
      title: 'Build Emergency Fund First',
      body: `You need ${formatCurrency(emergencyTarget - emergencyCurrent)} more to reach your ${formatCurrency(emergencyTarget)} emergency fund (3–6 months of expenses). This is your #1 priority before any other savings goal. Consider setting aside ${formatCurrency(Math.min(net * 0.5, (emergencyTarget - emergencyCurrent) / 6))} per month until funded.`,
      priority: 'high',
      color: 'high',
    });
  } else {
    adviceList.push({
      icon: '✅',
      title: 'Emergency Fund Complete!',
      body: `Great job! Your ${formatCurrency(emergencyCurrent)} emergency fund covers ${expenses > 0 ? (emergencyCurrent / expenses).toFixed(1) : '∞'} months of expenses. Now focus on Roth IRA and investments.`,
      priority: 'low',
      color: 'low',
    });
  }

  // Savings rate
  if (savingsRate < 10) {
    adviceList.push({
      icon: '📉',
      title: 'Critical: Low Savings Rate',
      body: `Your savings rate is ${savingsRate.toFixed(1)}% — well below the recommended 20%. You're saving ${formatCurrency(net)} per month. Try to identify your top 3 variable expenses (dining out, subscriptions, entertainment) and cut them by 25% each.`,
      priority: 'high',
      color: 'high',
    });
  } else if (savingsRate < 20) {
    adviceList.push({
      icon: '⚠️',
      title: 'Savings Rate Below Target',
      body: `Your savings rate is ${savingsRate.toFixed(1)}% — below the 20% target. To reach 20%, you need to save ${formatCurrency(income * 0.2 - net)} more per month. Look at dining out, entertainment, and subscriptions for quick wins.`,
      priority: 'medium',
      color: 'medium',
    });
  } else {
    adviceList.push({
      icon: '🎯',
      title: 'Excellent Savings Rate!',
      body: `Your ${savingsRate.toFixed(1)}% savings rate exceeds the 20% benchmark. You're saving ${formatCurrency(net)} per month. Keep it up and consider increasing investment contributions.`,
      priority: 'low',
      color: 'low',
    });
  }

  // Roth IRA
  const rothMonthly = 583;
  if (rothCurrent < rothTarget) {
    adviceList.push({
      icon: '📈',
      title: 'Max Out Roth IRA',
      body: `You've contributed ${formatCurrency(rothCurrent)} of the ${formatCurrency(rothTarget)} annual Roth IRA limit. Aim to contribute ${formatCurrency(rothMonthly)}/month to max it out by year-end. Roth IRA grows tax-free — this is one of the best wealth-building tools available.`,
      priority: emergencyCurrent >= emergencyTarget ? 'high' : 'medium',
      color: 'gold',
    });
  } else {
    adviceList.push({
      icon: '🏆',
      title: 'Roth IRA Maxed Out!',
      body: `You've maxed your ${formatCurrency(rothTarget)} Roth IRA for the year. Excellent! Now consider contributing to a taxable brokerage account and investing in low-cost index funds like VTI or VXUS.`,
      priority: 'low',
      color: 'low',
    });
  }

  // Brokerage recommendation
  if (emergencyCurrent >= emergencyTarget && rothCurrent >= rothTarget) {
    adviceList.push({
      icon: '💼',
      title: 'Open a Brokerage Account',
      body: `With your emergency fund and Roth IRA maxed, invest surplus in a taxable brokerage. A simple 3-fund portfolio: 60% VTI (US stocks), 30% VXUS (international), 10% BND (bonds). Even ${formatCurrency(Math.max(net - rothMonthly, 100))}/month invested grows significantly over time.`,
      priority: 'medium',
      color: 'gold',
    });
  }

  // Housing ratio
  if (expenses > 0 && income > 0) {
    const housingRatio = (expenses / income) * 100;
    if (housingRatio > 50) {
      adviceList.push({
        icon: '🏠',
        title: 'High Expense-to-Income Ratio',
        body: `Your expenses are ${housingRatio.toFixed(0)}% of income — above the healthy 50% threshold. The classic 50/30/20 rule: 50% needs, 30% wants, 20% savings. Focus on reducing your largest variable expenses first.`,
        priority: 'high',
        color: 'high',
      });
    }
  }

  // Recommended allocation
  const rothAlloc = Math.min(monthlyIncome * 0.1, rothMonthly);
  const emergencyAlloc = emergencyCurrent < emergencyTarget ? Math.min(monthlyIncome * 0.1, 500) : 0;
  const investAlloc = Math.max(monthlyIncome * 0.05, 0);
  const generalAlloc = Math.max(net - rothAlloc - emergencyAlloc - investAlloc, 0);
  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Financial Advice</h2>
        <span className="panel-subtitle">Personalized recommendations</span>
      </div>

      <div className="advice-list">
        {adviceList.map((a, i) => (
          <AdviceCard key={i} {...a} />
        ))}
      </div>

      {monthlyIncome > 0 && (
        <div className="allocation-section">
          <div className="alloc-title">Recommended Monthly Allocation</div>
          <div className="alloc-subtitle">Based on your income of {formatCurrency(monthlyIncome)}/month</div>
          <div className="alloc-bars">
            <AllocationBar label="🛡️ Emergency Fund" amount={emergencyAlloc} total={monthlyIncome} color="#4ADE80" />
            <AllocationBar label="📈 Roth IRA" amount={rothAlloc} total={monthlyIncome} color="#D4AF37" />
            <AllocationBar label="💼 Investments" amount={investAlloc} total={monthlyIncome} color="#60A5FA" />
            <AllocationBar label="🏦 General Savings" amount={generalAlloc} total={monthlyIncome} color="#A78BFA" />
            <AllocationBar label="🏠 Living Expenses" amount={expenses} total={monthlyIncome} color="#F87171" />
          </div>
        </div>
      )}

      {monthlyIncome === 0 && (
        <div className="empty-state">
          Add income data to get personalized financial recommendations.
        </div>
      )}
    </div>
  );
}
