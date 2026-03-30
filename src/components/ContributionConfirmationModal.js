import React from 'react';
import { formatCurrency } from '../utils/calculations';

export default function ContributionConfirmationModal({ item, onConfirm, onDefer, onDismiss }) {
  // item = { id, accountId, accountName, accountType, amount, dueDate, label, isDebt }
  return (
    <div className="pa-overlay" style={{ zIndex: 9000 }}>
      <div className="pa-modal" style={{ maxWidth: 400 }}>
        <div className="pa-header">
          <div>
            <div className="pa-subtitle">
              {item.isDebt ? '💳 Debt Payment Due' : '💰 Contribution Due'}
            </div>
            <div className="pa-title">{item.label}</div>
          </div>
        </div>

        <div style={{ padding: '20px 20px 8px' }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#D4AF37', marginBottom: 16 }}>
            {formatCurrency(item.amount)}
          </div>
          <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 20 }}>
            {item.isDebt
              ? `This will apply a payment to ${item.accountName} and reduce your balance.`
              : `This will add a contribution to ${item.accountName}.`}
          </div>
        </div>

        <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="pa-confirm-btn" onClick={() => onConfirm(item)}>
            ✓ Yes, Confirmed
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
