import React from 'react';
import { format } from 'date-fns';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { DEFAULT_ACCOUNTS } from '../data/accounts';
import { applyPaymentToDebt, applyContributionToAccount } from '../utils/budgetPlanSync';
import { formatCurrency } from '../utils/calculations';

export default function ContributionConfirmationModal({ item, onConfirm, onDefer, onDismiss }) {
  // item = { id, accountId, accountName, accountType, amount, dueDate, label, isDebt }
  const [accounts, setAccounts] = useLocalStorage('budget_accounts', DEFAULT_ACCOUNTS);
  const isDebt = item.isDebt;
  const account = accounts.find(a => a.id === item.accountId);
  const currentBalance = account?.balance || 0;
  const apr = account?.apr || 0;
  const monthlyInterest = isDebt ? currentBalance * (apr / 100 / 12) : 0;
  const principal = isDebt ? Math.max(0, item.amount - monthlyInterest) : 0;
  const newBalance = isDebt ? Math.max(0, currentBalance - principal) : currentBalance + item.amount;

  const handleConfirm = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    if (isDebt) {
      const { accounts: updated } = applyPaymentToDebt(accounts, item.accountId, item.amount, today);
      setAccounts(updated);
    } else {
      const updated = applyContributionToAccount(accounts, item.accountId, item.amount, today);
      setAccounts(updated);
    }
    onConfirm(item.id);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,8,22,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000, padding: 20, backdropFilter: 'blur(3px)' }}>
      <div style={{ background: '#0F1629', border: '1px solid #1E2A45', borderRadius: 16, padding: '28px 24px', maxWidth: 400, width: '100%', boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}>
        <div style={{ fontSize: 13, color: '#64748B', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {isDebt ? '💳 Debt Payment Due' : '💰 Contribution Due'}
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#F1F5F9', marginBottom: 4 }}>{item.label}</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#D4AF37', marginBottom: 16 }}>{formatCurrency(item.amount)}</div>

        {isDebt && account && (
          <div style={{ background: '#131d35', border: '1px solid #1E293B', borderRadius: 12, padding: 14, marginBottom: 16, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#CBD5E1' }}>
              <span>Current balance</span><span>{formatCurrency(currentBalance)}</span>
            </div>
            {apr > 0 && <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#F87171' }}>
                <span>Monthly interest ({apr}% APR)</span><span>{formatCurrency(monthlyInterest)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#60A5FA' }}>
                <span>Principal reduction</span><span>{formatCurrency(principal)}</span>
              </div>
            </>}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#4ADE80' }}>
              <span>New balance after payment</span><span>{formatCurrency(newBalance)}</span>
            </div>
          </div>
        )}

        {!isDebt && account && (
          <div style={{ background: '#131d35', border: '1px solid #1E293B', borderRadius: 12, padding: 14, marginBottom: 16, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#CBD5E1' }}>
              <span>Current balance</span><span>{formatCurrency(currentBalance)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#4ADE80', marginTop: 6 }}>
              <span>New balance after contribution</span><span>{formatCurrency(currentBalance + item.amount)}</span>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={handleConfirm} style={{ background: 'linear-gradient(135deg, #D4AF37, #C9A227)', color: '#0A0F1E', fontWeight: 700, border: 'none', borderRadius: 10, padding: '12px 0', fontSize: 15, cursor: 'pointer' }}>
            ✓ Yes, Confirmed
          </button>
          <button onClick={() => onDefer(item.id)} style={{ background: 'transparent', border: '1px solid #334155', color: '#94A3B8', borderRadius: 10, padding: '11px 0', fontSize: 14, cursor: 'pointer' }}>
            ❌ Not Yet — Ask Tomorrow
          </button>
          <button onClick={() => onDismiss(item.id)} style={{ background: 'transparent', border: 'none', color: '#475569', fontSize: 13, cursor: 'pointer', padding: '6px 0' }}>
            Skip this session
          </button>
        </div>
      </div>
    </div>
  );
}
