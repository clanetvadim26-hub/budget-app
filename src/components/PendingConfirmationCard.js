import React, { useState } from 'react';
import { format } from 'date-fns';
import { formatCurrency } from '../utils/calculations';

function PendingItem({ item, onConfirm, onEditConfirm }) {
  const [editing, setEditing] = useState(false);
  const [editAmount, setEditAmount] = useState(item.income.amount);

  const { income, date, daysFromToday } = item;
  const isOverdue = daysFromToday < 0;

  const ownerColor = income.person === 'Vadim' ? '#60A5FA' : '#F472B6';
  const ownerIcon = income.person === 'Vadim' ? '👨' : '👩';

  const statusLabel = isOverdue
    ? `${Math.abs(daysFromToday)}d overdue`
    : daysFromToday === 0
    ? 'Due today'
    : `Due in ${daysFromToday}d`;

  const statusColor = isOverdue ? '#F87171' : daysFromToday <= 1 ? '#FACC15' : '#4ADE80';

  return (
    <div className="pending-item">
      <div className="pending-item-header">
        <div className="pending-who">
          <span className="pending-icon" style={{ color: ownerColor }}>{ownerIcon}</span>
          <div>
            <div className="pending-name">{income.name}</div>
            <div className="pending-person" style={{ color: ownerColor }}>{income.person}</div>
          </div>
        </div>
        <div className="pending-right">
          <div className="pending-amount">{formatCurrency(income.amount)}</div>
          <div className="pending-date">{format(date, 'MMM d, yyyy')}</div>
          <div className="pending-status" style={{ color: statusColor }}>{statusLabel}</div>
        </div>
      </div>

      {income.account && (
        <div className="pending-account">
          <span className="pending-account-label">→ {income.account}</span>
        </div>
      )}

      {!editing ? (
        <div className="pending-actions">
          <button className="btn-confirm" onClick={() => onConfirm(item)}>
            ✓ Confirm as Expected
          </button>
          <button className="btn-edit-amount" onClick={() => setEditing(true)}>
            ✏️ Edit Amount
          </button>
        </div>
      ) : (
        <div className="pending-edit-form">
          <input
            type="number"
            value={editAmount}
            onChange={(e) => setEditAmount(e.target.value)}
            step="0.01"
            min="0"
            autoFocus
          />
          <button
            className="btn-confirm"
            onClick={() => {
              onEditConfirm(item, Number(editAmount));
              setEditing(false);
            }}
          >
            Post ${Number(editAmount).toLocaleString()}
          </button>
          <button className="btn-cancel" onClick={() => setEditing(false)}>Cancel</button>
        </div>
      )}
    </div>
  );
}

export default function PendingConfirmationCard({ pendingPaychecks, onConfirm, onEditConfirm }) {
  if (pendingPaychecks.length === 0) return null;

  const overdueCount = pendingPaychecks.filter((p) => p.daysFromToday < 0).length;

  return (
    <div className="panel pending-panel">
      <div className="panel-header">
        <h2>
          <span className="pending-pulse" />
          Pending Confirmations
        </h2>
        <span className="pending-badge">{pendingPaychecks.length}</span>
        {overdueCount > 0 && (
          <span className="overdue-badge">{overdueCount} overdue</span>
        )}
      </div>
      <div className="pending-list">
        {pendingPaychecks.map((item) => (
          <PendingItem
            key={item.key}
            item={item}
            onConfirm={onConfirm}
            onEditConfirm={onEditConfirm}
          />
        ))}
      </div>
    </div>
  );
}
