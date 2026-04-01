import React, { useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { formatCurrency } from '../utils/calculations';

const CURRENT_YEAR = new Date().getFullYear().toString();

export default function ContributionTracker({ compact = false }) {
  const [log] = useLocalStorage('budget_contribution_log', []);
  const [showAll, setShowAll] = useState(false);

  // Filter to current year
  const yearLog = (log || []).filter((e) => e.date && e.date.startsWith(CURRENT_YEAR) && !e.skipped);

  // Per person totals
  const byPerson = {};
  yearLog.forEach((e) => {
    const person = e.person || 'Vadim';
    byPerson[person] = (byPerson[person] || 0) + (Number(e.amount) || 0);
  });

  // Per account totals
  const byAccount = {};
  yearLog.forEach((e) => {
    if (!e.accountId) return;
    const key = e.accountName || e.accountId;
    if (!byAccount[key]) byAccount[key] = { name: key, total: 0, count: 0 };
    byAccount[key].total += Number(e.amount) || 0;
    byAccount[key].count += 1;
  });
  const accountList = Object.values(byAccount).sort((a, b) => b.total - a.total).slice(0, 8);

  const totalContributed = yearLog.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const recentEntries    = [...(log || [])].slice(0, showAll ? 50 : 10);

  if (compact) {
    return (
      <div style={{ fontSize: 12, color: '#94A3B8' }}>
        <span>YTD contributions: </span>
        <span style={{ color: '#D4AF37', fontWeight: 700 }}>{formatCurrency(totalContributed)}</span>
        {Object.entries(byPerson).map(([person, total]) => (
          <span key={person} style={{ marginLeft: 10 }}>
            {person === 'Jessica' ? '👩' : '👨'} {person}: <span style={{ color: '#4ADE80' }}>{formatCurrency(total)}</span>
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Contribution Tracker</h2>
        <span className="panel-subtitle">{CURRENT_YEAR} YTD — {formatCurrency(totalContributed)}</span>
      </div>

      {/* Per-person summary */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {Object.entries(byPerson).map(([person, total]) => (
          <div key={person} style={{
            background: '#0F1829', border: '1px solid #1E293B', borderRadius: 10,
            padding: '10px 16px', minWidth: 150,
          }}>
            <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>
              {person === 'Jessica' ? '👩' : '👨'} {person}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: person === 'Jessica' ? '#F472B6' : '#60A5FA' }}>
              {formatCurrency(total)}
            </div>
            <div style={{ fontSize: 11, color: '#475569' }}>contributed this year</div>
          </div>
        ))}
        {totalContributed > 0 && (
          <div style={{
            background: '#0F1829', border: '1px solid #1E293B', borderRadius: 10,
            padding: '10px 16px', minWidth: 150,
          }}>
            <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>🤝 Combined</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#D4AF37' }}>{formatCurrency(totalContributed)}</div>
            <div style={{ fontSize: 11, color: '#475569' }}>total household</div>
          </div>
        )}
      </div>

      {/* Per-account breakdown */}
      {accountList.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: '#64748B', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            By Account
          </div>
          {accountList.map((a) => (
            <div key={a.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #0F1829' }}>
              <span style={{ fontSize: 13, color: '#CBD5E1' }}>{a.name}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#4ADE80' }}>{formatCurrency(a.total)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Recent entries */}
      <div>
        <div style={{ fontSize: 12, color: '#64748B', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Recent Activity
        </div>
        {recentEntries.length === 0 && (
          <div style={{ fontSize: 12, color: '#475569', textAlign: 'center', padding: '16px 0' }}>
            No contributions logged yet. Use the paycheck flow or confirm contributions when prompted.
          </div>
        )}
        {recentEntries.map((e, i) => (
          <div key={e.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #0A1020', fontSize: 12 }}>
            <div>
              <span style={{ color: e.person === 'Jessica' ? '#F472B6' : '#60A5FA', marginRight: 6 }}>
                {e.person === 'Jessica' ? '👩' : '👨'}
              </span>
              <span style={{ color: '#CBD5E1' }}>{e.accountName || e.accountId}</span>
              {e.isLumpSum && <span style={{ marginLeft: 6, fontSize: 10, background: 'rgba(212,175,55,0.15)', color: '#D4AF37', borderRadius: 4, padding: '1px 5px' }}>lump sum</span>}
              {e.skipped && <span style={{ marginLeft: 6, fontSize: 10, color: '#475569' }}>skipped</span>}
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ color: e.skipped ? '#475569' : '#4ADE80', fontWeight: 700 }}>
                {e.skipped ? '—' : formatCurrency(e.amount)}
              </span>
              <span style={{ color: '#475569' }}>{e.date}</span>
            </div>
          </div>
        ))}
        {(log || []).length > 10 && (
          <button
            onClick={() => setShowAll(!showAll)}
            style={{ background: 'transparent', border: 'none', color: '#60A5FA', fontSize: 12, cursor: 'pointer', marginTop: 8 }}
          >
            {showAll ? 'Show less' : `Show all ${log.length} entries`}
          </button>
        )}
      </div>
    </div>
  );
}
