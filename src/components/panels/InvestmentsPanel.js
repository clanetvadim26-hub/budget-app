import React, { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { DEFAULT_ACCOUNTS, ACCOUNT_TYPE_META, OWNER_COLORS } from '../../data/accounts';
import { formatCurrency } from '../../utils/calculations';
import RetirementDetailDrawer from '../RetirementDetailDrawer';
import {
  ROTH_YEARS, deadlineLabel, daysUntilDeadline,
  getRothLimit, getTotalContributed, getYearStatus, YEAR_STATUS_META,
  defaultRothYear, PHASE_OUT_MFJ_2025,
} from '../../utils/rothIRA';

function DonutTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <div>{payload[0].name}</div>
        <div className="tooltip-amount">{formatCurrency(payload[0].value)}</div>
      </div>
    );
  }
  return null;
}

function TrackerCard({ icon, title, color, children, onClick }) {
  return (
    <div
      className={`tracker-card ${onClick ? 'tracker-card-clickable' : ''}`}
      style={{ borderTopColor: color }}
      onClick={onClick}
    >
      <div className="tracker-card-header">
        <span className="tracker-icon">{icon}</span>
        <span className="tracker-title" style={{ color }}>{title}</span>
        {onClick && <span className="tracker-details-hint">View Details →</span>}
      </div>
      {children}
    </div>
  );
}

function StatRow({ label, value, valueColor }) {
  return (
    <div className="tracker-stat-row">
      <span className="tracker-stat-label">{label}</span>
      <span className="tracker-stat-val" style={{ color: valueColor || '#E2E8F0' }}>{value}</span>
    </div>
  );
}

function YearSelector({ selectedYear, onChange }) {
  return (
    <div className="year-selector">
      {ROTH_YEARS.map((y) => (
        <button
          key={y}
          className={`year-btn ${selectedYear === y ? 'active' : ''}`}
          onClick={() => onChange(y)}
        >
          {y}
        </button>
      ))}
    </div>
  );
}

function RothAccountBar({ account, contributions, selectedYear, onOpenDrawer }) {
  const contributed = getTotalContributed(contributions, account.id, selectedYear);
  const limit       = getRothLimit(selectedYear, account.catchUp);
  const pct         = limit > 0 ? Math.min((contributed / limit) * 100, 100) : 0;
  const status      = getYearStatus(selectedYear, contributed, limit);
  const statusMeta  = YEAR_STATUS_META[status];
  const ownerColor  = OWNER_COLORS[account.owner] || '#94A3B8';

  return (
    <div className="roth-account-bar" onClick={onOpenDrawer}>
      <div className="roth-bar-header">
        <span className="roth-bar-owner" style={{ color: ownerColor }}>
          {account.owner === 'Vadim' ? '👨' : '👩'} {account.name}
          {account.catchUp && <span className="roth-catchup-chip">50+ catch-up</span>}
        </span>
        <span className="roth-bar-status" style={{ color: statusMeta.color }}>{statusMeta.label}</span>
      </div>
      <div className="roth-bar-amounts">
        <span style={{ color: '#D4AF37', fontWeight: 700 }}>{formatCurrency(contributed)}</span>
        <span style={{ color: '#64748B' }}> / {formatCurrency(limit)}</span>
      </div>
      <div className="progress-bar-wrap" style={{ marginBottom: 4 }}>
        <div className="progress-bar-fill" style={{ width: `${pct}%`, backgroundColor: statusMeta.color }} />
      </div>
      <div className="roth-bar-footer">
        <span>{pct.toFixed(0)}% of {selectedYear} limit</span>
        <span className="roth-bar-details-link">Details & History →</span>
      </div>
    </div>
  );
}

const INVESTMENT_TYPES = ['roth_ira', 'traditional_ira', '401k', '403b', 'hsa', 'brokerage', 'reit', 'crypto'];
const DONUT_COLORS = {
  'Roth IRA': '#D4AF37', 'Traditional IRA': '#C9A227', '401k': '#A78BFA', '403b': '#8B5CF6',
  HSA: '#2DD4BF', Brokerage: '#38BDF8', REIT: '#FB923C', Crypto: '#F59E0B',
};

export default function InvestmentsPanel() {
  const [accounts]      = useLocalStorage('budget_accounts', DEFAULT_ACCOUNTS);
  const [contributions] = useLocalStorage('budget_roth_contributions', []);
  const [selectedYear,  setSelectedYear]      = useState(defaultRothYear());
  const [drawerAccountId, setDrawerAccountId] = useState(null);

  const iraAccounts     = accounts.filter((a) => a.type === 'roth_ira' || a.type === 'traditional_ira');
  const rothAccounts    = accounts.filter((a) => a.type === 'roth_ira');
  const k401Accounts    = accounts.filter((a) => a.type === '401k' || a.type === '403b');
  const taxableAccounts = accounts.filter((a) => ['brokerage', 'reit', 'crypto', 'hsa'].includes(a.type));

  const totalInvested = accounts
    .filter((a) => INVESTMENT_TYPES.includes(a.type))
    .reduce((s, a) => s + (a.balance || 0), 0);

  const typeGroups = {};
  accounts
    .filter((a) => INVESTMENT_TYPES.includes(a.type) && (a.balance || 0) > 0)
    .forEach((a) => {
      const label = ACCOUNT_TYPE_META[a.type]?.label || a.type;
      typeGroups[label] = (typeGroups[label] || 0) + a.balance;
    });
  const donutData = Object.entries(typeGroups).map(([name, value]) => ({ name, value }));

  // Combined Roth progress for selected year
  const combinedContributed = rothAccounts.reduce(
    (sum, a) => sum + getTotalContributed(contributions, a.id, selectedYear), 0,
  );
  const combinedLimit = rothAccounts.reduce(
    (sum, a) => sum + getRothLimit(selectedYear, a.catchUp), 0,
  );
  const combinedPct = combinedLimit > 0 ? Math.min((combinedContributed / combinedLimit) * 100, 100) : 0;
  const daysLeft    = daysUntilDeadline(selectedYear);

  const drawerAccount = drawerAccountId ? accounts.find((a) => a.id === drawerAccountId) : null;

  return (
    <div>
      {/* ── Portfolio Hero ──────────────────────────────────────────── */}
      <div className="panel">
        <div className="panel-header">
          <h2>Investment Portfolio</h2>
          <span className="panel-subtitle">All accounts combined</span>
        </div>
        <div className="invest-hero">
          <div className="invest-hero-total">
            <div className="invest-hero-label">Total Invested</div>
            <div className="invest-hero-value gold">{formatCurrency(totalInvested)}</div>
          </div>
          <div className="invest-hero-chart">
            {donutData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={donutData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                    {donutData.map((entry) => (
                      <Cell key={entry.name} fill={DONUT_COLORS[entry.name] || '#94A3B8'} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip content={<DonutTooltip />} />
                  <Legend formatter={(v) => <span style={{ color: '#CBD5E1', fontSize: 12 }}>{v}</span>} iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-chart" style={{ height: 200 }}>
                <span>Update account balances to see allocation</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Roth / Traditional IRA ──────────────────────────────────── */}
      <div className="panel">
        <div className="panel-header">
          <h2>IRA Contributions</h2>
          <span className="panel-subtitle">{selectedYear} tax year</span>
        </div>

        <YearSelector selectedYear={selectedYear} onChange={setSelectedYear} />

        {/* Deadline banners */}
        {daysLeft > 0 && daysLeft <= 30 ? (
          <div className="roth-deadline-banner warning">
            ⚠ {selectedYear} contributions close in <strong>{daysLeft} days</strong> — deadline is {deadlineLabel(selectedYear)}
          </div>
        ) : daysLeft <= 0 ? (
          <div className="roth-deadline-banner error">
            ✕ {selectedYear} contribution deadline ({deadlineLabel(selectedYear)}) has passed
          </div>
        ) : (
          <div className="roth-deadline-banner info">
            📅 {selectedYear} contributions open until <strong>{deadlineLabel(selectedYear)}</strong>
          </div>
        )}

        {/* Income phase-out notice */}
        <div className="roth-phaseout-notice">
          <span className="roth-phaseout-icon">ℹ</span>
          <span>
            2025 Roth IRA eligibility phases out at{' '}
            <strong>${PHASE_OUT_MFJ_2025.start.toLocaleString()}–${PHASE_OUT_MFJ_2025.end.toLocaleString()}</strong>{' '}
            MAGI (married filing jointly) · <em>Single/HoH: $150k–$165k</em>
          </span>
        </div>

        {/* Per-account progress bars */}
        {iraAccounts.length > 0 ? (
          <>
            <div className="roth-accounts-list">
              {iraAccounts.map((a) => (
                <RothAccountBar
                  key={a.id}
                  account={a}
                  contributions={contributions}
                  selectedYear={selectedYear}
                  onOpenDrawer={() => setDrawerAccountId(a.id)}
                />
              ))}
            </div>

            {/* Combined bar (only shown with multiple Roth accounts) */}
            {rothAccounts.length > 1 && (
              <div className="roth-combined-bar">
                <div className="roth-combined-header">
                  <span className="roth-combined-label">Combined Roth IRA — {selectedYear}</span>
                  <span style={{ color: '#D4AF37', fontWeight: 700 }}>
                    {formatCurrency(combinedContributed)} / {formatCurrency(combinedLimit)}
                  </span>
                </div>
                <div className="progress-bar-wrap">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${combinedPct}%`, backgroundColor: combinedPct >= 100 ? '#4ADE80' : '#D4AF37' }}
                  />
                </div>
                <div className="roth-combined-sub">
                  {combinedPct.toFixed(0)}% of {formatCurrency(combinedLimit)} combined limit
                  {combinedContributed < combinedLimit
                    ? ` · ${formatCurrency(combinedLimit - combinedContributed)} remaining`
                    : ' · Fully maxed out!'}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">No IRA accounts found. Add one in the Accounts tab.</div>
        )}
      </div>

      {/* ── 401k / 403b ─────────────────────────────────────────────── */}
      {k401Accounts.length > 0 && (
        <div className="panel">
          <div className="panel-header"><h2>401k / 403b Accounts</h2></div>
          <div className="roth-individual">
            {k401Accounts.map((a) => {
              const ownerColor = OWNER_COLORS[a.owner] || '#94A3B8';
              const meta       = ACCOUNT_TYPE_META[a.type] || {};
              const nodeColor  = a.color || meta.color || '#A78BFA';
              const ytd        = a.ytdContributions || 0;
              const target     = a.annualTarget || 0;
              const pct        = target > 0 ? Math.min((ytd / target) * 100, 100) : 0;
              return (
                <TrackerCard
                  key={a.id}
                  icon={meta.icon || '🏛️'}
                  title={a.name}
                  color={ownerColor}
                  onClick={() => setDrawerAccountId(a.id)}
                >
                  <StatRow label="Current Balance" value={formatCurrency(a.balance || 0)} />
                  <StatRow label="YTD Contributions" value={formatCurrency(ytd)} valueColor={nodeColor} />
                  <StatRow label="Monthly Contribution" value={`${formatCurrency(a.monthlyContribution || 0)}/mo`} />
                  {target > 0 && (
                    <>
                      <StatRow label="Annual Target" value={formatCurrency(target)} />
                      <div className="progress-bar-wrap" style={{ marginTop: 8 }}>
                        <div className="progress-bar-fill" style={{ width: `${pct}%`, backgroundColor: nodeColor }} />
                      </div>
                    </>
                  )}
                </TrackerCard>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Taxable Investments ─────────────────────────────────────── */}
      {taxableAccounts.length > 0 && (
        <div className="panel">
          <div className="panel-header"><h2>Taxable Investments</h2></div>
          <div className="roth-individual">
            {taxableAccounts.map((a) => {
              const meta       = ACCOUNT_TYPE_META[a.type] || {};
              const nodeColor  = a.color || meta.color || '#38BDF8';
              const totalContr = a.totalContributed || 0;
              const returnAmt  = (a.balance || 0) - totalContr;
              const returnPct  = totalContr > 0 ? (returnAmt / totalContr) * 100 : 0;
              return (
                <TrackerCard key={a.id} icon={meta.icon || '💼'} title={a.name} color={nodeColor}>
                  <StatRow label="Current Balance" value={formatCurrency(a.balance || 0)} />
                  <StatRow label="Total Contributed" value={formatCurrency(totalContr)} />
                  <StatRow label="Monthly Contribution" value={`${formatCurrency(a.monthlyContribution || 0)}/mo`} />
                  {totalContr > 0 && (
                    <StatRow
                      label="Return"
                      value={`${formatCurrency(returnAmt)} (${returnPct >= 0 ? '+' : ''}${returnPct.toFixed(1)}%)`}
                      valueColor={returnAmt >= 0 ? '#4ADE80' : '#F87171'}
                    />
                  )}
                </TrackerCard>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Retirement Detail Drawer ─────────────────────────────────── */}
      {drawerAccount && (
        <RetirementDetailDrawer
          account={drawerAccount}
          onClose={() => setDrawerAccountId(null)}
        />
      )}
    </div>
  );
}
