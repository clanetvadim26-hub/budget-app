import React, { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, startOfYear, isWithinInterval } from 'date-fns';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { formatCurrency } from '../../utils/calculations';
import AddIncomeForm from '../forms/AddIncomeForm';

const now = new Date();
const monthStart = startOfMonth(now);
const monthEnd = endOfMonth(now);
const yearStart = startOfYear(now);

function inMonth(dateStr) {
  const d = new Date(dateStr);
  return isWithinInterval(d, { start: monthStart, end: monthEnd });
}

function inYear(dateStr) {
  const d = new Date(dateStr);
  return isWithinInterval(d, { start: yearStart, end: now });
}

// Determine Jessica's job from income entry
function getJessicaJob(inc) {
  if (inc.metadata?.jobId === 'orange_theory') return 'orange_theory';
  if (inc.metadata?.jobId === 'competitive_edge') return 'competitive_edge';
  const desc = (inc.description || '').toLowerCase();
  if (desc.includes('orange theory')) return 'orange_theory';
  if (desc.includes('competitive edge')) return 'competitive_edge';
  return 'other';
}

function pctChange(curr, prev) {
  if (!prev || prev === 0) return null;
  return ((curr - prev) / prev) * 100;
}

function PctBadge({ value }) {
  if (value === null) return <span style={{ color: '#475569' }}>—</span>;
  const color = value >= 0 ? '#4ADE80' : '#F87171';
  return <span style={{ color, fontSize: 12 }}>{value >= 0 ? '+' : ''}{value.toFixed(1)}%</span>;
}

// ── Vadim Sub-tab ─────────────────────────────────────────────────────────────
function VadimTab({ incomes }) {
  const vadimIncomes = useMemo(
    () => incomes.filter(i => i.source === 'Vadim').sort((a, b) => new Date(b.date) - new Date(a.date)),
    [incomes]
  );
  const monthTotal = vadimIncomes.filter(i => inMonth(i.date)).reduce((s, i) => s + Number(i.amount), 0);
  const ytdTotal   = vadimIncomes.filter(i => inYear(i.date)).reduce((s, i) => s + Number(i.amount), 0);

  return (
    <div>
      <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
        <div className="cf-stat">
          <div className="cf-stat-label">This Month</div>
          <div className="cf-stat-value positive">{formatCurrency(monthTotal)}</div>
        </div>
        <div className="cf-stat">
          <div className="cf-stat-label">Year to Date</div>
          <div className="cf-stat-value positive">{formatCurrency(ytdTotal)}</div>
        </div>
      </div>
      {vadimIncomes.length === 0 ? (
        <div className="empty-state">No income logged for Vadim yet.</div>
      ) : (
        <div className="cashflow-table">
          <div className="table-header">
            <span>Date</span>
            <span>Description</span>
            <span>Amount</span>
          </div>
          {vadimIncomes.map(inc => (
            <div key={inc.id} className="table-row">
              <span className="month-label">{inc.date}</span>
              <span style={{ color: '#94A3B8', fontSize: 13 }}>{inc.description || 'Paycheck'}</span>
              <span className="positive">{formatCurrency(Number(inc.amount))}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Jessica Sub-tab ───────────────────────────────────────────────────────────
function JessicaTab({ incomes }) {
  const jessicaIncomes = useMemo(
    () => incomes.filter(i => i.source === 'Jessica').sort((a, b) => new Date(b.date) - new Date(a.date)),
    [incomes]
  );

  const monthTotal = jessicaIncomes.filter(i => inMonth(i.date)).reduce((s, i) => s + Number(i.amount), 0);
  const ytdTotal   = jessicaIncomes.filter(i => inYear(i.date)).reduce((s, i) => s + Number(i.amount), 0);

  const otIncomes  = jessicaIncomes.filter(i => getJessicaJob(i) === 'orange_theory');
  const ceIncomes  = jessicaIncomes.filter(i => getJessicaJob(i) === 'competitive_edge');
  const otherJ     = jessicaIncomes.filter(i => getJessicaJob(i) === 'other');

  function JobTable({ entries, is1099 }) {
    if (entries.length === 0) return <div className="empty-state" style={{ fontSize: 12 }}>No paychecks logged yet.</div>;
    return (
      <div className="cashflow-table" style={{ marginTop: 8 }}>
        <div className="table-header">
          <span>Date</span>
          {is1099 ? (
            <>
              <span>Gross</span>
              <span>Tax Reserve (25%)</span>
              <span>Net After Reserve</span>
            </>
          ) : (
            <span>Amount</span>
          )}
          <span>% Change</span>
        </div>
        {entries.map((inc, idx) => {
          const gross = Number(inc.amount);
          const prevEntry = entries[idx + 1];
          const pct = prevEntry ? pctChange(gross, Number(prevEntry.amount)) : null;
          const taxReserve = is1099 ? gross * 0.25 : 0;
          const netAfter   = is1099 ? gross - taxReserve : gross;
          return (
            <div key={inc.id} className="table-row">
              <span className="month-label">{inc.date}</span>
              {is1099 ? (
                <>
                  <span className="positive">{formatCurrency(gross)}</span>
                  <span style={{ color: '#F87171' }}>{formatCurrency(taxReserve)}</span>
                  <span className="positive">{formatCurrency(netAfter)}</span>
                </>
              ) : (
                <span className="positive">{formatCurrency(gross)}</span>
              )}
              <PctBadge value={pct} />
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
        <div className="cf-stat">
          <div className="cf-stat-label">This Month</div>
          <div className="cf-stat-value positive">{formatCurrency(monthTotal)}</div>
        </div>
        <div className="cf-stat">
          <div className="cf-stat-label">Year to Date</div>
          <div className="cf-stat-value positive">{formatCurrency(ytdTotal)}</div>
        </div>
      </div>

      {/* Orange Theory */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#FB923C', marginBottom: 6 }}>
          🏋️ Orange Theory <span style={{ fontSize: 11, color: '#64748B', fontWeight: 400 }}>W-2</span>
        </div>
        <JobTable entries={otIncomes} is1099={false} />
      </div>

      {/* Competitive Edge */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#60A5FA', marginBottom: 6 }}>
          💼 Competitive Edge LLC <span style={{ fontSize: 11, color: '#64748B', fontWeight: 400 }}>1099</span>
        </div>
        <JobTable entries={ceIncomes} is1099={true} />
      </div>

      {/* Other */}
      {otherJ.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#F472B6', marginBottom: 6 }}>
            👩 Other / Untagged
          </div>
          <JobTable entries={otherJ} is1099={false} />
        </div>
      )}

      {jessicaIncomes.length === 0 && (
        <div className="empty-state">No income logged for Jessica yet. Log a paycheck from Budget Plan → Jessica tab.</div>
      )}
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────
export default function IncomePanel() {
  const [incomes, setIncomes] = useLocalStorage('budget_incomes', []);
  const [subTab, setSubTab]   = useState('vadim');

  const addIncome = (entry) => setIncomes(prev => [...prev, entry]);

  const recentAll = [...incomes].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Income</h2>
        <span className="panel-subtitle">{format(now, 'MMMM yyyy')}</span>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #1E293B', marginBottom: 20 }}>
        {[
          { id: 'vadim',     label: '👨 Vadim'     },
          { id: 'jessica',   label: '👩 Jessica'   },
          { id: 'add',       label: '➕ Add Income' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            style={{
              padding: '10px 18px',
              background: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${subTab === t.id ? '#D4AF37' : 'transparent'}`,
              color: subTab === t.id ? '#D4AF37' : '#64748B',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: -1,
              transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'vadim'   && <VadimTab   incomes={incomes} />}
      {subTab === 'jessica' && <JessicaTab incomes={incomes} />}
      {subTab === 'add' && (
        <div className="form-panel" style={{ padding: 0 }}>
          <AddIncomeForm onAdd={addIncome} />
          <div className="recent-list-panel">
            <div className="chart-title">Recent Income (All)</div>
            {recentAll.map(inc => (
              <div key={inc.id} className="recent-item">
                <span className="recent-icon">
                  {inc.source === 'Vadim' ? '👨' : inc.source === 'Jessica' ? '👩' : '🌐'}
                </span>
                <div className="recent-info">
                  <div className="recent-primary">{inc.source}</div>
                  {inc.description && <div className="recent-secondary">{inc.description}</div>}
                  <div className="recent-date">{inc.date}</div>
                </div>
                <span className="recent-amount positive">+{formatCurrency(Number(inc.amount))}</span>
              </div>
            ))}
            {recentAll.length === 0 && <div className="empty-state">No income entries yet.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
