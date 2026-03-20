import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { DEFAULT_ACCOUNTS, ACCOUNT_TYPE_META } from '../../data/accounts';
import { formatCurrency } from '../../utils/calculations';

const ROTH_ANNUAL_TARGET = 14000;
const ROTH_MONTHLY = 583;

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

function ProgressBar({ current, target, color, label, sublabel }) {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  return (
    <div className="invest-progress">
      <div className="invest-progress-header">
        <span className="invest-progress-label">{label}</span>
        <span style={{ color, fontWeight: 700, fontSize: 14 }}>
          {formatCurrency(current)} <span style={{ color: '#64748B', fontWeight: 400 }}>/ {formatCurrency(target)}</span>
        </span>
      </div>
      <div className="progress-bar-wrap">
        <div className="progress-bar-fill" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      {sublabel && <div className="invest-progress-sub">{sublabel}</div>}
    </div>
  );
}

function TrackerCard({ icon, title, color, children }) {
  return (
    <div className="tracker-card" style={{ borderTopColor: color }}>
      <div className="tracker-card-header">
        <span className="tracker-icon">{icon}</span>
        <span className="tracker-title" style={{ color }}>{title}</span>
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

export default function InvestmentsPanel() {
  const [accounts] = useLocalStorage('budget_accounts', DEFAULT_ACCOUNTS);

  const inv = (id) => accounts.find((a) => a.id === id) || {};

  const rothVadim = inv('roth_ira_vadim');
  const rothJessica = inv('roth_ira_jessica');
  const k401Vadim = inv('401k_vadim');
  const k401Jessica = inv('401k_jessica');
  const brokerage = inv('brokerage_joint');
  const reit = inv('reit_vadim');

  const rothVadimYTD = rothVadim.ytdContributions || 0;
  const rothJessicaYTD = rothJessica.ytdContributions || 0;
  const combinedRothYTD = rothVadimYTD + rothJessicaYTD;

  const monthsElapsed = new Date().getMonth() + 1;
  const rothOnTrackTarget = ROTH_MONTHLY * 2 * monthsElapsed;

  // Total invested
  const investmentTypes = ['roth_ira', '401k', 'brokerage', 'reit'];
  const totalInvested = accounts
    .filter((a) => investmentTypes.includes(a.type))
    .reduce((s, a) => s + (a.balance || 0), 0);

  // Donut data
  const typeGroups = {};
  accounts
    .filter((a) => investmentTypes.includes(a.type) && (a.balance || 0) > 0)
    .forEach((a) => {
      const label = ACCOUNT_TYPE_META[a.type]?.label || a.type;
      typeGroups[label] = (typeGroups[label] || 0) + a.balance;
    });

  const donutData = Object.entries(typeGroups).map(([name, value]) => ({ name, value }));
  const donutColors = { 'Roth IRA': '#D4AF37', '401k': '#A78BFA', Brokerage: '#38BDF8', REIT: '#FB923C' };

  // REIT
  const reitReturn = (reit.balance || 0) - (reit.totalContributed || 0);
  const reitReturnPct = (reit.totalContributed || 0) > 0 ? (reitReturn / reit.totalContributed) * 100 : 0;

  // Brokerage
  const brokerageReturn = (brokerage.balance || 0) - (brokerage.totalContributed || 0);
  const brokerageReturnPct = (brokerage.totalContributed || 0) > 0 ? (brokerageReturn / brokerage.totalContributed) * 100 : 0;

  return (
    <div>
      {/* Hero */}
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
                      <Cell key={entry.name} fill={donutColors[entry.name] || '#94A3B8'} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip content={<DonutTooltip />} />
                  <Legend
                    formatter={(value) => <span style={{ color: '#CBD5E1', fontSize: 12 }}>{value}</span>}
                    iconSize={8}
                  />
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

      {/* Roth IRA */}
      <div className="panel">
        <div className="panel-header">
          <h2>Roth IRA Progress</h2>
          <span className="panel-subtitle">Combined — $14,000/year target</span>
        </div>
        <ProgressBar
          current={combinedRothYTD}
          target={ROTH_ANNUAL_TARGET}
          color="#D4AF37"
          label="Combined YTD Contributions (Vadim + Jessica)"
          sublabel={`On-track target for ${monthsElapsed} months elapsed: ${formatCurrency(rothOnTrackTarget)} · Remaining: ${formatCurrency(Math.max(0, ROTH_ANNUAL_TARGET - combinedRothYTD))}`}
        />
        <div className="roth-individual">
          <TrackerCard icon="👨" title="Vadim Roth IRA" color="#60A5FA">
            <StatRow label="Current Balance" value={formatCurrency(rothVadim.balance || 0)} />
            <StatRow label="YTD Contributions" value={formatCurrency(rothVadimYTD)} valueColor="#D4AF37" />
            <StatRow label="Monthly Contribution" value={`${formatCurrency(rothVadim.monthlyContribution || 583)}/mo`} />
            <StatRow
              label="Annual Goal"
              value={`${formatCurrency(rothVadimYTD)} / $7,000`}
              valueColor={rothVadimYTD >= 7000 ? '#4ADE80' : '#FACC15'}
            />
            <div className="progress-bar-wrap" style={{ marginTop: 8 }}>
              <div className="progress-bar-fill" style={{ width: `${Math.min((rothVadimYTD / 7000) * 100, 100)}%`, backgroundColor: '#D4AF37' }} />
            </div>
          </TrackerCard>
          <TrackerCard icon="👩" title="Jessica Roth IRA" color="#F472B6">
            <StatRow label="Current Balance" value={formatCurrency(rothJessica.balance || 0)} />
            <StatRow label="YTD Contributions" value={formatCurrency(rothJessicaYTD)} valueColor="#D4AF37" />
            <StatRow label="Monthly Contribution" value={`${formatCurrency(rothJessica.monthlyContribution || 583)}/mo`} />
            <StatRow
              label="Annual Goal"
              value={`${formatCurrency(rothJessicaYTD)} / $7,000`}
              valueColor={rothJessicaYTD >= 7000 ? '#4ADE80' : '#FACC15'}
            />
            <div className="progress-bar-wrap" style={{ marginTop: 8 }}>
              <div className="progress-bar-fill" style={{ width: `${Math.min((rothJessicaYTD / 7000) * 100, 100)}%`, backgroundColor: '#F472B6' }} />
            </div>
          </TrackerCard>
        </div>
      </div>

      {/* 401k */}
      <div className="panel">
        <div className="panel-header">
          <h2>401k Accounts</h2>
        </div>
        <div className="roth-individual">
          <TrackerCard icon="👨" title="Vadim 401k" color="#A78BFA">
            <StatRow label="Current Balance" value={formatCurrency(k401Vadim.balance || 0)} />
            <StatRow label="YTD Contributions" value={formatCurrency(k401Vadim.ytdContributions || 0)} valueColor="#A78BFA" />
            <StatRow label="Monthly Contribution" value={`${formatCurrency(k401Vadim.monthlyContribution || 0)}/mo`} />
            {(k401Vadim.annualTarget || 0) > 0 && (
              <>
                <StatRow label="Annual Target" value={formatCurrency(k401Vadim.annualTarget)} />
                <div className="progress-bar-wrap" style={{ marginTop: 8 }}>
                  <div className="progress-bar-fill" style={{ width: `${Math.min(((k401Vadim.ytdContributions || 0) / k401Vadim.annualTarget) * 100, 100)}%`, backgroundColor: '#A78BFA' }} />
                </div>
              </>
            )}
          </TrackerCard>
          <TrackerCard icon="👩" title="Jessica 401k" color="#A78BFA">
            <StatRow label="Current Balance" value={formatCurrency(k401Jessica.balance || 0)} />
            <StatRow label="YTD Contributions" value={formatCurrency(k401Jessica.ytdContributions || 0)} valueColor="#A78BFA" />
            <StatRow label="Monthly Contribution" value={`${formatCurrency(k401Jessica.monthlyContribution || 0)}/mo`} />
            {(k401Jessica.annualTarget || 0) > 0 && (
              <>
                <StatRow label="Annual Target" value={formatCurrency(k401Jessica.annualTarget)} />
                <div className="progress-bar-wrap" style={{ marginTop: 8 }}>
                  <div className="progress-bar-fill" style={{ width: `${Math.min(((k401Jessica.ytdContributions || 0) / k401Jessica.annualTarget) * 100, 100)}%`, backgroundColor: '#A78BFA' }} />
                </div>
              </>
            )}
          </TrackerCard>
        </div>
      </div>

      {/* Brokerage + REIT */}
      <div className="panel">
        <div className="panel-header">
          <h2>Taxable Investments</h2>
        </div>
        <div className="roth-individual">
          <TrackerCard icon="💼" title="Ameriprise Joint Brokerage" color="#38BDF8">
            <StatRow label="Current Balance" value={formatCurrency(brokerage.balance || 0)} />
            <StatRow label="Total Contributed" value={formatCurrency(brokerage.totalContributed || 0)} />
            <StatRow label="Monthly Contribution" value={`${formatCurrency(brokerage.monthlyContribution || 0)}/mo`} />
            <StatRow
              label="Return"
              value={`${formatCurrency(brokerageReturn)} (${brokerageReturnPct >= 0 ? '+' : ''}${brokerageReturnPct.toFixed(1)}%)`}
              valueColor={brokerageReturn >= 0 ? '#4ADE80' : '#F87171'}
            />
          </TrackerCard>
          <TrackerCard icon="🏘️" title="Vadim REIT Account" color="#FB923C">
            <StatRow label="Current Balance" value={formatCurrency(reit.balance || 0)} />
            <StatRow label="Total Contributed" value={formatCurrency(reit.totalContributed || 0)} />
            <StatRow label="Monthly Contribution" value={`${formatCurrency(reit.monthlyContribution || 0)}/mo`} />
            <StatRow
              label="Return"
              value={`${formatCurrency(reitReturn)} (${reitReturnPct >= 0 ? '+' : ''}${reitReturnPct.toFixed(1)}%)`}
              valueColor={reitReturn >= 0 ? '#4ADE80' : '#F87171'}
            />
          </TrackerCard>
        </div>
      </div>
    </div>
  );
}
