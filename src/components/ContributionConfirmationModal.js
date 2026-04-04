import React, { useState } from 'react';
import { formatCurrency } from '../utils/calculations';

export default function ContributionConfirmationModal({
  item,
  onConfirm,
  onDefer,
  onDismiss,
  onSkipCycle,
  recentConfirmed = [],
}) {
  const [editedAmount, setEditedAmount] = useState(String(item.amount));
  const [isLumpSum, setIsLumpSum]       = useState(false);
  const [showSkipForm, setShowSkipForm] = useState(false);
  const [currentBalance, setCurrentBalance] = useState('');

  const isDuplicate = recentConfirmed.some(
    (c) =>
      c.accountId === item.accountId &&
      Math.abs(Number(c.amount) - Number(editedAmount)) < 0.01 &&
      c.confirmedDate
  );

  const parsedAmount = Math.max(0, Number(editedAmount) || 0);
  const isZero       = parsedAmount === 0;

  const handleConfirm = () => {
    onConfirm({ ...item, amount: parsedAmount, isLumpSum });
  };

  const handleSkipCycleSubmit = () => {
    const trimmed = String(currentBalance).trim();
    const bal = trimmed === '' ? null : Number(trimmed);
    const balToPass = (bal !== null && !isNaN(bal) && bal >= 0) ? bal : null;
    onSkipCycle(item.id, item.accountId, balToPass);
  };

  // ── Skip-cycle sub-form ──────────────────────────────────────────────
  if (showSkipForm) {
    return (
      <div className="pa-overlay" style={{ zIndex: 10000, alignItems: 'flex-start', paddingTop: '5vh', overflowY: 'auto' }}>
        <div className="pa-modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
          <div className="pa-header">
            <div>
              <div className="pa-subtitle">⏭ Skipping This Paycheck</div>
              <div className="pa-title">{item.label}</div>
            </div>
          </div>
          <div style={{ padding: '20px 20px 8px' }}>
            <p style={{ fontSize: 13, color: '#94A3B8', marginBottom: 20, lineHeight: 1.6 }}>
              Got it — no contribution this cycle. We won't ask again until your next paycheck.
              <br /><br />
              What is the <strong style={{ color: '#F1F5F9' }}>current balance</strong> of{' '}
              <strong style={{ color: '#D4AF37' }}>{item.accountName}</strong>?
              This keeps your account balance accurate.
            </p>
            <label style={{ fontSize: 12, color: '#94A3B8', display: 'block', marginBottom: 6 }}>
              CURRENT BALANCE (leave blank to skip)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <span style={{ fontSize: 20, color: '#D4AF37', fontWeight: 700 }}>$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 430.00"
                value={currentBalance}
                onChange={(e) => setCurrentBalance(e.target.value)}
                style={{
                  background: '#0F1829',
                  border: '1px solid #2D3F55',
                  borderRadius: 8,
                  color: '#F1F5F9',
                  fontSize: 22,
                  fontWeight: 700,
                  padding: '6px 12px',
                  width: '100%',
                }}
              />
            </div>
          </div>
          <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              type="button"
              className="pa-confirm-btn"
              onClick={(e) => { e.stopPropagation(); handleSkipCycleSubmit(); }}
              style={{ cursor: 'pointer', pointerEvents: 'auto' }}
            >
              ✓ Confirm &amp; Skip This Cycle
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowSkipForm(false); }}
              style={{ background: 'transparent', border: 'none', color: '#475569', fontSize: 13, cursor: 'pointer', padding: '6px 0', pointerEvents: 'auto' }}
            >
              ← Go back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main modal ───────────────────────────────────────────────────────
  return (
    <div className="pa-overlay" style={{ zIndex: 10000, alignItems: 'flex-start', paddingTop: '5vh', overflowY: 'auto' }}>
      <div className="pa-modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="pa-header">
          <div>
            <div className="pa-subtitle">
              {item.isDebt ? '💳 Debt Payment Due' : '💰 Contribution Due'}
            </div>
            <div className="pa-title">{item.label}</div>
          </div>
        </div>

        <div style={{ padding: '20px 20px 8px' }}>
          {/* Editable amount */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: '#94A3B8', display: 'block', marginBottom: 6 }}>
              AMOUNT (edit if different from plan)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20, color: '#D4AF37', fontWeight: 700 }}>$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={editedAmount}
                onChange={(e) => setEditedAmount(e.target.value)}
                style={{
                  background: '#0F1829',
                  border: '1px solid #1E293B',
                  borderRadius: 8,
                  color: '#F1F5F9',
                  fontSize: 28,
                  fontWeight: 800,
                  padding: '6px 12px',
                  width: '100%',
                }}
                autoFocus
              />
            </div>
            {parsedAmount !== item.amount && !isZero && (
              <div style={{ fontSize: 11, color: '#FBBF24', marginTop: 4 }}>
                ⚠ Plan amount: {formatCurrency(item.amount)} — confirming a custom amount
              </div>
            )}
          </div>

          {/* Lump sum toggle */}
          {!item.isDebt && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 12 }}>
              <input
                type="checkbox"
                checked={isLumpSum}
                onChange={(e) => setIsLumpSum(e.target.checked)}
                style={{ accentColor: '#D4AF37', width: 16, height: 16 }}
              />
              <span style={{ fontSize: 13, color: '#94A3B8' }}>
                One-time / lump-sum contribution
              </span>
            </label>
          )}

          {/* Duplicate warning */}
          {isDuplicate && !isZero && (
            <div style={{
              background: 'rgba(251,191,36,0.1)',
              border: '1px solid rgba(251,191,36,0.3)',
              borderRadius: 8,
              padding: '10px 12px',
              marginBottom: 12,
              fontSize: 12,
              color: '#FBBF24',
            }}>
              ⚠ Looks like you already confirmed this amount to this account recently — make sure this is a new contribution.
            </div>
          )}

          <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 8 }}>
            {item.isDebt
              ? `This will apply a payment to ${item.accountName} and reduce your balance.`
              : `This will add a contribution to ${item.accountName} and update its balance.`}
          </div>
        </div>

        <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Primary confirm */}
          <button type="button" className="pa-confirm-btn" onClick={(e) => { e.stopPropagation(); handleConfirm(); }} style={{ cursor: 'pointer', pointerEvents: 'auto' }}>
            ✓ Yes, Confirmed
          </button>

          {/* Defer 1 day */}
          <button type="button" className="pa-defer-btn" onClick={(e) => { e.stopPropagation(); onDefer(item.id); }} style={{ pointerEvents: 'auto' }}>
            ❌ Not Yet — Ask Tomorrow
          </button>

          {/* Skip entire cycle */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowSkipForm(true); }}
            style={{
              background: 'rgba(100,116,139,0.1)',
              border: '1px solid rgba(100,116,139,0.25)',
              borderRadius: 8,
              color: '#94A3B8',
              fontSize: 13,
              fontWeight: 600,
              padding: '10px',
              cursor: 'pointer',
            }}
          >
            ⏭ I didn't contribute this paycheck
          </button>

          {/* Session skip */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDismiss(item.id); }}
            style={{ background: 'transparent', border: 'none', color: '#475569', fontSize: 12, cursor: 'pointer', padding: '4px 0', pointerEvents: 'auto' }}
          >
            Skip this session
          </button>
        </div>
      </div>
    </div>
  );
}
