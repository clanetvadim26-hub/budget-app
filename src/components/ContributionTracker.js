import React, { useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { DEFAULT_ACCOUNTS, ACCOUNT_TYPE_META, OWNER_COLORS } from '../data/accounts';
import { formatCurrency } from '../utils/calculations';
import { format } from 'date-fns';

const CURRENT_YEAR = new Date().getFullYear().toString();

function AddContributionForm({ accounts, onAdd, onCancel }) {
  const [person,    setPerson]    = useState('Vadim');
  const [accountId, setAccountId] = useState('');
  const [amount,    setAmount]    = useState('');
  const [date,      setDate]      = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isLumpSum, setIsLumpSum] = useState(false);
  const [note,      setNote]      = useState('');

  const investmentTypes = ['roth_ira','traditional_ira','401k','roth_401k','403b','hsa','brokerage','reit','crypto','savings'];
  const eligibleAccounts = accounts.filter((a) => investmentTypes.includes(a.type));

  const handleAdd = () => {
    if (!accountId || !amount || Number(amount) <= 0) return;
    const acct = accounts.find((a) => a.id === accountId);
    onAdd({
      id: `manual_${accountId}_${Date.now()}`,
      person,
      accountId,
      accountName: acct?.name || accountId,
      amount: Number(amount),
      date,
      source: 'manual',
      isLumpSum,
      note: note.trim() || undefined,
    });
  };

  return (
    <div style={{
      background: '#0A1020',
      border: '1px solid #1E293B',
      borderRadius: 12,
      padding: '16px 18px',
      marginBottom: 20,
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#CBD5E1', marginBottom: 14 }}>
        ＋ Add Contribution
      </div>

      {/* Person */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, color: '#64748B', display: 'block', marginBottom: 6 }}>WHO</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {['Vadim', 'Jessica'].map((p) => (
            <button
              key={p}
              onClick={() => setPerson(p)}
              style={{
                padding: '6px 16px',
                borderRadius: 8,
                border: `1px solid ${person === p ? (p === 'Jessica' ? '#F472B6' : '#60A5FA') : '#1E293B'}`,
                background: person === p ? (p === 'Jessica' ? 'rgba(244,114,182,0.12)' : 'rgba(96,165,250,0.12)') : 'transparent',
                color: person === p ? (p === 'Jessica' ? '#F472B6' : '#60A5FA') : '#64748B',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {p === 'Vadim' ? '👨' : '👩'} {p}
            </button>
          ))}
        </div>
      </div>

      {/* Account */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, color: '#64748B', display: 'block', marginBottom: 6 }}>ACCOUNT</label>
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          style={{ background: '#0F1829', border: '1px solid #1E293B', borderRadius: 8, color: accountId ? '#F1F5F9' : '#64748B', fontSize: 13, padding: '8px 12px', width: '100%' }}
        >
          <option value="">Select account…</option>
          {eligibleAccounts.map((a) => {
            const meta = ACCOUNT_TYPE_META[a.type] || {};
            return (
              <option key={a.id} value={a.id}>
                {meta.icon} {a.name} ({a.owner})
              </option>
            );
          })}
        </select>
      </div>

      {/* Amount + Date row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 11, color: '#64748B', display: 'block', marginBottom: 6 }}>AMOUNT ($)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ background: '#0F1829', border: '1px solid #1E293B', borderRadius: 8, color: '#F1F5F9', fontSize: 15, padding: '8px 12px', width: '100%' }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 11, color: '#64748B', display: 'block', marginBottom: 6 }}>DATE</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ background: '#0F1829', border: '1px solid #1E293B', borderRadius: 8, color: '#F1F5F9', fontSize: 13, padding: '8px 12px', width: '100%' }}
          />
        </div>
      </div>

      {/* Optional note */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, color: '#64748B', display: 'block', marginBottom: 6 }}>NOTE (optional)</label>
        <input
          type="text"
          placeholder="e.g. Roth IRA lump sum deposit"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          style={{ background: '#0F1829', border: '1px solid #1E293B', borderRadius: 8, color: '#F1F5F9', fontSize: 13, padding: '8px 12px', width: '100%' }}
        />
      </div>

      {/* Lump sum */}
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 14 }}>
        <input type="checkbox" checked={isLumpSum} onChange={(e) => setIsLumpSum(e.target.checked)} style={{ accentColor: '#D4AF37' }} />
        <span style={{ fontSize: 12, color: '#94A3B8' }}>One-time / lump-sum (not a regular monthly contribution)</span>
      </label>

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={handleAdd}
          disabled={!accountId || !amount || Number(amount) <= 0}
          className="pa-confirm-btn"
          style={{ flex: 1, padding: '10px', fontSize: 14 }}
        >
          ＋ Log Contribution
        </button>
        <button
          onClick={onCancel}
          style={{ padding: '10px 16px', background: 'transparent', border: '1px solid #1E293B', borderRadius: 8, color: '#64748B', fontSize: 13, cursor: 'pointer' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function ContributionTracker({ compact = false }) {
  const [log, setLog]     = useLocalStorage('budget_contribution_log', []);
  const [accounts]        = useLocalStorage('budget_accounts', DEFAULT_ACCOUNTS);
  const [showAdd, setShowAdd] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [filterPerson, setFilterPerson] = useState('All');

  // All non-skipped entries
  const allEntries = (log || []).filter((e) => !e.skipped);

  // Year filter
  const yearEntries = allEntries.filter((e) => e.date && e.date.startsWith(CURRENT_YEAR));

  // Per-person totals YTD
  const vadimTotal   = yearEntries.filter((e) => e.person === 'Vadim').reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const jessicaTotal = yearEntries.filter((e) => e.person === 'Jessica').reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const combinedTotal = vadimTotal + jessicaTotal;

  // Per-account breakdown (all time, grouped)
  const investmentTypes = ['roth_ira','traditional_ira','401k','roth_401k','403b','hsa','brokerage','reit','crypto','savings'];
  const trackedAccounts = accounts.filter((a) => investmentTypes.includes(a.type));

  const accountStats = trackedAccounts.map((acct) => {
    const entries = allEntries.filter((e) => e.accountId === acct.id);
    const vadim   = entries.filter((e) => e.person === 'Vadim').reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const jessica = entries.filter((e) => e.person === 'Jessica').reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const lastEntry = entries.sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
    return { acct, vadim, jessica, total: vadim + jessica, lastDate: lastEntry?.date || null };
  });

  // Filtered log for activity feed
  const filteredLog = allEntries.filter((e) => {
    if (filterPerson !== 'All' && e.person !== filterPerson) return false;
    return true;
  });
  const displayLog = showAll ? filteredLog : filteredLog.slice(0, 20);

  const handleAddEntry = (entry) => {
    setLog(prev => [entry, ...(prev || [])].slice(0, 500));
    setShowAdd(false);
  };

  if (compact) {
    return (
      <div style={{ fontSize: 12, color: '#94A3B8' }}>
        <span>YTD: </span>
        <span style={{ color: '#60A5FA', fontWeight: 700 }}>👨 {formatCurrency(vadimTotal)}</span>
        <span style={{ margin: '0 6px', color: '#1E293B' }}>|</span>
        <span style={{ color: '#F472B6', fontWeight: 700 }}>👩 {formatCurrency(jessicaTotal)}</span>
        <span style={{ margin: '0 6px', color: '#1E293B' }}>|</span>
        <span style={{ color: '#D4AF37', fontWeight: 700 }}>Combined: {formatCurrency(combinedTotal)}</span>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Contribution Tracker</h2>
          <span className="panel-subtitle">{CURRENT_YEAR} YTD</span>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          style={{
            background: showAdd ? 'transparent' : 'rgba(212,175,55,0.15)',
            border: '1px solid rgba(212,175,55,0.3)',
            borderRadius: 8,
            color: '#D4AF37',
            fontSize: 13,
            fontWeight: 600,
            padding: '8px 14px',
            cursor: 'pointer',
          }}
        >
          {showAdd ? '✕ Cancel' : '＋ Add Contribution'}
        </button>
      </div>

      {/* Manual add form */}
      {showAdd && (
        <AddContributionForm
          accounts={accounts}
          onAdd={handleAddEntry}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {/* YTD summary cards */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: '👨 Vadim',    total: vadimTotal,    color: '#60A5FA' },
          { label: '👩 Jessica',  total: jessicaTotal,  color: '#F472B6' },
          { label: '🤝 Combined', total: combinedTotal, color: '#D4AF37' },
        ].map(({ label, total, color }) => (
          <div key={label} style={{ background: '#0F1829', border: '1px solid #1E293B', borderRadius: 10, padding: '10px 16px', minWidth: 140, flex: 1 }}>
            <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color }}>{formatCurrency(total)}</div>
            <div style={{ fontSize: 11, color: '#475569' }}>contributed {CURRENT_YEAR}</div>
          </div>
        ))}
      </div>

      {/* Per-account table */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
          By Account — All Time
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1E293B' }}>
                <th style={{ textAlign: 'left', padding: '8px 6px', color: '#64748B', fontWeight: 600, fontSize: 11 }}>Account</th>
                <th style={{ textAlign: 'right', padding: '8px 6px', color: '#60A5FA', fontWeight: 600, fontSize: 11 }}>👨 Vadim</th>
                <th style={{ textAlign: 'right', padding: '8px 6px', color: '#F472B6', fontWeight: 600, fontSize: 11 }}>👩 Jessica</th>
                <th style={{ textAlign: 'right', padding: '8px 6px', color: '#D4AF37', fontWeight: 600, fontSize: 11 }}>Total</th>
                <th style={{ textAlign: 'right', padding: '8px 6px', color: '#64748B', fontWeight: 600, fontSize: 11 }}>Last</th>
              </tr>
            </thead>
            <tbody>
              {accountStats.map(({ acct, vadim, jessica, total, lastDate }) => {
                const meta = ACCOUNT_TYPE_META[acct.type] || {};
                const ownerColor = OWNER_COLORS[acct.owner] || '#94A3B8';
                return (
                  <tr key={acct.id} style={{ borderBottom: '1px solid #0A1020' }}>
                    <td style={{ padding: '8px 6px' }}>
                      <span style={{ marginRight: 6 }}>{meta.icon}</span>
                      <span style={{ color: '#CBD5E1' }}>{acct.name}</span>
                      <span style={{ marginLeft: 6, fontSize: 10, color: ownerColor }}>{acct.owner}</span>
                    </td>
                    <td style={{ textAlign: 'right', padding: '8px 6px', color: vadim > 0 ? '#60A5FA' : '#1E3A5F', fontWeight: vadim > 0 ? 700 : 400 }}>
                      {vadim > 0 ? formatCurrency(vadim) : '—'}
                    </td>
                    <td style={{ textAlign: 'right', padding: '8px 6px', color: jessica > 0 ? '#F472B6' : '#3D1A2E', fontWeight: jessica > 0 ? 700 : 400 }}>
                      {jessica > 0 ? formatCurrency(jessica) : '—'}
                    </td>
                    <td style={{ textAlign: 'right', padding: '8px 6px', color: total > 0 ? '#D4AF37' : '#475569', fontWeight: total > 0 ? 700 : 400 }}>
                      {total > 0 ? formatCurrency(total) : '—'}
                    </td>
                    <td style={{ textAlign: 'right', padding: '8px 6px', color: '#475569', fontSize: 11 }}>
                      {lastDate || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Filter bar for activity log */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Activity Log
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {['All', 'Vadim', 'Jessica'].map((p) => (
            <button
              key={p}
              onClick={() => setFilterPerson(p)}
              style={{
                padding: '3px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                background: filterPerson === p ? 'rgba(96,165,250,0.15)' : 'transparent',
                border: `1px solid ${filterPerson === p ? '#60A5FA' : '#1E293B'}`,
                color: filterPerson === p ? '#60A5FA' : '#64748B',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Activity log */}
      {displayLog.length === 0 ? (
        <div style={{ fontSize: 12, color: '#475569', textAlign: 'center', padding: '20px 0' }}>
          No contributions logged yet. Use the paycheck flow in Jessica's Budget Plan, confirm contributions when prompted, or click "＋ Add Contribution" above.
        </div>
      ) : (
        displayLog.map((e, i) => (
          <div key={e.id || i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 4px', borderBottom: '1px solid #0A1020', fontSize: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: e.person === 'Jessica' ? '#F472B6' : '#60A5FA', fontSize: 14 }}>
                {e.person === 'Jessica' ? '👩' : '👨'}
              </span>
              <div>
                <span style={{ color: '#CBD5E1', fontWeight: 600 }}>{e.accountName || e.accountId}</span>
                {e.note && <span style={{ color: '#475569', marginLeft: 6 }}>· {e.note}</span>}
                {e.isLumpSum && (
                  <span style={{ marginLeft: 6, fontSize: 10, background: 'rgba(212,175,55,0.15)', color: '#D4AF37', borderRadius: 4, padding: '1px 5px' }}>
                    lump sum
                  </span>
                )}
                {e.source === 'manual' && (
                  <span style={{ marginLeft: 6, fontSize: 10, color: '#475569' }}>manual</span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <span style={{ color: '#4ADE80', fontWeight: 700 }}>{formatCurrency(e.amount)}</span>
              <span style={{ color: '#475569', minWidth: 80, textAlign: 'right' }}>{e.date}</span>
            </div>
          </div>
        ))
      )}

      {filteredLog.length > 20 && (
        <button
          onClick={() => setShowAll(!showAll)}
          style={{ background: 'transparent', border: 'none', color: '#60A5FA', fontSize: 12, cursor: 'pointer', marginTop: 10, display: 'block', width: '100%', textAlign: 'center' }}
        >
          {showAll ? 'Show less' : `Show all ${filteredLog.length} entries`}
        </button>
      )}
    </div>
  );
}
