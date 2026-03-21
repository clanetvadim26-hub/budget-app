import React, { useState, useMemo } from 'react';
import { addMonths, format } from 'date-fns';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { DEFAULT_ACCOUNTS, OWNER_COLORS } from '../../data/accounts';
import { formatCurrency } from '../../utils/calculations';
import {
  payoffCalc, monthlyInterest, payoffDate, interestSavings, avalancheComparison,
} from '../../utils/debtCalculations';
import {
  generateAmortizationSchedule, loanPayoffSummary,
  generateCombinedDebtTimeline, LOAN_TYPE_META,
} from '../../utils/loanCalculations';
import AddLoanForm from '../forms/AddLoanForm';
import { useConfirm } from '../ConfirmModal';

const CARD_COLORS = ['#F87171', '#FB923C', '#FACC15', '#4ADE80', '#60A5FA', '#A78BFA', '#F472B6'];
const LOAN_COLORS = ['#38BDF8', '#818CF8', '#34D399', '#F472B6', '#FB923C'];

// ── Reusable mini-stat ──────────────────────────────────────────────────────
function DebtStat({ label, value, color, sub }) {
  return (
    <div className="debt-stat">
      <div className="debt-stat-label">{label}</div>
      <div className="debt-stat-value" style={{ color }}>{value}</div>
      {sub && <div className="debt-stat-sub">{sub}</div>}
    </div>
  );
}

// ── Overview ─────────────────────────────────────────────────────────────────
function OverviewSection({ cards, loans }) {
  const ccBalance    = cards.reduce((s, c) => s + (c.balance      || 0), 0);
  const loanBalance  = loans.reduce((s, l) => s + (l.balance      || 0), 0);
  const totalBalance = ccBalance + loanBalance;
  const totalCCMin   = cards.reduce((s, c) => s + (c.minPayment   || 0), 0);
  const totalLoanPmt = loans.reduce((s, l) => s + (l.monthlyPayment || 0), 0);
  const totalMonthly = totalCCMin + totalLoanPmt;
  const ccInterest   = cards.reduce((s, c) => s + monthlyInterest(c.balance, c.apr), 0);
  const loanInterest = loans.reduce((s, l) => s + monthlyInterest(l.balance, l.apr), 0);
  const totalInterest = ccInterest + loanInterest;

  const maxMonths = Math.max(
    ...cards.map((c) => {
      const r = payoffCalc(c.balance, c.apr, Math.max(c.plannedPayment || c.minPayment || 0, 1));
      return isFinite(r.months) ? r.months : 0;
    }),
    ...loans.map((l) => {
      const r = loanPayoffSummary(l.balance, l.apr, Math.max(l.monthlyPayment || 0, 1));
      return isFinite(r.months) ? r.months : 0;
    }),
    0,
  );
  const debtFreeDate = maxMonths > 0
    ? format(addMonths(new Date(), maxMonths), 'MMM yyyy')
    : totalBalance === 0 ? 'Debt Free!' : 'N/A';

  const comparison = useMemo(() => avalancheComparison(cards), [cards]);

  return (
    <div>
      <div className="debt-overview-grid">
        <DebtStat label="Total Debt"        value={formatCurrency(totalBalance)} color="#F87171" sub="Cards + loans combined" />
        <DebtStat label="Credit Card Debt"  value={formatCurrency(ccBalance)}    color="#FB923C" sub={`${cards.filter((c) => c.balance > 0).length} active cards`} />
        <DebtStat label="Installment Loans" value={formatCurrency(loanBalance)}  color="#A78BFA" sub={`${loans.filter((l) => l.balance > 0).length} active loans`} />
        <DebtStat label="Monthly Payments"  value={formatCurrency(totalMonthly)} color="#60A5FA" sub="Min CC + all loans" />
        <DebtStat label="Monthly Interest"  value={formatCurrency(totalInterest)} color="#FACC15" sub="Cost of carrying debt" />
        <DebtStat label="Debt-Free Date"    value={debtFreeDate}                 color="#4ADE80" sub={maxMonths > 0 ? `${maxMonths} months away` : ''} />
      </div>

      {comparison && (
        <div className="debt-comparison-card">
          <div className="dc-title">Avalanche Method Savings (Credit Cards)</div>
          <div className="dc-grid">
            <div className="dc-item">
              <div className="dc-label">Min Payments Only</div>
              <div className="dc-val negative">{isFinite(comparison.minMonths) ? `${comparison.minMonths} months` : 'Never paid off'}</div>
              <div className="dc-sub">{isFinite(comparison.minInterest) ? formatCurrency(comparison.minInterest) + ' interest' : '∞ interest'}</div>
            </div>
            <div className="dc-arrow">→</div>
            <div className="dc-item">
              <div className="dc-label">Your Current Payments</div>
              <div className="dc-val" style={{ color: '#60A5FA' }}>{isFinite(comparison.avalancheMonths) ? `${comparison.avalancheMonths} months` : 'Never paid off'}</div>
              <div className="dc-sub">{isFinite(comparison.avalancheInterest) ? formatCurrency(comparison.avalancheInterest) + ' interest' : '∞ interest'}</div>
            </div>
            <div className="dc-arrow">→</div>
            <div className="dc-item saved">
              <div className="dc-label">You Save</div>
              <div className="dc-val positive">{isFinite(comparison.interestSaved) ? formatCurrency(comparison.interestSaved) : 'N/A'}</div>
              <div className="dc-sub">{isFinite(comparison.monthsSaved) && comparison.monthsSaved > 0 ? `${comparison.monthsSaved} months sooner` : 'in interest'}</div>
            </div>
          </div>
          {comparison.payoffOrder.length > 0 && (
            <div className="dc-order">
              <span className="dc-order-label">Payoff order (Avalanche):</span>
              {comparison.payoffOrder.map((name, i) => (
                <span key={i} className="dc-order-chip">{i + 1}. {name}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Credit card row ────────────────────────────────────────────────────────
function DebtCardRow({ card, rank, isTopAPR }) {
  const today = new Date();
  const daysUntilDue = card.dueDay ? (() => {
    const due = new Date(today.getFullYear(), today.getMonth(), card.dueDay);
    if (due < today) due.setMonth(due.getMonth() + 1);
    return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
  })() : null;

  const dueColor = daysUntilDue === null ? '#64748B'
    : daysUntilDue <= 5  ? '#F87171'
    : daysUntilDue <= 10 ? '#FACC15'
    : '#4ADE80';

  const payment = Math.max(card.plannedPayment || card.minPayment || 0, 1);
  const payoff  = payoffCalc(card.balance, card.apr, payment);
  const intCost = monthlyInterest(card.balance, card.apr);
  const util    = card.creditLimit > 0 ? (card.balance / card.creditLimit) * 100 : 0;
  const utilColor = util < 30 ? '#4ADE80' : util < 60 ? '#FACC15' : '#F87171';
  const ownerColor = OWNER_COLORS[card.owner] || '#94A3B8';

  return (
    <div className={`debt-card-row ${isTopAPR ? 'top-apr' : ''}`}>
      <div className="debt-card-header">
        <div className="debt-card-rank">#{rank}</div>
        <div className="debt-card-info">
          <div className="debt-card-name">
            {card.name}
            {isTopAPR && <span className="avalanche-badge">🔥 Avalanche Priority</span>}
          </div>
          <div className="debt-card-owner" style={{ color: ownerColor }}>{card.owner}</div>
        </div>
        <div className="debt-card-balance">
          <div className="negative" style={{ fontSize: 20, fontWeight: 800 }}>{formatCurrency(card.balance)}</div>
          {card.creditLimit > 0 && <div className="debt-card-limit">of {formatCurrency(card.creditLimit)} limit</div>}
        </div>
      </div>

      {card.creditLimit > 0 && (
        <div className="util-wrap" style={{ marginBottom: 10 }}>
          <div className="util-header">
            <span className="util-label">Utilization</span>
            <span style={{ color: utilColor, fontWeight: 700 }}>{util.toFixed(1)}%</span>
          </div>
          <div className="progress-bar-wrap" style={{ marginBottom: 0 }}>
            <div className="progress-bar-fill" style={{ width: `${Math.min(util, 100)}%`, backgroundColor: utilColor }} />
          </div>
        </div>
      )}

      <div className="debt-card-stats">
        <div className="dcs-item"><span className="dcs-label">APR</span><span className="dcs-val" style={{ color: '#FB923C' }}>{card.apr || 0}%</span></div>
        <div className="dcs-item"><span className="dcs-label">Min Payment</span><span className="dcs-val">{formatCurrency(card.minPayment || 0)}</span></div>
        <div className="dcs-item"><span className="dcs-label">Planned</span><span className="dcs-val" style={{ color: '#60A5FA' }}>{formatCurrency(payment)}</span></div>
        <div className="dcs-item"><span className="dcs-label">Interest/mo</span><span className="dcs-val negative">{formatCurrency(intCost)}</span></div>
        <div className="dcs-item">
          <span className="dcs-label">Due Day</span>
          <span className="dcs-val" style={{ color: dueColor }}>
            {card.dueDay ? `${card.dueDay}th` : '—'}
            {daysUntilDue !== null && ` (${daysUntilDue}d)`}
          </span>
        </div>
        <div className="dcs-item">
          <span className="dcs-label">Payoff</span>
          <span className="dcs-val" style={{ color: '#4ADE80' }}>
            {isFinite(payoff.months) ? `${payoff.months} mo (${payoffDate(payoff.months)})` : 'Never at min'}
          </span>
        </div>
        {isFinite(payoff.totalInterest) && (
          <div className="dcs-item">
            <span className="dcs-label">Total Interest</span>
            <span className="dcs-val negative">{formatCurrency(payoff.totalInterest)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Amortization Schedule ──────────────────────────────────────────────────
function AmortizationSchedule({ loan }) {
  const schedule = useMemo(
    () => generateAmortizationSchedule(loan.balance, loan.apr, loan.monthlyPayment),
    [loan.balance, loan.apr, loan.monthlyPayment],
  );

  const totalPayments  = schedule.reduce((s, r) => s + r.payment,   0);
  const totalPrincipal = schedule.reduce((s, r) => s + r.principal,  0);
  const totalInterest  = schedule.reduce((s, r) => s + r.interest,   0);

  // Downsample for chart: every month up to 36, then every 3
  const chartData = schedule.filter((r) => r.paymentNum <= 36 || r.paymentNum % 3 === 0);

  const TooltipCustom = ({ active, payload, label }) => {
    if (active && payload?.length) {
      return (
        <div className="chart-tooltip">
          <div className="tooltip-label">{label}</div>
          <div className="tooltip-amount">{formatCurrency(payload[0].value)}</div>
        </div>
      );
    }
    return null;
  };

  if (!schedule.length) {
    return <div className="empty-state" style={{ padding: '16px 0' }}>No payments to show.</div>;
  }

  return (
    <div className="amort-wrap">
      <div className="chart-title" style={{ marginBottom: 12 }}>Balance Paydown — {loan.name}</div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
          <defs>
            <linearGradient id="amortGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#D4AF37" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}   />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
          <XAxis dataKey="date" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip content={<TooltipCustom />} />
          <Area type="monotone" dataKey="remainingBalance" stroke="#D4AF37" fill="url(#amortGrad)" strokeWidth={2} dot={false} name="Balance" />
        </AreaChart>
      </ResponsiveContainer>

      <div className="amort-table-wrap">
        <table className="amort-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Date</th>
              <th>Payment</th>
              <th>Principal</th>
              <th>Interest</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            {schedule.map((row) => (
              <tr key={row.paymentNum} className={row.paymentNum === 1 ? 'amort-current' : ''}>
                <td>{row.paymentNum}</td>
                <td>{row.date}{row.paymentNum === 1 && <span className="amort-next-badge">Next</span>}</td>
                <td>{formatCurrency(row.payment)}</td>
                <td className="positive">{formatCurrency(row.principal)}</td>
                <td className="negative">{formatCurrency(row.interest)}</td>
                <td>{formatCurrency(row.remainingBalance)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="amort-totals">
              <td colSpan={2}>Totals ({schedule.length} payments)</td>
              <td>{formatCurrency(totalPayments)}</td>
              <td className="positive">{formatCurrency(totalPrincipal)}</td>
              <td className="negative">{formatCurrency(totalInterest)}</td>
              <td>$0.00</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function calcPayment(balance, aprPct, termMonths) {
  if (!balance || balance <= 0 || !termMonths) return 0;
  const r = (aprPct || 0) / 100 / 12;
  if (r === 0) return balance / termMonths;
  return (balance * r * Math.pow(1 + r, termMonths)) / (Math.pow(1 + r, termMonths) - 1);
}

const SCENARIO_COLORS = ['#60A5FA', '#4ADE80', '#F472B6', '#FB923C', '#A78BFA', '#34D399'];

// ── Refinance Scenario Form ──────────────────────────────────────────────────
function ScenarioForm({ onSave, onCancel, balance }) {
  const [form, setForm] = useState({ name: '', newApr: '', termMonths: '', notes: '' });
  const f = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const autoPayment = form.newApr !== '' && form.termMonths
    ? calcPayment(balance, Number(form.newApr), Number(form.termMonths))
    : null;

  return (
    <div className="scenario-form">
      <div className="form-row">
        <div className="form-group">
          <label>Scenario Name</label>
          <input placeholder="e.g. Refi at 5%" value={form.name} onChange={(e) => f('name', e.target.value)} />
        </div>
        <div className="form-group">
          <label>New APR (%)</label>
          <input type="number" min="0" step="0.01" placeholder="e.g. 5.25" value={form.newApr} onChange={(e) => f('newApr', e.target.value)} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Term (months)</label>
          <input type="number" min="1" step="1" placeholder="e.g. 60" value={form.termMonths} onChange={(e) => f('termMonths', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Monthly Payment ($)
            {autoPayment && (
              <span className="scenario-auto-calc"> auto: {formatCurrency(autoPayment)}</span>
            )}
          </label>
          <input
            type="number" min="0" step="0.01"
            placeholder={autoPayment ? autoPayment.toFixed(2) : '0.00'}
            value={form.monthlyPayment || ''}
            onChange={(e) => f('monthlyPayment', e.target.value)}
          />
        </div>
      </div>
      <div className="form-group">
        <label>Notes (optional)</label>
        <input placeholder="e.g. Credit union offer" value={form.notes} onChange={(e) => f('notes', e.target.value)} />
      </div>
      <div className="form-actions">
        <button
          className="btn-primary"
          disabled={!form.name || !form.newApr || !form.termMonths}
          onClick={() => {
            const payment = form.monthlyPayment
              ? Number(form.monthlyPayment)
              : calcPayment(balance, Number(form.newApr), Number(form.termMonths));
            onSave({
              id: Date.now().toString(),
              name: form.name,
              newApr: Number(form.newApr),
              termMonths: Number(form.termMonths),
              monthlyPayment: payment,
              notes: form.notes,
            });
          }}
        >
          Add Scenario
        </button>
        <button className="btn-cancel-lg" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ── Refinance Comparison Chart ───────────────────────────────────────────────
function RefinanceChart({ loan, scenarios }) {
  const maxMonths = Math.max(
    loanPayoffSummary(loan.balance, loan.apr, loan.monthlyPayment).months,
    ...scenarios.map((s) => loanPayoffSummary(loan.balance, s.newApr, s.monthlyPayment).months),
    1
  );
  const cap = Math.min(isFinite(maxMonths) ? maxMonths : 120, 360);
  const step = Math.max(1, Math.floor(cap / 36));

  const data = [];
  for (let m = 0; m <= cap; m += step) {
    const row = { month: m };
    // Current
    const curSchedule = generateAmortizationSchedule(loan.balance, loan.apr, loan.monthlyPayment);
    row.current = curSchedule[m - 1]?.remainingBalance ?? (m === 0 ? loan.balance : 0);
    // Scenarios
    scenarios.forEach((s) => {
      const sch = generateAmortizationSchedule(loan.balance, s.newApr, s.monthlyPayment);
      row[s.id] = sch[m - 1]?.remainingBalance ?? (m === 0 ? loan.balance : 0);
    });
    data.push(row);
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
        <XAxis dataKey="month" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} label={{ value: 'Months', position: 'insideBottom', fill: '#64748B', fontSize: 10 }} />
        <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip formatter={(v) => formatCurrency(v)} labelFormatter={(l) => `Month ${l}`} contentStyle={{ background: '#0F1629', border: '1px solid #1E2A45', borderRadius: 8, fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
        <Line type="monotone" dataKey="current" stroke="#F87171" strokeWidth={2} dot={false} name="Current" />
        {scenarios.map((s, i) => (
          <Line key={s.id} type="monotone" dataKey={s.id} stroke={SCENARIO_COLORS[i % SCENARIO_COLORS.length]} strokeWidth={2} dot={false} name={s.name} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Refinance Scenarios Section ──────────────────────────────────────────────
function RefinanceScenariosSection({ loan, onUpdateLoan }) {
  const [showForm, setShowForm] = useState(false);
  const confirm = useConfirm();
  const scenarios = loan.scenarios || [];

  const currentSummary = useMemo(
    () => loanPayoffSummary(loan.balance, loan.apr, loan.monthlyPayment),
    [loan.balance, loan.apr, loan.monthlyPayment]
  );

  const addScenario = (scenario) => {
    onUpdateLoan({ ...loan, scenarios: [...scenarios, scenario] });
    setShowForm(false);
  };

  const deleteScenario = async (id, name) => {
    const ok = await confirm(name);
    if (ok) onUpdateLoan({ ...loan, scenarios: scenarios.filter((s) => s.id !== id) });
  };

  // Determine best option (lowest total interest)
  const scenarioStats = scenarios.map((s) => ({
    ...s,
    ...loanPayoffSummary(loan.balance, s.newApr, s.monthlyPayment),
  }));
  const bestId = scenarioStats.length > 0
    ? scenarioStats.reduce((best, s) =>
        (s.totalInterest < best.totalInterest ? s : best), scenarioStats[0]).id
    : null;

  return (
    <div className="refinance-section">
      <div className="refinance-header">
        <div className="refinance-title">Refinance Scenarios</div>
        <button className="btn-add-small" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : '+ Add Scenario'}
        </button>
      </div>

      {showForm && <ScenarioForm balance={loan.balance} onSave={addScenario} onCancel={() => setShowForm(false)} />}

      {/* Scenario cards */}
      {scenarioStats.length === 0 && !showForm && (
        <div className="empty-state" style={{ fontSize: 12, padding: '10px 0' }}>
          Add a refinance scenario to compare rates and terms.
        </div>
      )}
      <div className="scenario-cards">
        {scenarioStats.map((s, i) => {
          const color = SCENARIO_COLORS[i % SCENARIO_COLORS.length];
          const savings = currentSummary.totalInterest - s.totalInterest;
          const isBest = s.id === bestId && scenarioStats.length > 1;
          return (
            <div key={s.id} className="scenario-card" style={{ borderColor: color + '55' }}>
              <div className="scenario-card-header">
                <span className="scenario-name" style={{ color }}>{s.name}</span>
                <div className="scenario-card-actions">
                  {isBest && <span className="scenario-best-badge">Best Option</span>}
                  <button className="btn-icon danger" onClick={() => deleteScenario(s.id, s.name)}>🗑️</button>
                </div>
              </div>
              <div className="scenario-stats">
                <div className="scenario-stat">
                  <span className="ss-label">New APR</span>
                  <span className="ss-val" style={{ color }}>{s.newApr}%</span>
                </div>
                <div className="scenario-stat">
                  <span className="ss-label">Term</span>
                  <span className="ss-val">{s.termMonths} mo</span>
                </div>
                <div className="scenario-stat">
                  <span className="ss-label">Payment</span>
                  <span className="ss-val" style={{ color: '#60A5FA' }}>{formatCurrency(s.monthlyPayment)}/mo</span>
                </div>
                <div className="scenario-stat">
                  <span className="ss-label">Total Interest</span>
                  <span className="ss-val negative">{isFinite(s.totalInterest) ? formatCurrency(s.totalInterest) : '∞'}</span>
                </div>
                <div className="scenario-stat">
                  <span className="ss-label">vs Current</span>
                  <span className={`ss-val ${savings >= 0 ? 'positive' : 'negative'}`}>
                    {savings >= 0 ? `-${formatCurrency(savings)}` : `+${formatCurrency(-savings)}`}
                  </span>
                </div>
                <div className="scenario-stat">
                  <span className="ss-label">Payoff</span>
                  <span className="ss-val">{isFinite(s.months) ? payoffDate(s.months) : '—'}</span>
                </div>
              </div>
              {s.notes && <div className="scenario-notes">{s.notes}</div>}
            </div>
          );
        })}
      </div>

      {/* Comparison chart */}
      {scenarios.length > 0 && (
        <>
          <div className="refinance-chart-title">Balance Comparison</div>
          <RefinanceChart loan={loan} scenarios={scenarios} />
          {/* Comparison table */}
          <table className="scenario-compare-table">
            <thead>
              <tr>
                <th>Scenario</th>
                <th>APR</th>
                <th>Payment</th>
                <th>Months</th>
                <th>Total Interest</th>
                <th>Savings</th>
              </tr>
            </thead>
            <tbody>
              <tr className="scenario-compare-current">
                <td>Current</td>
                <td>{loan.apr || 0}%</td>
                <td>{formatCurrency(loan.monthlyPayment)}</td>
                <td>{isFinite(currentSummary.months) ? currentSummary.months : '∞'}</td>
                <td className="negative">{isFinite(currentSummary.totalInterest) ? formatCurrency(currentSummary.totalInterest) : '∞'}</td>
                <td>—</td>
              </tr>
              {scenarioStats.map((s, i) => {
                const savings = currentSummary.totalInterest - s.totalInterest;
                const color = SCENARIO_COLORS[i % SCENARIO_COLORS.length];
                return (
                  <tr key={s.id} style={{ borderLeft: `3px solid ${color}` }}>
                    <td style={{ color }}>{s.name}{s.id === bestId && scenarioStats.length > 1 ? ' ★' : ''}</td>
                    <td>{s.newApr}%</td>
                    <td>{formatCurrency(s.monthlyPayment)}</td>
                    <td>{isFinite(s.months) ? s.months : '∞'}</td>
                    <td className="negative">{isFinite(s.totalInterest) ? formatCurrency(s.totalInterest) : '∞'}</td>
                    <td className={savings >= 0 ? 'positive' : 'negative'}>
                      {savings >= 0 ? `-${formatCurrency(savings)}` : `+${formatCurrency(-savings)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

// ── Loan Card ──────────────────────────────────────────────────────────────
function LoanCard({ loan, expanded, onToggleExpand, onEdit, onDelete, onUpdate }) {
  const today = new Date();
  const meta  = LOAN_TYPE_META[loan.type] || LOAN_TYPE_META.other;
  const ownerColor = OWNER_COLORS[loan.owner] || '#94A3B8';

  const pctPaid = loan.originalAmount > 0
    ? Math.min(100, ((loan.originalAmount - loan.balance) / loan.originalAmount) * 100)
    : 0;

  const daysUntilDue = loan.dueDay ? (() => {
    const due = new Date(today.getFullYear(), today.getMonth(), loan.dueDay);
    if (due < today) due.setMonth(due.getMonth() + 1);
    return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
  })() : null;

  const dueColor = daysUntilDue === null ? '#64748B'
    : daysUntilDue <= 5  ? '#F87171'
    : daysUntilDue <= 10 ? '#FACC15'
    : '#4ADE80';

  const summary   = useMemo(() => loanPayoffSummary(loan.balance, loan.apr, loan.monthlyPayment), [loan]);
  const intCost   = monthlyInterest(loan.balance, loan.apr);

  return (
    <div className="loan-card">
      {/* Header */}
      <div className="loan-card-header">
        <div className="loan-card-title-row">
          <span className="loan-type-badge" style={{ backgroundColor: meta.color + '22', color: meta.color, borderColor: meta.color + '55' }}>
            {meta.icon} {meta.label}
          </span>
          <span className="loan-owner-badge" style={{ color: ownerColor }}>{loan.owner}</span>
        </div>
        <div className="loan-card-name-row">
          <div className="loan-card-name">{loan.name}</div>
          <div className="loan-card-actions">
            <button className="loan-action-btn" onClick={onEdit} title="Edit">✏️</button>
            <button className="loan-action-btn" onClick={onDelete} title="Delete">🗑️</button>
          </div>
        </div>
      </div>

      {/* Balance + original */}
      <div className="loan-balance-row">
        <div>
          <div className="loan-balance-label">Remaining Balance</div>
          <div className="loan-balance-value negative">{formatCurrency(loan.balance)}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="loan-balance-label">Original Amount</div>
          <div className="loan-balance-value">{formatCurrency(loan.originalAmount)}</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="loan-progress-wrap">
        <div className="loan-progress-header">
          <span className="loan-progress-label">Paid Off</span>
          <span className="loan-progress-pct" style={{ color: '#D4AF37' }}>{pctPaid.toFixed(1)}%</span>
        </div>
        <div className="loan-progress-track">
          <div className="loan-progress-fill" style={{ width: `${pctPaid}%` }} />
        </div>
        <div className="loan-progress-sub">
          {formatCurrency(loan.originalAmount - loan.balance)} paid · {formatCurrency(loan.balance)} remaining
        </div>
      </div>

      {/* Stats grid */}
      <div className="loan-stats-grid">
        <div className="loan-stat-item">
          <span className="loan-stat-label">Monthly Payment</span>
          <span className="loan-stat-val" style={{ color: '#60A5FA' }}>{formatCurrency(loan.monthlyPayment)}</span>
        </div>
        <div className="loan-stat-item">
          <span className="loan-stat-label">APR</span>
          <span className="loan-stat-val" style={{ color: '#FB923C' }}>{loan.apr || 0}%</span>
        </div>
        <div className="loan-stat-item">
          <span className="loan-stat-label">Due Day</span>
          <span className="loan-stat-val" style={{ color: dueColor }}>
            {loan.dueDay ? `${loan.dueDay}th` : '—'}
            {daysUntilDue !== null && ` (${daysUntilDue}d)`}
          </span>
        </div>
        <div className="loan-stat-item">
          <span className="loan-stat-label">Monthly Interest</span>
          <span className="loan-stat-val negative">{formatCurrency(intCost)}</span>
        </div>
        <div className="loan-stat-item">
          <span className="loan-stat-label">Estimated Payoff</span>
          <span className="loan-stat-val" style={{ color: '#4ADE80' }}>
            {isFinite(summary.months) ? payoffDate(summary.months) : 'Never at current payment'}
          </span>
        </div>
        <div className="loan-stat-item">
          <span className="loan-stat-label">Total Interest Left</span>
          <span className="loan-stat-val negative">
            {isFinite(summary.totalInterest) ? formatCurrency(summary.totalInterest) : '∞'}
          </span>
        </div>
      </div>

      {/* Notes */}
      {loan.notes && (
        <div className="loan-notes">{loan.notes}</div>
      )}

      {/* Expand button */}
      <button className="loan-expand-btn" onClick={onToggleExpand}>
        {expanded ? '▲ Collapse Details' : '▼ Amortization Schedule & Refinance Scenarios'}
      </button>

      {/* Expanded content */}
      {expanded && (
        <>
          <AmortizationSchedule loan={loan} />
          <RefinanceScenariosSection loan={loan} onUpdateLoan={onUpdate} />
        </>
      )}
    </div>
  );
}

// ── Loans Section ──────────────────────────────────────────────────────────
function LoansSection({ loans, setLoans }) {
  const [showForm,    setShowForm]    = useState(false);
  const [editingLoan, setEditingLoan] = useState(null);
  const [expandedId,  setExpandedId]  = useState(null);
  const confirm = useConfirm();

  const handleAdd = (loan) => {
    if (editingLoan) {
      setLoans((prev) => prev.map((l) => l.id === loan.id ? loan : l));
    } else {
      setLoans((prev) => [...prev, loan]);
    }
    setShowForm(false);
    setEditingLoan(null);
  };

  const handleEdit = (loan) => {
    setEditingLoan(loan);
    setShowForm(true);
  };

  const handleDelete = async (id, name) => {
    const ok = await confirm(name);
    if (ok) {
      setLoans((prev) => prev.filter((l) => l.id !== id));
      if (expandedId === id) setExpandedId(null);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingLoan(null);
  };

  return (
    <div>
      <div className="loans-section-header">
        <h3 className="loans-section-title">Installment Loans</h3>
        <button className="btn-add-loan" onClick={() => { setEditingLoan(null); setShowForm(true); }}>
          + Add Loan
        </button>
      </div>

      {loans.length === 0 ? (
        <div className="empty-state" style={{ margin: '16px 0' }}>
          No installment loans yet. Click "Add Loan" to track a car loan, mortgage, or personal loan.
        </div>
      ) : (
        <div className="loans-list">
          {loans.map((loan) => (
            <LoanCard
              key={loan.id}
              loan={loan}
              expanded={expandedId === loan.id}
              onToggleExpand={() => setExpandedId(expandedId === loan.id ? null : loan.id)}
              onEdit={() => handleEdit(loan)}
              onDelete={() => handleDelete(loan.id, loan.name)}
              onUpdate={(updated) => setLoans((prev) => prev.map((l) => l.id === updated.id ? updated : l))}
            />
          ))}
        </div>
      )}

      {showForm && (
        <AddLoanForm
          onAdd={handleAdd}
          onCancel={handleCancel}
          initialData={editingLoan}
        />
      )}
    </div>
  );
}

// ── Calculator ─────────────────────────────────────────────────────────────
function CalculatorSection({ cards }) {
  const [selectedId, setSelectedId] = useState(cards[0]?.id || '');
  const [balance,    setBalance]    = useState('');
  const [apr,        setApr]        = useState('');
  const [payment,    setPayment]    = useState('');

  const card   = cards.find((c) => c.id === selectedId);
  const b      = parseFloat(balance)  || card?.balance             || 0;
  const r      = parseFloat(apr)      || card?.apr                 || 0;
  const p      = parseFloat(payment)  || card?.plannedPayment || card?.minPayment || 0;
  const result = useMemo(() => payoffCalc(b, r, p), [b, r, p]);
  const s50    = useMemo(() => interestSavings(b, r, p, 50),  [b, r, p]);
  const s100   = useMemo(() => interestSavings(b, r, p, 100), [b, r, p]);
  const s200   = useMemo(() => interestSavings(b, r, p, 200), [b, r, p]);

  const handleCardChange = (id) => {
    setSelectedId(id);
    const c = cards.find((x) => x.id === id);
    if (c) { setBalance(String(c.balance || '')); setApr(String(c.apr || '')); setPayment(String(c.plannedPayment || c.minPayment || '')); }
  };

  const TooltipCustom = ({ active, payload, label }) => {
    if (active && payload?.length) {
      return (
        <div className="chart-tooltip">
          <div className="tooltip-label">Month {label}</div>
          <div className="tooltip-amount">{formatCurrency(payload[0].value)}</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <div className="calc-form-grid">
        <div className="form-group">
          <label>Select Card</label>
          <select value={selectedId} onChange={(e) => handleCardChange(e.target.value)}>
            {cards.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.owner})</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Balance ($)</label>
          <input type="number" min="0" step="0.01" placeholder={String(card?.balance || 0)} value={balance} onChange={(e) => setBalance(e.target.value)} />
        </div>
        <div className="form-group">
          <label>APR (%)</label>
          <input type="number" min="0" step="0.01" placeholder={String(card?.apr || 0)} value={apr} onChange={(e) => setApr(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Monthly Payment ($)</label>
          <input type="number" min="0" step="0.01" placeholder={String(card?.plannedPayment || card?.minPayment || 0)} value={payment} onChange={(e) => setPayment(e.target.value)} />
        </div>
      </div>

      {b > 0 && p > 0 && (
        <>
          <div className="calc-results">
            <div className="calc-result-item"><div className="calc-result-label">Months to Payoff</div><div className="calc-result-val" style={{ color: '#4ADE80' }}>{isFinite(result.months) ? result.months : '∞'}</div></div>
            <div className="calc-result-item"><div className="calc-result-label">Payoff Date</div><div className="calc-result-val" style={{ color: '#60A5FA' }}>{payoffDate(result.months)}</div></div>
            <div className="calc-result-item"><div className="calc-result-label">Total Interest Paid</div><div className="calc-result-val negative">{isFinite(result.totalInterest) ? formatCurrency(result.totalInterest) : '∞'}</div></div>
            <div className="calc-result-item"><div className="calc-result-label">Total Amount Paid</div><div className="calc-result-val">{isFinite(result.totalPaid) ? formatCurrency(result.totalPaid) : '∞'}</div></div>
          </div>

          {isFinite(result.months) && result.timeline.length > 1 && (
            <div style={{ marginTop: 20 }}>
              <div className="chart-title">Balance Paydown Timeline</div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={result.timeline} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="debtGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#F87171" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#F87171" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis dataKey="month" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} label={{ value: 'Month', position: 'insideBottom', offset: -2, fill: '#64748B', fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<TooltipCustom />} />
                  <Area type="monotone" dataKey="balance" stroke="#F87171" fill="url(#debtGrad)" strokeWidth={2} dot={false} name="Balance" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="savings-scenarios">
            <div className="ss-title">Interest Savings by Paying More</div>
            {[{ label: '+$50/mo', data: s50 }, { label: '+$100/mo', data: s100 }, { label: '+$200/mo', data: s200 }].map(({ label, data }) => (
              <div key={label} className="ss-row">
                <span className="ss-label">{label}</span>
                {data ? (
                  <>
                    <span className="ss-saved positive">Save {formatCurrency(data.interestSaved)}</span>
                    <span className="ss-months">({data.monthsSaved} months sooner → {payoffDate(data.newMonths)})</span>
                  </>
                ) : (
                  <span className="ss-saved" style={{ color: '#64748B' }}>Not applicable</span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Timeline (cards + loans combined) ─────────────────────────────────────
function TimelineSection({ cards, loans }) {
  const { data, cards: activeCards, loans: activeLoans } = useMemo(
    () => generateCombinedDebtTimeline(cards, loans),
    [cards, loans],
  );

  if (!data.length) {
    return <div className="empty-state">No active debt balances to show.</div>;
  }

  const TooltipCustom = ({ active, payload, label }) => {
    if (active && payload?.length) {
      return (
        <div className="chart-tooltip">
          <div className="tooltip-label">Month {label}</div>
          {payload.map((p) => (
            <div key={p.dataKey} style={{ color: p.color }}>{p.name}: {formatCurrency(p.value)}</div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <div className="chart-title" style={{ marginBottom: 16 }}>Projected Balance — All Debt Until Payoff</div>
      <div className="timeline-legend-hint">
        {activeCards.length > 0 && <span style={{ color: '#94A3B8', fontSize: 12 }}>Solid lines = credit cards &nbsp;·&nbsp;</span>}
        {activeLoans.length > 0 && <span style={{ color: '#94A3B8', fontSize: 12 }}>Dashed lines = installment loans</span>}
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
          <XAxis dataKey="month" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} label={{ value: 'Month', position: 'insideBottom', offset: -2, fill: '#64748B', fontSize: 11 }} />
          <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip content={<TooltipCustom />} />
          <Legend formatter={(v) => <span style={{ color: '#CBD5E1', fontSize: 12 }}>{v}</span>} />
          {activeCards.map((card, i) => (
            <Line
              key={card.id}
              type="monotone"
              dataKey={card.id}
              name={card.name}
              stroke={CARD_COLORS[i % CARD_COLORS.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
          {activeLoans.map((loan, i) => (
            <Line
              key={loan.id}
              type="monotone"
              dataKey={`loan_${loan.id}`}
              name={`${loan.name}`}
              stroke={LOAN_COLORS[i % LOAN_COLORS.length]}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Main Panel ─────────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',   label: '📊 Overview'  },
  { id: 'cards',      label: '💳 Cards'     },
  { id: 'loans',      label: '🏦 Loans'     },
  { id: 'calculator', label: '🧮 Calculator' },
  { id: 'timeline',   label: '📉 Timeline'  },
];

export default function DebtPanel() {
  const [accounts]        = useLocalStorage('budget_accounts', DEFAULT_ACCOUNTS);
  const [loans, setLoans]  = useLocalStorage('budget_loans',   []);
  const [tab, setTab]      = useState('overview');

  const creditCards = useMemo(
    () => accounts.filter((a) => a.type === 'credit').sort((a, b) => (b.apr || 0) - (a.apr || 0)),
    [accounts],
  );

  const totalCC   = creditCards.reduce((s, c) => s + (c.balance || 0), 0);
  const totalLoan = loans.reduce((s, l) => s + (l.balance || 0), 0);
  const totalDebt = totalCC + totalLoan;

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Debt Management</h2>
        <span className="panel-subtitle">
          {creditCards.filter((c) => c.balance > 0).length} cards · {loans.filter((l) => l.balance > 0).length} loans · {formatCurrency(totalDebt)} total
        </span>
      </div>

      <div className="debt-tabs">
        {TABS.map((t) => (
          <button key={t.id} className={`debt-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 24 }}>
        {tab === 'overview' && <OverviewSection cards={creditCards} loans={loans} />}

        {tab === 'cards' && (
          creditCards.length === 0
            ? <div className="empty-state">No credit cards found. Add credit card accounts in the Accounts tab.</div>
            : <div className="debt-cards-list">
                {creditCards.map((card, i) => (
                  <DebtCardRow key={card.id} card={card} rank={i + 1} isTopAPR={i === 0 && card.balance > 0} />
                ))}
              </div>
        )}

        {tab === 'loans' && (
          <LoansSection loans={loans} setLoans={setLoans} />
        )}

        {tab === 'calculator' && (
          creditCards.length === 0
            ? <div className="empty-state">Add credit card accounts with balances and APR to use the calculator.</div>
            : <CalculatorSection cards={creditCards} />
        )}

        {tab === 'timeline' && <TimelineSection cards={creditCards} loans={loans} />}
      </div>
    </div>
  );
}
