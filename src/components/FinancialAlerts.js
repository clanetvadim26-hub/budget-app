import React from 'react';
import { differenceInDays, format } from 'date-fns';
import { formatCurrency } from '../utils/calculations';
import { ROTH_REDIRECT_DATE, K401_START_DATE } from '../utils/paycheckAllocation';

const CAR_INS_RENEWAL = new Date(2026, 5, 23); // June 23, 2026
const AMAZON_FINAL_DUE = new Date(2026, 2, 31); // March 31, 2026

function Alert({ icon, color, children, urgent }) {
  return (
    <div className={`fa-alert ${urgent ? 'fa-urgent' : ''}`} style={{ borderLeftColor: color }}>
      <span className="fa-icon">{icon}</span>
      <span className="fa-text">{children}</span>
    </div>
  );
}

export default function FinancialAlerts({ accounts, savings, recurringExpenses }) {
  const today = new Date();
  const alerts = [];

  // 1. Roth IRA 2025 deadline
  const rothDaysLeft = differenceInDays(ROTH_REDIRECT_DATE, today);
  if (rothDaysLeft > 0) {
    const rothAccounts = (accounts || []).filter((a) => a.type === 'roth_ira');
    const combinedContributed = rothAccounts.reduce((s, a) => s + (a.ytdContributions || 0), 0);
    const combinedTarget      = rothAccounts.length * 7000 || 14000;
    const remaining           = Math.max(0, combinedTarget - combinedContributed);
    if (remaining > 0) {
      alerts.push({
        key: 'roth_deadline',
        icon: '📅',
        color: '#D4AF37',
        urgent: rothDaysLeft <= 30,
        text: `Roth IRA 2025 deadline: ${rothDaysLeft} day${rothDaysLeft !== 1 ? 's' : ''} left — need ${formatCurrency(remaining)} more to max out both accounts`,
      });
    }
  }

  // 2. Car insurance renewal
  const carInsDays = differenceInDays(CAR_INS_RENEWAL, today);
  if (carInsDays > 0) {
    alerts.push({
      key: 'car_insurance',
      icon: '🚗',
      color: carInsDays <= 30 ? '#F87171' : '#FBBF24',
      urgent: carInsDays <= 30,
      text: `Car insurance renewal in ${carInsDays} day${carInsDays !== 1 ? 's' : ''} (${format(CAR_INS_RENEWAL, 'MMMM d, yyyy')}) — setting aside $311/month`,
    });
  }

  // 3. 401k countdown
  const k401Days = differenceInDays(K401_START_DATE, today);
  if (k401Days > 0) {
    alerts.push({
      key: '401k_soon',
      icon: '🏛️',
      color: '#A78BFA',
      urgent: false,
      text: `401k contributions start June 2026 (${k401Days} days) — prepare to redirect $291/paycheck`,
    });
  }

  // 4. Emergency fund
  const emergencyData    = savings?.emergency;
  const monthlyExpenses  = 2242 + 610; // fixed + variable per spec
  const threeMonthTarget = monthlyExpenses * 3;
  const emergencyCurrent = emergencyData?.current || 0;
  const emergencyGap     = Math.max(0, threeMonthTarget - emergencyCurrent);
  if (emergencyGap > 0) {
    alerts.push({
      key: 'emergency_fund',
      icon: '🛡️',
      color: '#4ADE80',
      urgent: false,
      text: `Emergency fund goal: need ${formatCurrency(emergencyGap)} more to reach 3 months of expenses (${formatCurrency(threeMonthTarget)})`,
    });
  }

  // 5. Amazon final payment (if not yet expired)
  const amazonDays = differenceInDays(AMAZON_FINAL_DUE, today);
  if (amazonDays >= 0 && amazonDays <= 14) {
    alerts.push({
      key: 'amazon_final',
      icon: '📦',
      color: '#F87171',
      urgent: true,
      text: `Amazon final payment of $125 due ${format(AMAZON_FINAL_DUE, 'MMMM d')} — last one!`,
    });
  }

  if (alerts.length === 0) return null;

  return (
    <div className="panel fa-panel">
      <div className="panel-header">
        <h2>Financial Alerts</h2>
        <span className="panel-subtitle">{alerts.length} active</span>
      </div>
      <div className="fa-list">
        {alerts.map((a) => (
          <Alert key={a.key} icon={a.icon} color={a.color} urgent={a.urgent}>
            {a.text}
          </Alert>
        ))}
      </div>
    </div>
  );
}
