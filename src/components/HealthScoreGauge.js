import React from 'react';
import { formatCurrency } from '../utils/calculations';

function CircularGauge({ score }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.max(0, Math.min(score, 100)) / 100) * circumference;
  const color = score >= 71 ? '#4ADE80' : score >= 41 ? '#FACC15' : '#F87171';
  const label = score >= 71 ? 'Excellent' : score >= 41 ? 'Fair' : 'Needs Work';

  return (
    <div className="gauge-wrap">
      <svg width="144" height="144" viewBox="0 0 144 144">
        <circle cx="72" cy="72" r={radius} fill="none" stroke="#1E293B" strokeWidth="12" />
        <circle
          cx="72" cy="72" r={radius} fill="none"
          stroke={color} strokeWidth="12"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 72 72)"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
        <text x="72" y="67" textAnchor="middle" fill={color} fontSize="28" fontWeight="800" fontFamily="Inter, sans-serif">
          {score}
        </text>
        <text x="72" y="84" textAnchor="middle" fill="#64748B" fontSize="11" fontFamily="Inter, sans-serif">
          / 100
        </text>
        <text x="72" y="102" textAnchor="middle" fill={color} fontSize="12" fontWeight="600" fontFamily="Inter, sans-serif">
          {label}
        </text>
      </svg>
    </div>
  );
}

function ScoreRow({ label, points, max, description, tip }) {
  const pct = (points / max) * 100;
  const color = pct >= 80 ? '#4ADE80' : pct >= 50 ? '#FACC15' : '#F87171';
  return (
    <div className="score-row">
      <div className="score-row-header">
        <span className="score-row-label">{label}</span>
        <span className="score-row-pts" style={{ color }}>
          {Math.round(points)}/{max}
        </span>
      </div>
      <div className="score-progress-wrap">
        <div className="score-progress-fill" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <div className="score-row-desc">{description}</div>
      {tip && <div className="score-row-tip">💡 {tip}</div>}
    </div>
  );
}

export function calculateHealthScore({ savingsRate, monthlyExpenses, savings, accounts }) {
  let score = 0;
  const breakdown = [];

  // 1. Savings rate (0-25 pts)
  const srPts = Math.min(25, Math.max(0, (savingsRate / 20) * 25));
  score += srPts;
  breakdown.push({
    label: 'Savings Rate',
    points: srPts,
    max: 25,
    description: `${savingsRate.toFixed(1)}% savings rate — target is 20%+`,
    tip: savingsRate < 20 ? 'Cut variable expenses to boost savings rate toward 20%' : null,
  });

  // 2. Emergency fund (0-20 pts) — use savings data
  const emergencyCurrent = savings?.emergency?.current || 0;
  const emergencyMonths = monthlyExpenses > 0 ? emergencyCurrent / monthlyExpenses : 0;
  const efPts = Math.min(20, Math.max(0, (emergencyMonths / 6) * 20));
  score += efPts;
  breakdown.push({
    label: 'Emergency Fund',
    points: efPts,
    max: 20,
    description: `${emergencyMonths.toFixed(1)} months of expenses covered (target: 6)`,
    tip: emergencyMonths < 6
      ? `Need ${formatCurrency((6 - emergencyMonths) * monthlyExpenses)} more to reach 6-month fund`
      : null,
  });

  // 3. Roth IRA progress (0-20 pts)
  const rothVadim = accounts.find((a) => a.id === 'roth_ira_vadim');
  const rothJessica = accounts.find((a) => a.id === 'roth_ira_jessica');
  const combinedRothYTD = (rothVadim?.ytdContributions || 0) + (rothJessica?.ytdContributions || 0);
  const monthsElapsed = new Date().getMonth() + 1;
  const rothTarget = 14000;
  const rothOnTrack = monthsElapsed > 0 ? (combinedRothYTD / ((rothTarget / 12) * monthsElapsed)) : 0;
  const rothPts = Math.min(20, Math.max(0, rothOnTrack * 20));
  score += rothPts;
  breakdown.push({
    label: 'Roth IRA Contributions',
    points: rothPts,
    max: 20,
    description: `$${combinedRothYTD.toLocaleString()} contributed YTD toward $14,000 annual goal`,
    tip: combinedRothYTD < (rothTarget / 12) * monthsElapsed
      ? 'Increase monthly Roth IRA contributions to $583/person to stay on track'
      : null,
  });

  // 4. Debt ratio (0-20 pts) — credit card vs liquid assets
  const creditCards = accounts.filter((a) => a.type === 'credit');
  const liquidAccounts = accounts.filter((a) => a.type === 'checking' || a.type === 'savings');
  const totalDebt = creditCards.reduce((s, a) => s + (a.balance || 0), 0);
  const totalLiquid = liquidAccounts.reduce((s, a) => s + (a.balance || 0), 0);
  const debtRatio = totalLiquid > 0 ? totalDebt / totalLiquid : totalDebt > 0 ? 1 : 0;
  const debtPts = Math.max(0, 20 - debtRatio * 20);
  score += Math.min(20, debtPts);
  breakdown.push({
    label: 'Debt-to-Liquid Ratio',
    points: Math.min(20, debtPts),
    max: 20,
    description:
      totalDebt === 0
        ? 'No credit card debt — excellent!'
        : `${formatCurrency(totalDebt)} credit card debt vs ${formatCurrency(totalLiquid)} liquid assets`,
    tip: totalDebt > 0 ? `Pay off ${formatCurrency(totalDebt)} in credit card debt to maximize this score` : null,
  });

  // 5. Investment diversification (0-15 pts)
  const hasRetirement = accounts.some((a) => (a.type === 'roth_ira' || a.type === '401k') && a.balance > 0);
  const hasBrokerage = accounts.some((a) => a.type === 'brokerage' && a.balance > 0);
  const hasAlternative = accounts.some((a) => a.type === 'reit' && a.balance > 0);
  const divPts = (hasRetirement ? 7 : 0) + (hasBrokerage ? 5 : 0) + (hasAlternative ? 3 : 0);
  score += divPts;
  breakdown.push({
    label: 'Investment Diversification',
    points: divPts,
    max: 15,
    description: [
      hasRetirement ? '✓ Retirement accounts' : '✗ No retirement accounts',
      hasBrokerage ? '✓ Brokerage account' : '✗ No brokerage',
      hasAlternative ? '✓ Alternative investments' : '✗ No alternatives',
    ].join(' · '),
    tip: !hasBrokerage
      ? 'Open a brokerage account (e.g. Ameriprise) for additional diversification'
      : !hasAlternative
      ? 'Consider a REIT for alternative investment exposure'
      : null,
  });

  return { score: Math.round(score), breakdown };
}

export default function HealthScoreGauge({ score, breakdown }) {
  return (
    <div className="panel health-score-panel">
      <div className="panel-header">
        <h2>Financial Health Score</h2>
        <span className="panel-subtitle">Based on your current data</span>
      </div>
      <div className="health-score-layout">
        <div className="gauge-section">
          <CircularGauge score={score} />
          <div className="gauge-hint">
            {score >= 71 ? 'You\'re on a great track!' : score >= 41 ? 'Room to improve' : 'Take action now'}
          </div>
        </div>
        <div className="score-breakdown">
          {breakdown.map((item) => (
            <ScoreRow key={item.label} {...item} />
          ))}
        </div>
      </div>
    </div>
  );
}
