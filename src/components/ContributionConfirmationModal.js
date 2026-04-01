import React, { useState } from 'react';
import { formatCurrency } from '../utils/calculations';

export default function ContributionConfirmationModal({ item, onConfirm, onDefer, onDismiss, recentConfirmed = [] }) {
  const [editedAmount, setEditedAmount] = useState(String(item.amount));
  const [isLumpSum, setIsLumpSum] = useState(false);

  // Duplicate detection: was this exact account+amount confirmed in the last 35 days?
  const isDuplicate = recentConfirmed.some(
    (c) =>
      c.accountId === item.accountId &&
      Math.abs(Number(c.amount) - Number(editedAmount)) < 0.01 &&
      c.confirmedDate // already confirmed once
  );

  const parsedAmount = Math.max(0, Number(editedAmount) || 0);
  const isZero = parsedAmount === 0;

  const handleConfirm = () => {
    onConfirm({ ...item, amount: parsedAmount, isLumpSum });
  };

  return (
    <div className="pa-overlay" style={{ zIndex: 9000 }}>
      <div className="pa-modal" style={{ maxWidth: 420 }}>
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
                ⚠ Plan amount: {formatCurrency(item.amount)} — you're confirming a custom amount
              </div>
            )}
            {isZero && (
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                Entering $0 will skip this contribution without deferring
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
                This is a one-time / lump-sum contribution (not part of regular monthly schedule)
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
              ⚠ It looks like you already confirmed a contribution of this amount to this account recently.
              Make sure this is a <strong>new</strong> contribution before confirming.
            </div>
          )}

          <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 20 }}>
            {item.isDebt
              ? `This will apply a payment to ${item.accountName} and reduce your balance.`
              : `This will add a contribution to ${item.accountName} and update its balance.`}
          </div>
        </div>

        <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            className="pa-confirm-btn"
            onClick={handleConfirm}
            disabled={isZero ? false : parsedAmount <= 0}
          >
            {isZero ? '⏭ Skip This Contribution' : '✓ Yes, Confirmed'}
          </button>
          <button className="pa-defer-btn" onClick={() => onDefer(item.id)}>
            ❌ Not Yet — Ask Tomorrow
          </button>
          <button
            onClick={() => onDismiss(item.id)}
            style={{ background: 'transparent', border: 'none', color: '#475569', fontSize: 13, cursor: 'pointer', padding: '6px 0' }}
          >
            Skip this session
          </button>
        </div>
      </div>
    </div>
  );
}
