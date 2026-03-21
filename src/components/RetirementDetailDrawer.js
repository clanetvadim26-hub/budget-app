import React, { useState } from 'react';
import {
  ComposedChart, Bar, Line, LineChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { format } from 'date-fns';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useConfirm } from './ConfirmModal';
import { DEFAULT_ACCOUNTS, ACCOUNT_TYPE_META, OWNER_COLORS } from '../data/accounts';
import { formatCurrency } from '../utils/calculations';
import {
  ROTH_IRA_LIMITS, ROTH_YEARS, CURRENT_YEAR,
  deadlineLabel, daysUntilDeadline,
  getRothLimit, getTotalContributed, getYearStatus, YEAR_STATUS_META,
  defaultRothYear, PHASE_OUT_MFJ_2025,
} from '../utils/rothIRA';

const IS_IRA = (type) => type === 'roth_ira' || type === 'traditional_ira';

// ── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const meta = YEAR_STATUS_META[status] || YEAR_STATUS_META.under;
  return (
    <span className="rdr-status-badge" style={{ color: meta.color, borderColor: meta.color + '44', background: meta.color + '18' }}>
      {meta.label}
    </span>
  );
}

// ── Contribution entry form ───────────────────────────────────────────────────
function ContributionForm({ account, contributions, onAdd, onCancel }) {
  const [form, setForm] = useState({
    taxYear: defaultRothYear(),
    date: format(new Date(), 'yyyy-MM-dd'),
    amount: '',
    notes: '',
  });
  const f = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const isIRA = IS_IRA(account.type);
  const alreadyContributed = isIRA
    ? getTotalContributed(contributions, account.id, form.taxYear)
    : 0;
  const limit    = isIRA ? getRothLimit(form.taxYear, account.catchUp) : null;
  const projected = alreadyContributed + (Number(form.amount) || 0);
  const wouldExceed = limit !== null && projected > limit;
  const remaining   = limit !== null ? Math.max(0, limit - alreadyContributed) : null;
  const days        = isIRA ? daysUntilDeadline(form.taxYear) : null;
  const deadlinePassed = days !== null && days <= 0;

  const handleAdd = () => {
    if (!form.amount || Number(form.amount) <= 0) return;
    onAdd({
      id: Date.now().toString(),
      accountId: account.id,
      taxYear: form.taxYear,
      date: form.date,
      amount: Number(form.amount),
      notes: form.notes,
    });
  };

  return (
    <div className="rdr-contrib-form">
      {isIRA && (
        <div className="form-row">
          <div className="form-group">
            <label>Tax Year</label>
            <select value={form.taxYear} onChange={(e) => f('taxYear', Number(e.target.value))}>
              {ROTH_YEARS.map((y) => (
                <option key={y} value={y}>{y} — limit: {formatCurrency(getRothLimit(y, account.catchUp))} · Deadline: {deadlineLabel(y)}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {deadlinePassed && (
        <div className="rdr-warning-banner error">
          ⚠ The {form.taxYear} contribution deadline ({deadlineLabel(form.taxYear)}) has passed.
        </div>
      )}
      {!deadlinePassed && days !== null && days <= 30 && (
        <div className="rdr-warning-banner warning">
          ⚠ {days} days left to contribute for {form.taxYear} (deadline {deadlineLabel(form.taxYear)})
        </div>
      )}
      {remaining !== null && (
        <div className="rdr-room-left">
          Remaining room for {form.taxYear}: <strong style={{ color: remaining > 0 ? '#4ADE80' : '#F87171' }}>{formatCurrency(remaining)}</strong>
        </div>
      )}

      <div className="form-row">
        <div className="form-group">
          <label>Date of Contribution</label>
          <input type="date" value={form.date} onChange={(e) => f('date', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Amount ($)</label>
          <input
            type="number" min="0" step="0.01" placeholder="0.00"
            value={form.amount} onChange={(e) => f('amount', e.target.value)}
            style={{ borderColor: wouldExceed ? '#F87171' : undefined }}
          />
        </div>
      </div>

      {wouldExceed && (
        <div className="rdr-warning-banner error">
          ⚠ This contribution ({formatCurrency(projected)}) would exceed the {form.taxYear} IRS limit of {formatCurrency(limit)}.
        </div>
      )}

      <div className="form-group">
        <label>Notes (optional)</label>
        <input placeholder="e.g. Backdoor conversion" value={form.notes} onChange={(e) => f('notes', e.target.value)} />
      </div>
      <div className="form-actions">
        <button className="btn-primary" onClick={handleAdd} disabled={!form.amount || Number(form.amount) <= 0}>
          Add Contribution
        </button>
        <button className="btn-cancel-lg" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ── Yearly history table row ──────────────────────────────────────────────────
function YearRow({ year, account, contributions, onAddContribution, onDeleteContribution, expanded, onToggle }) {
  const contributed = getTotalContributed(contributions, account.id, year);
  const limit       = getRothLimit(year, account.catchUp);
  const pct         = limit > 0 ? Math.min((contributed / limit) * 100, 100) : 0;
  const status      = getYearStatus(year, contributed, limit);
  const statusMeta  = YEAR_STATUS_META[status];
  const days        = daysUntilDeadline(year);
  const entries     = contributions.filter((c) => c.accountId === account.id && c.taxYear === year);
  const [showForm, setShowForm]  = useState(false);

  return (
    <>
      <tr className={`rdr-year-row ${expanded ? 'expanded' : ''}`} onClick={onToggle} style={{ cursor: 'pointer' }}>
        <td className="rdr-year-cell">
          <span className="rdr-year-num">{year}</span>
          {year === CURRENT_YEAR && <span className="rdr-current-badge">Current</span>}
        </td>
        <td>{formatCurrency(limit)}</td>
        <td>
          <div>{formatCurrency(contributed)}</div>
          <div className="rdr-mini-progress">
            <div className="rdr-mini-fill" style={{ width: `${pct}%`, backgroundColor: statusMeta.color }} />
          </div>
        </td>
        <td style={{ color: statusMeta.color }}>{pct.toFixed(0)}%</td>
        <td className={days <= 0 ? 'negative' : days <= 30 ? 'warning-text' : ''}>
          {deadlineLabel(year)}
          {days > 0 && days <= 30 && ` (${days}d)`}
        </td>
        <td><StatusBadge status={status} /></td>
        <td>
          <button className="btn-add-small" onClick={(e) => { e.stopPropagation(); setShowForm((s) => !s); }}>
            + Add
          </button>
        </td>
      </tr>

      {/* Add form inside expanded row */}
      {showForm && (
        <tr>
          <td colSpan={7} style={{ padding: 0 }}>
            <div style={{ padding: '12px 16px', background: '#080D1A', borderBottom: '1px solid #1E2A45' }}>
              <ContributionForm
                account={account}
                contributions={contributions}
                onAdd={(data) => { onAddContribution(data); setShowForm(false); }}
                onCancel={() => setShowForm(false)}
              />
            </div>
          </td>
        </tr>
      )}

      {/* Individual contribution entries */}
      {expanded && entries.map((c) => (
        <tr key={c.id} className="rdr-entry-row">
          <td />
          <td colSpan={2} className="rdr-entry-date">{c.date}</td>
          <td className="rdr-entry-amount" style={{ color: '#4ADE80' }}>{formatCurrency(c.amount)}</td>
          <td colSpan={2} className="rdr-entry-notes">{c.notes || '—'}</td>
          <td>
            <button className="btn-icon danger" onClick={() => onDeleteContribution(c.id, c.amount)}>🗑️</button>
          </td>
        </tr>
      ))}
      {expanded && entries.length === 0 && !showForm && (
        <tr>
          <td />
          <td colSpan={6} className="rdr-no-entries">No entries for {year}. Click "+ Add" to log a contribution.</td>
        </tr>
      )}
    </>
  );
}

// ── Charts ────────────────────────────────────────────────────────────────────
function ContributionBarChart({ account, contributions }) {
  const data = ROTH_YEARS.map((year) => ({
    year: String(year),
    contributed: getTotalContributed(contributions, account.id, year),
    limit: getRothLimit(year, account.catchUp),
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
        <XAxis dataKey="year" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip
          formatter={(v, name) => [formatCurrency(v), name === 'limit' ? 'IRS Limit' : 'Contributed']}
          contentStyle={{ background: '#0F1629', border: '1px solid #1E2A45', borderRadius: 8, fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
        <Bar dataKey="contributed" fill="#D4AF37" name="Contributed" radius={[4, 4, 0, 0]} />
        <Line dataKey="limit" stroke="#64748B" strokeDasharray="6 3" name="IRS Limit" dot={false} strokeWidth={2} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function CumulativeLineChart({ account, contributions }) {
  const entries = (contributions || [])
    .filter((c) => c.accountId === account.id)
    .sort((a, b) => a.date.localeCompare(b.date));

  let running = 0;
  const data = [{ date: 'Start', cumulative: 0 }, ...entries.map((c) => {
    running += c.amount;
    return { date: c.date, cumulative: running };
  })];

  if (data.length <= 1) {
    return <div className="empty-state" style={{ padding: '20px 0' }}>No contributions recorded yet.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
        <XAxis dataKey="date" tick={{ fill: '#94A3B8', fontSize: 9 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip
          formatter={(v) => [formatCurrency(v), 'Cumulative']}
          contentStyle={{ background: '#0F1629', border: '1px solid #1E2A45', borderRadius: 8, fontSize: 12 }}
        />
        <Line type="monotone" dataKey="cumulative" stroke="#D4AF37" strokeWidth={2} dot={false} name="Cumulative" />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Main Drawer ───────────────────────────────────────────────────────────────
export default function RetirementDetailDrawer({ account, onClose }) {
  const [contributions, setContributions] = useLocalStorage('budget_roth_contributions', []);
  const [accounts, setAccounts]           = useLocalStorage('budget_accounts', DEFAULT_ACCOUNTS);
  const [activeTab, setActiveTab]         = useState('history'); // history | charts | add
  const [expandedYear, setExpandedYear]   = useState(CURRENT_YEAR);
  const confirm = useConfirm();

  // Always use the freshest account from store
  const freshAccount = accounts.find((a) => a.id === account.id) || account;
  const isIRA        = IS_IRA(freshAccount.type);
  const meta         = ACCOUNT_TYPE_META[freshAccount.type] || {};
  const ownerColor   = OWNER_COLORS[freshAccount.owner] || '#94A3B8';
  const nodeColor    = freshAccount.color || meta.color || '#D4AF37';

  const toggleCatchUp = () => {
    setAccounts((prev) => prev.map((a) =>
      a.id === freshAccount.id ? { ...a, catchUp: !a.catchUp } : a,
    ));
  };

  const addContribution = (data) => {
    setContributions((prev) => [...prev, data]);
  };

  const deleteContribution = async (id, amount) => {
    const ok = await confirm(`Contribution of ${formatCurrency(amount)}`);
    if (ok) setContributions((prev) => prev.filter((c) => c.id !== id));
  };

  // Summary stats for this account
  const totalEverContributed = (contributions || [])
    .filter((c) => c.accountId === freshAccount.id)
    .reduce((s, c) => s + c.amount, 0);

  const currentYearContrib = getTotalContributed(contributions, freshAccount.id, CURRENT_YEAR);
  const currentYearLimit   = getRothLimit(CURRENT_YEAR, freshAccount.catchUp);

  return (
    <div className="rdr-overlay" onClick={onClose}>
      <div className="rdr-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="rdr-header" style={{ borderTopColor: nodeColor }}>
          <div className="rdr-header-left">
            <span className="rdr-account-icon">{meta.icon || '📈'}</span>
            <div>
              <div className="rdr-account-name">{freshAccount.name}</div>
              <div className="rdr-account-meta">
                <span style={{ color: nodeColor }}>{meta.label}</span>
                <span style={{ color: ownerColor }}> · {freshAccount.owner}</span>
                {freshAccount.institution && <span className="rdr-institution"> · {freshAccount.institution}</span>}
              </div>
            </div>
          </div>
          <div className="rdr-header-right">
            <div className="rdr-balance">
              <div className="rdr-balance-label">Current Balance</div>
              <div className="rdr-balance-val" style={{ color: nodeColor }}>{formatCurrency(freshAccount.balance || 0)}</div>
            </div>
            <button className="rdr-close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* IRA-specific: catch-up toggle + stats bar */}
        {isIRA && (
          <div className="rdr-stats-bar">
            <div className="rdr-stat">
              <span className="rdr-stat-label">Total Ever Contributed</span>
              <span className="rdr-stat-val gold">{formatCurrency(totalEverContributed)}</span>
            </div>
            <div className="rdr-stat">
              <span className="rdr-stat-label">{CURRENT_YEAR} Contributed</span>
              <span className="rdr-stat-val" style={{ color: currentYearContrib >= currentYearLimit ? '#4ADE80' : '#FACC15' }}>
                {formatCurrency(currentYearContrib)} / {formatCurrency(currentYearLimit)}
              </span>
            </div>
            <div className="rdr-stat">
              <span className="rdr-stat-label">Deadline</span>
              <span className="rdr-stat-val" style={{ color: daysUntilDeadline(CURRENT_YEAR) <= 30 ? '#F87171' : '#4ADE80' }}>
                {deadlineLabel(CURRENT_YEAR)}
                {daysUntilDeadline(CURRENT_YEAR) > 0 && ` (${daysUntilDeadline(CURRENT_YEAR)}d)`}
              </span>
            </div>
            <div className="rdr-catch-up-toggle">
              <label className="rdr-toggle-label">
                <input
                  type="checkbox"
                  checked={freshAccount.catchUp || false}
                  onChange={toggleCatchUp}
                />
                Age 50+ catch-up eligible
              </label>
              {freshAccount.catchUp && (
                <span className="rdr-catchup-note">+{formatCurrency(ROTH_IRA_LIMITS[CURRENT_YEAR]?.catchUp - ROTH_IRA_LIMITS[CURRENT_YEAR]?.base)} extra per year</span>
              )}
            </div>
          </div>
        )}

        {/* Income phase-out notice */}
        {isIRA && (
          <div className="rdr-phaseout-notice">
            ℹ️ 2025 Roth IRA eligibility phases out at <strong>${PHASE_OUT_MFJ_2025.start.toLocaleString()}–${PHASE_OUT_MFJ_2025.end.toLocaleString()}</strong> MAGI for married filing jointly.
          </div>
        )}

        {/* Tabs */}
        <div className="rdr-tabs">
          {['history', 'charts', 'add'].map((tab) => (
            <button
              key={tab}
              className={`rdr-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'history' ? 'Contribution History' : tab === 'charts' ? 'Charts' : '+ Add Contribution'}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="rdr-body">
          {activeTab === 'history' && isIRA && (
            <div className="rdr-history">
              <div className="rdr-table-wrap">
                <table className="rdr-year-table">
                  <thead>
                    <tr>
                      <th>Tax Year</th>
                      <th>IRS Limit</th>
                      <th>Contributed</th>
                      <th>% Used</th>
                      <th>Deadline</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...ROTH_YEARS].reverse().map((year) => (
                      <YearRow
                        key={year}
                        year={year}
                        account={freshAccount}
                        contributions={contributions}
                        onAddContribution={addContribution}
                        onDeleteContribution={deleteContribution}
                        expanded={expandedYear === year}
                        onToggle={() => setExpandedYear(expandedYear === year ? null : year)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'history' && !isIRA && (
            <div className="rdr-history">
              <div className="rdr-nontira-stats">
                <div className="rdr-stat-card">
                  <div className="rdr-stat-label">YTD Contributions</div>
                  <div className="rdr-stat-val gold">{formatCurrency(freshAccount.ytdContributions || 0)}</div>
                </div>
                <div className="rdr-stat-card">
                  <div className="rdr-stat-label">Annual Target</div>
                  <div className="rdr-stat-val">{formatCurrency(freshAccount.annualTarget || 0)}</div>
                </div>
                <div className="rdr-stat-card">
                  <div className="rdr-stat-label">Monthly Contribution</div>
                  <div className="rdr-stat-val">{formatCurrency(freshAccount.monthlyContribution || 0)}/mo</div>
                </div>
              </div>
              {(freshAccount.annualTarget || 0) > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 12, color: '#64748B', marginBottom: 6 }}>
                    Progress toward {new Date().getFullYear()} annual target
                  </div>
                  <div className="progress-bar-wrap">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${Math.min(((freshAccount.ytdContributions || 0) / freshAccount.annualTarget) * 100, 100)}%`,
                        backgroundColor: nodeColor,
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                    {formatCurrency(freshAccount.ytdContributions || 0)} / {formatCurrency(freshAccount.annualTarget)}
                  </div>
                </div>
              )}
              <div className="empty-state" style={{ marginTop: 24 }}>
                Update YTD Contributions in the Accounts tab to track 401k progress.
              </div>
            </div>
          )}

          {activeTab === 'charts' && isIRA && (
            <div className="rdr-charts">
              <div className="rdr-chart-title">Annual Contributions vs IRS Limit</div>
              <ContributionBarChart account={freshAccount} contributions={contributions} />
              <div className="rdr-chart-title" style={{ marginTop: 20 }}>Cumulative Contributions Over Time</div>
              <CumulativeLineChart account={freshAccount} contributions={contributions} />
            </div>
          )}

          {activeTab === 'charts' && !isIRA && (
            <div className="rdr-charts">
              <div className="empty-state">Charts for 401k/403b coming soon.</div>
            </div>
          )}

          {activeTab === 'add' && (
            <div className="rdr-add-tab">
              <ContributionForm
                account={freshAccount}
                contributions={contributions}
                onAdd={(data) => { addContribution(data); setActiveTab('history'); }}
                onCancel={() => setActiveTab('history')}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
