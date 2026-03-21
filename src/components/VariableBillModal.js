import React, { useState } from 'react';
import { format, subMonths } from 'date-fns';
import { formatCurrencyFull } from '../utils/calculations';

const BILL_META = {
  rec_electricity: { label: 'Electricity', icon: '⚡', color: '#FBBF24' },
  rec_water:       { label: 'Water',        icon: '💧', color: '#38BDF8' },
};

// Get last 3 months of entries for a given bill
function getHistory(billId, variableBillEntries) {
  const today = new Date();
  const history = [];
  for (let i = 1; i <= 3; i++) {
    const d   = subMonths(today, i);
    const key = `${billId}_${format(d, 'yyyy-MM')}`;
    const entry = variableBillEntries?.[key];
    if (entry) {
      history.push({ month: format(d, 'MMM yyyy'), amount: entry.amount });
    }
  }
  return history;
}

export default function VariableBillModal({ bill, variableBillEntries, onSave, onClose }) {
  const [amount, setAmount] = useState('');

  if (!bill) return null;

  const meta    = BILL_META[bill.id] || { label: bill.name, icon: '💰', color: '#D4AF37' };
  const history = getHistory(bill.id, variableBillEntries);
  const avg     = history.length > 0
    ? history.reduce((s, h) => s + h.amount, 0) / history.length
    : bill.amount;

  const handleSave = () => {
    const parsed = Number(amount);
    if (!parsed || parsed <= 0) return;
    onSave(bill.id, parsed);
  };

  return (
    <div className="pa-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pa-modal vbill-modal">
        <div className="pa-header">
          <div>
            <h2 className="pa-title" style={{ color: meta.color }}>
              {meta.icon} {meta.label} Bill
            </h2>
            <div className="pa-subtitle">{format(new Date(), 'MMMM yyyy')}</div>
          </div>
          <button className="pa-close" onClick={onClose}>×</button>
        </div>

        <div className="vbill-body">
          <p className="vbill-prompt">
            Your <strong>{meta.label}</strong> bill is due this month. How much is it?
          </p>

          {history.length > 0 && (
            <div className="vbill-history">
              <div className="vbill-history-title">Last {history.length} months:</div>
              {history.map((h) => (
                <div key={h.month} className="vbill-history-row">
                  <span>{h.month}</span>
                  <span style={{ color: meta.color }}>{formatCurrencyFull(h.amount)}</span>
                </div>
              ))}
              <div className="vbill-history-row vbill-avg-row">
                <span>Average</span>
                <span>{formatCurrencyFull(avg)}</span>
              </div>
            </div>
          )}

          {history.length === 0 && (
            <div className="vbill-avg-hint">
              Typical: ~{formatCurrencyFull(avg)} based on budget estimate
            </div>
          )}

          <div className="vbill-amount-wrap">
            <span className="jessica-dollar">$</span>
            <input
              className="jessica-amount-input"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
            />
          </div>

          {amount && Number(amount) > avg * 1.3 && (
            <div className="pa-warning">
              ⚠ This is {Math.round(((Number(amount) - avg) / avg) * 100)}% higher than average. Double-check the amount.
            </div>
          )}
        </div>

        <div className="pa-footer">
          <button
            className="pa-confirm-btn"
            onClick={handleSave}
            disabled={!amount || Number(amount) <= 0}
          >
            💾 Save & Mark Paid
          </button>
          <button className="pa-skip-btn" onClick={onClose}>Remind Me Later</button>
        </div>
      </div>
    </div>
  );
}
