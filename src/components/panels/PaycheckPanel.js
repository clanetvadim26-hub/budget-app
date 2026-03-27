import React, { useState, useMemo, useEffect } from 'react';
import PaycheckHistoryPanel from './PaycheckHistoryPanel';
import { addDays, addMonths, format, differenceInDays, parseISO } from 'date-fns';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { DEFAULT_RECURRING_EXPENSES, DEFAULT_RECURRING_INCOMES } from '../../data/defaultRecurring';
import { DEFAULT_BUDGET_SETTINGS } from '../../data/defaultBudgetSettings';
import { DEFAULT_ACCOUNTS } from '../../data/accounts';
import { formatCurrencyFull } from '../../utils/calculations';
import { getRecurringDates } from '../../utils/recurringDates';
import { getBillsDueInPayPeriod } from '../../utils/paycheckAllocation';
import InlineEdit from '../InlineEdit';

// ── Constants ────────────────────────────────────────────────────────────────
const ROTH_DEADLINE  = new Date(2026, 3, 15); // April 15, 2026
const K401_START     = new Date(2026, 5,  1); // June 1, 2026
const CAR_INS_EXPIRY = new Date(2026, 5, 23); // June 23, 2026

const VADIM_MSGS = [
  'Every dollar you invest today is working while you sleep.',
  "You and Jessica are saving at a 23% rate — top 20% of Americans your age.",
  "Financial freedom isn't a destination — it's a habit you're already building.",
  'Your Roth IRA contributions grow tax-free for decades. Long-game mindset.',
  'Consistency beats intensity. Keep showing up every payday.',
  'Investing isn\'t risky. Not investing is.',
  "You're building generational wealth one paycheck at a time.",
  'Your future self will thank you for every dollar you save today.',
];
const JESSICA_MSGS_CE = [
  'Every dollar into your Roth IRA grows tax-free — future you will be grateful.',
  'Your Competitive Edge paycheck is building your independence and your wealth.',
  "You're not just paying bills — you're building wealth with Vadim one paycheck at a time.",
];
const JESSICA_MSGS_OT = [
  'Your Orange Theory paycheck is building both your fitness AND your financial future.',
  'Every consistent paycheck, no matter the size, adds up to something big.',
  'Keep showing up. At the gym and at the bank.',
];
const JESSICA_MSGS_COMBINED = [
  "Two income streams, one shared goal. You and Vadim are unstoppable.",
  "Every paycheck you follow this plan gets you closer to financial freedom.",
  "You're not just paying bills — you're building wealth one paycheck at a time.",
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function tryParseDate(str) {
  if (!str) return null;
  let d = parseISO(str);
  if (!isNaN(d.getTime())) return d;
  const parts = str.split('/');
  if (parts.length === 3) {
    const [m, day, y] = parts;
    const year = y.length === 2 ? `20${y}` : y;
    d = new Date(`${year}-${m.padStart(2,'0')}-${day.padStart(2,'0')}`);
    if (!isNaN(d.getTime())) return d;
  }
  d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function formatPayday(dateStr) {
  if (!dateStr) return '—';
  try {
    const date = tryParseDate(dateStr);
    if (!date) return dateStr;
    const days = differenceInDays(date, new Date());
    const formatted = format(date, 'MM/dd/yy');
    if (days < 0)  return `Overdue (${formatted})`;
    if (days === 0) return `Today! (${formatted})`;
    if (days === 1) return `Tomorrow (${formatted})`;
    return `in ${days} days (${formatted})`;
  } catch { return dateStr; }
}

const fmt = formatCurrencyFull;

function getUpcomingPaydays(income, count = 4) {
  if (!income) return [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const end = addMonths(today, 3);
  return getRecurringDates(income.startDate, income.frequency, end)
    .filter(d => { const dd = new Date(d); dd.setHours(0, 0, 0, 0); return dd >= today; })
    .slice(0, count);
}

function getCurrentPeriod(income) {
  if (!income) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const end = addMonths(today, 3);
  const all = getRecurringDates(income.startDate, income.frequency, end);
  const past   = all.filter(d => { const dd = new Date(d); dd.setHours(0,0,0,0); return dd <= today; });
  const future = all.filter(d => { const dd = new Date(d); dd.setHours(0,0,0,0); return dd > today; });
  const periodStart  = past.length   ? past[past.length - 1] : all[0];
  const nextPayday   = future.length ? future[0] : null;
  const periodEnd    = nextPayday    ? addDays(nextPayday, -1) : addDays(periodStart, 13);
  return { start: periodStart, end: periodEnd, nextPayday };
}

// ── Shared UI pieces ─────────────────────────────────────────────────────────
function PersonToggle({ person, setPerson }) {
  return (
    <div className="pc-person-toggle">
      <button className={`pc-person-btn${person === 'vadim' ? ' active' : ''}`} onClick={() => setPerson('vadim')}>
        👨 Vadim
      </button>
      <button className={`pc-person-btn${person === 'jessica' ? ' active' : ''}`} onClick={() => setPerson('jessica')}>
        👩 Jessica
      </button>
    </div>
  );
}

function MotivationalMessage({ messages, msgIdx }) {
  return (
    <div className="pc-motivation">
      <span className="pc-motivation-icon">✨</span>
      <span className="pc-motivation-text">{messages[msgIdx % messages.length]}</span>
    </div>
  );
}

function RunningBalance({ label, amount }) {
  const color = amount >= 0 ? '#4ADE80' : '#F87171';
  return (
    <div className="pc-running-balance">
      <span className="pc-rb-label">{label}</span>
      <span className="pc-rb-amount" style={{ color }}>{fmt(amount)}</span>
    </div>
  );
}

function StepCard({ step, title, icon, color, children, subtotal, subtotalLabel, runningBalance, runningLabel }) {
  return (
    <div className="pc-step-card" style={{ borderLeftColor: color }}>
      <div className="pc-step-header">
        <span className="pc-step-num" style={{ background: color }}>{step}</span>
        <span className="pc-step-icon">{icon}</span>
        <span className="pc-step-title">{title}</span>
      </div>
      <div className="pc-step-body">{children}</div>
      {subtotal != null && (
        <div className="pc-step-subtotal">
          <span>{subtotalLabel || 'Subtotal'}</span>
          <span style={{ color }}>{fmt(subtotal)}</span>
        </div>
      )}
      {runningBalance != null && (
        <RunningBalance label={runningLabel || 'Remaining'} amount={runningBalance} />
      )}
    </div>
  );
}

function AllocationBar({ paycheck, billsTotal, savingsTotal, varTotal, discretionary }) {
  const total = paycheck || 1;
  const segs = [
    { label: 'Bills',        value: billsTotal,    color: '#F87171' },
    { label: 'Savings',      value: savingsTotal,  color: '#4ADE80' },
    { label: 'Spending',     value: varTotal,      color: '#FBBF24' },
    { label: 'Discretionary',value: discretionary, color: '#D4AF37' },
  ];
  return (
    <div className="pc-alloc-bar-wrap">
      <div className="pc-alloc-bar-label">PAYCHECK ALLOCATION</div>
      <div className="pc-alloc-bar">
        {segs.map(s => (
          <div
            key={s.label}
            className="pc-alloc-seg"
            style={{ width: `${Math.max(0, (s.value / total) * 100).toFixed(1)}%`, background: s.color }}
            title={`${s.label}: ${fmt(s.value)}`}
          />
        ))}
      </div>
      <div className="pc-alloc-bar-legend">
        {segs.map(s => (
          <div key={s.label} className="pc-alloc-legend-item">
            <span className="pc-alloc-dot" style={{ background: s.color }} />
            <span className="pc-alloc-lname">{s.label}</span>
            <span style={{ color: s.color }}>{Math.max(0, (s.value / total) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PieBreakdown({ data }) {
  return (
    <div className="pc-pie-wrap">
      <div className="pc-section-label">PAYCHECK BREAKDOWN</div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2} dataKey="value">
            {data.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
          </Pie>
          <Tooltip
            formatter={(v) => fmt(v)}
            contentStyle={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 8, color: '#F8FAFC', fontSize: 12 }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pc-pie-legend">
        {data.map(d => (
          <div key={d.name} className="pc-pie-item">
            <span className="pc-pie-dot" style={{ background: d.fill }} />
            <span className="pc-pie-name">{d.name}</span>
            <span className="pc-pie-val" style={{ color: d.fill }}>{fmt(d.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Vadim View ────────────────────────────────────────────────────────────────
function VadimView({ settings, setSetting, recurringExpenses, recurringIncomes, accounts }) {
  const [msgIdx, setMsgIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setMsgIdx(n => n + 1), 8000);
    return () => clearInterval(id);
  }, []);

  const today = new Date();
  const paycheckAmount = Number(settings['vadim_paycheck'] || 2200);

  const vadimIncome = useMemo(
    () => recurringIncomes.find(i => i.id === 'inc_vadim_paycheck'),
    [recurringIncomes]
  );
  const period         = useMemo(() => getCurrentPeriod(vadimIncome),      [vadimIncome]);
  const upcomingPaydays = useMemo(() => getUpcomingPaydays(vadimIncome, 4), [vadimIncome]);

  // Bills due in current pay period
  const bills = useMemo(
    () => period ? getBillsDueInPayPeriod(recurringExpenses, period.start) : [],
    [recurringExpenses, period]
  );
  const billsSubtotal  = bills.reduce((s, b) => s + b.amount, 0);
  const carIns         = recurringExpenses.find(e => e.id === 'rec_car_insurance');
  const carInsPerCheck = (carIns?.amount || 311.17) / 2;
  const totalBills     = billsSubtotal + carInsPerCheck;
  const afterBills     = paycheckAmount - totalBills;

  // Savings rows
  const isRoth = today < ROTH_DEADLINE;
  const is401k = today >= K401_START;
  const savingsRows = [
    { key: 'vadim_savings_cap1_monthly',       label: 'Capital One Joint Savings',          color: '#4ADE80' },
    { key: 'vadim_savings_roth_monthly',       label: 'Vadim Roth IRA 2025',                color: '#D4AF37', deadline: isRoth },
    { key: 'vadim_savings_brokerage_monthly',  label: 'Ameriprise Joint Brokerage',         color: '#38BDF8' },
    { key: 'vadim_savings_ameriprise_monthly', label: 'Ameriprise Savings (Vacation & Fun)', color: '#A78BFA' },
    ...(is401k ? [{ key: 'vadim_savings_401k_monthly', label: 'Vadim 401k', color: '#8B5CF6' }] : []),
  ];
  const savingsTotal = savingsRows.reduce((s, r) => s + (Number(settings[r.key] || 0) / 2), 0);
  const afterSavings = afterBills - savingsTotal;

  // Variable spending budgets
  const varBudgets = useMemo(
    () => (recurringExpenses || []).filter(e => e.metadata?.isBudget && e.active),
    [recurringExpenses]
  );
  const varTotal    = varBudgets.reduce((s, e) => s + e.amount / 2, 0);
  const afterVar    = afterSavings - varTotal;
  const discretionary  = paycheckAmount - totalBills - savingsTotal - varTotal;
  const overBudget     = discretionary < 0;

  // Monthly overview rows (next 2 paydays)
  const monthlyRows = useMemo(() => {
    return upcomingPaydays.slice(0, 2).map(payday => {
      const pb  = getBillsDueInPayPeriod(recurringExpenses, payday);
      const pbt = pb.reduce((s, b) => s + b.amount, 0) + carInsPerCheck;
      const disc = paycheckAmount - pbt - savingsTotal - varTotal;
      return { payday, billsTotal: pbt, savingsTotal, varTotal, discretionary: disc };
    });
  }, [upcomingPaydays, recurringExpenses, carInsPerCheck, savingsTotal, varTotal, paycheckAmount]);

  // Smart alerts
  const rothAccount  = accounts.find(a => a.id === 'roth_ira_vadim');
  const rothYtd      = rothAccount?.ytdContributions || 0;
  const rothTarget   = rothAccount?.targetGoal || 7000;
  const rothRemaining = Math.max(0, rothTarget - rothYtd);
  const rothDays     = differenceInDays(ROTH_DEADLINE, today);
  const k401Days     = differenceInDays(K401_START, today);
  const carInsDays   = differenceInDays(CAR_INS_EXPIRY, today);
  const amazonFinal  = recurringExpenses.find(e => e.id === 'rec_amazon_final');
  const amazonExpiry = amazonFinal?.metadata?.expiresDate || amazonFinal?.startDate;
  const amazonDays   = amazonExpiry ? differenceInDays(new Date(amazonExpiry), today) : null;

  const alerts = [];
  if (rothDays > 0 && rothDays <= 60) {
    alerts.push({ icon: '📈', color: '#D4AF37', text: `Roth IRA 2025 deadline in ${rothDays} days — ${fmt(rothRemaining)} left to max out` });
  }
  if (overBudget) {
    alerts.push({ icon: '⚠️', color: '#F87171', text: `This paycheck is over-allocated by ${fmt(Math.abs(discretionary))} — consider reducing savings temporarily` });
  }
  if (k401Days > 0 && k401Days <= 90) {
    alerts.push({ icon: '🏛️', color: '#A78BFA', text: `401k starts in ${k401Days} days (June 2026) — begin planning your per-paycheck contribution` });
  }
  if (amazonDays !== null && amazonDays >= 0 && amazonDays <= 30) {
    alerts.push({ icon: '🛒', color: '#60A5FA', text: `Amazon final payment $125 due in ${amazonDays} day${amazonDays !== 1 ? 's' : ''} — last one!` });
  }
  if (carInsDays > 0 && carInsDays <= 120) {
    alerts.push({ icon: '🚗', color: '#FBBF24', text: `Car insurance renewal in ${carInsDays} days (Jun 23, 2026)` });
  }

  // Pie data
  const pieData = [
    { name: 'Bills',         value: Math.max(0, totalBills),    fill: '#F87171' },
    { name: 'Savings',       value: Math.max(0, savingsTotal),  fill: '#4ADE80' },
    { name: 'Spending',      value: Math.max(0, varTotal),      fill: '#FBBF24' },
    { name: 'Discretionary', value: Math.max(0, discretionary), fill: '#D4AF37' },
  ].filter(d => d.value > 0);

  // Savings wealth message
  const annualSavings = savingsTotal * 26;

  return (
    <div className="pc-view">
      <MotivationalMessage
        messages={[
          `Vadim, your ${fmt(savingsTotal)}/paycheck in savings is building ${fmt(annualSavings)}/year in wealth.`,
          ...VADIM_MSGS,
        ]}
        msgIdx={msgIdx}
      />

      {/* Header */}
      <div className="pc-header-card">
        <div className="pc-header-row">
          <div className="pc-header-field">
            <div className="pc-header-label">Paycheck Amount</div>
            <div className="pc-header-value gold">
              <InlineEdit
                value={paycheckAmount}
                onSave={v => setSetting('vadim_paycheck', v)}
                formatFn={fmt}
                type="number"
              />
            </div>
          </div>
          {period && (
            <div className="pc-header-field">
              <div className="pc-header-label">Current Pay Period</div>
              <div className="pc-header-value">
                {format(period.start, 'MMM d')} — {format(period.end, 'MMM d, yyyy')}
              </div>
            </div>
          )}
          {period?.nextPayday && (
            <div className="pc-header-field">
              <div className="pc-header-label">Next Payday</div>
              <div className="pc-header-value blue">
                {formatPayday(format(period.nextPayday, 'yyyy-MM-dd'))}
              </div>
            </div>
          )}
          {upcomingPaydays[1] && (
            <div className="pc-header-field">
              <div className="pc-header-label">Paycheck After</div>
              <div className="pc-header-value muted">{format(upcomingPaydays[1], 'MMM d, yyyy')}</div>
            </div>
          )}
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="pc-alerts">
          {alerts.map((a, i) => (
            <div key={i} className="pc-alert" style={{ borderLeftColor: a.color }}>
              <span className="pc-alert-icon">{a.icon}</span>
              <span style={{ color: a.color }}>{a.text}</span>
            </div>
          ))}
        </div>
      )}

      <div className="pc-label-section">
        BI-WEEKLY BREAKDOWN — WHERE YOUR {fmt(paycheckAmount)} GOES
      </div>

      {/* Step 1 — Bills */}
      <StepCard
        step={1} icon="🧾" title="Bills Due This Pay Period" color="#F87171"
        subtotal={totalBills} subtotalLabel="Bills this pay period:"
        runningBalance={afterBills} runningLabel="Remaining after bills:"
      >
        {bills.map(b => (
          <div key={b.id} className="pc-bill-row">
            <span className={`pc-bill-tag ${b.isVariable ? 'variable' : b.isOneTime ? 'onetime' : 'fixed'}`}>
              {b.isVariable ? 'var' : b.isOneTime ? '1x' : 'fixed'}
            </span>
            <span className="pc-bill-name">{b.name}</span>
            <span className="pc-bill-due">{b.dueDate}</span>
            <span className="pc-bill-amount">{fmt(b.amount)}</span>
          </div>
        ))}
        <div className="pc-bill-row">
          <span className="pc-bill-tag prepaid">prepaid</span>
          <span className="pc-bill-name">Car Insurance (bi-weekly alloc.)</span>
          <span className="pc-bill-due">auto</span>
          <span className="pc-bill-amount">{fmt(carInsPerCheck)}</span>
        </div>
        {bills.length === 0 && (
          <div className="pc-empty-msg">No bills due this pay period 🎉</div>
        )}
      </StepCard>

      {/* Step 2 — Savings */}
      <StepCard
        step={2} icon="💰" title="Savings & Investments" color="#4ADE80"
        subtotal={savingsTotal} subtotalLabel="Savings this paycheck:"
        runningBalance={afterSavings} runningLabel="Remaining after savings:"
      >
        {savingsRows.map(r => (
          <div key={r.key} className="pc-savings-row">
            <span className="pc-savings-dot" style={{ background: r.color }} />
            <span className="pc-savings-name">
              {r.label}
              {r.deadline && <span className="pc-roth-warn">⚠️ Apr 15 deadline</span>}
            </span>
            <span className="pc-savings-per-check" style={{ color: r.color }}>
              {fmt(Number(settings[r.key] || 0) / 2)}
            </span>
            <span className="pc-savings-per-month">({fmt(Number(settings[r.key] || 0))}/mo)</span>
          </div>
        ))}
        <div className="pc-savings-edit-note">Edit monthly amounts in Budget Plan → Savings</div>
      </StepCard>

      {/* Step 3 — Variable Spending */}
      <StepCard
        step={3} icon="🛒" title="Variable Spending Reserve" color="#FBBF24"
        subtotal={varTotal} subtotalLabel="Spending reserve this paycheck:"
        runningBalance={afterVar} runningLabel="Remaining after reserves:"
      >
        {varBudgets.map(e => (
          <div key={e.id} className="pc-var-row">
            <span className="pc-var-name">{e.name}</span>
            <span className="pc-var-note">½ of {fmt(e.amount)}/mo</span>
            <span className="pc-var-amount">{fmt(e.amount / 2)}</span>
          </div>
        ))}
        {varBudgets.length === 0 && (
          <div className="pc-empty-msg">No spending budgets found. Add them in Budget Plan → Variable Budgets.</div>
        )}
      </StepCard>

      {/* Step 4 — Discretionary */}
      <div className="pc-step-card pc-disc-card" style={{ borderLeftColor: overBudget ? '#F87171' : '#D4AF37' }}>
        <div className="pc-step-header">
          <span className="pc-step-num" style={{ background: overBudget ? '#F87171' : '#D4AF37' }}>4</span>
          <span className="pc-step-icon">{overBudget ? '⚠️' : '✨'}</span>
          <span className="pc-step-title">Available Discretionary</span>
        </div>
        <div className="pc-disc-body">
          <div className="pc-disc-amount" style={{ color: overBudget ? '#F87171' : '#D4AF37' }}>
            {fmt(discretionary)}
          </div>
          <div className="pc-disc-pct">
            {paycheckAmount > 0
              ? `${((discretionary / paycheckAmount) * 100).toFixed(1)}% of paycheck`
              : ''}
          </div>
          {overBudget ? (
            <div className="pc-disc-warn">
              Over-allocated by {fmt(Math.abs(discretionary))} — reduce savings contributions temporarily
            </div>
          ) : (
            <div className="pc-disc-sub">Unallocated cash — yours to spend or save</div>
          )}
        </div>
      </div>

      {/* Allocation bar */}
      <AllocationBar
        paycheck={paycheckAmount}
        billsTotal={totalBills}
        savingsTotal={savingsTotal}
        varTotal={varTotal}
        discretionary={Math.max(0, discretionary)}
      />

      {/* Bottom row: pie + monthly overview */}
      <div className="pc-bottom-row">
        <PieBreakdown data={pieData} />

        <div className="pc-monthly-wrap">
          <div className="pc-section-label">MONTHLY OVERVIEW</div>
          <div className="pc-monthly-table">
            <div className="pc-monthly-head">
              <span>Payday</span>
              <span>Bills</span>
              <span>Savings</span>
              <span>Spending</span>
              <span>Left</span>
            </div>
            {monthlyRows.map((r, i) => (
              <div key={i} className="pc-monthly-row">
                <span>{format(r.payday, 'MMM d')}</span>
                <span className="pc-col-red">{fmt(r.billsTotal)}</span>
                <span className="pc-col-green">{fmt(r.savingsTotal)}</span>
                <span className="pc-col-yellow">{fmt(r.varTotal)}</span>
                <span style={{ color: r.discretionary >= 0 ? '#4ADE80' : '#F87171' }}>{fmt(r.discretionary)}</span>
              </div>
            ))}
            {monthlyRows.length >= 2 && (() => {
              const combBills = monthlyRows.reduce((s, r) => s + r.billsTotal, 0);
              const combSav   = monthlyRows.reduce((s, r) => s + r.savingsTotal, 0);
              const combVar   = monthlyRows.reduce((s, r) => s + r.varTotal, 0);
              const combDisc  = monthlyRows.reduce((s, r) => s + r.discretionary, 0);
              return (
                <div className="pc-monthly-row pc-monthly-total">
                  <span>Combined</span>
                  <span className="pc-col-red">{fmt(combBills)}</span>
                  <span className="pc-col-green">{fmt(combSav)}</span>
                  <span className="pc-col-yellow">{fmt(combVar)}</span>
                  <span style={{ color: combDisc >= 0 ? '#4ADE80' : '#F87171' }}>{fmt(combDisc)}</span>
                </div>
              );
            })()}
          </div>
          <div className="pc-monthly-note">
            Bi-weekly avg: {fmt(paycheckAmount * 26 / 12)}/mo · Annual: {fmt(paycheckAmount * 26)}/yr
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Jessica View ──────────────────────────────────────────────────────────────
function JessicaView({ settings, recurringIncomes }) {
  const [job, setJob]             = useState('combined');
  const [inputAmount, setInputAmount] = useState('');
  const [msgIdx, setMsgIdx]       = useState(0);

  useEffect(() => {
    const id = setInterval(() => setMsgIdx(n => n + 1), 8000);
    return () => clearInterval(id);
  }, []);

  const ceIncome = useMemo(() => recurringIncomes.find(i => i.id === 'inc_jessica_ce'),  [recurringIncomes]);
  const otIncome = useMemo(() => recurringIncomes.find(i => i.id === 'inc_jessica_ot'),  [recurringIncomes]);
  const cePaydays = useMemo(() => getUpcomingPaydays(ceIncome, 3), [ceIncome]);
  const otPaydays = useMemo(() => getUpcomingPaydays(otIncome, 3), [otIncome]);

  const msgs = job === 'ot' ? JESSICA_MSGS_OT : job === 'ce' ? JESSICA_MSGS_CE : JESSICA_MSGS_COMBINED;

  const estCE       = Number(settings['jessica_estimated_ce'] || settings['jessica_estimated_monthly'] || 0);
  const estOT       = Number(settings['jessica_estimated_ot'] || 0);
  const enteredAmt  = Number(inputAmount) || 0;
  const calcAmount  = enteredAmt || (job === 'ce' ? estCE : job === 'ot' ? estOT : estCE + estOT);

  const household    = Math.round(calcAmount * 0.40 * 100) / 100;
  const jointSavings = Math.round(calcAmount * 0.10 * 100) / 100;
  const rothIRA      = Math.round(calcAmount * 0.10 * 100) / 100;
  const personal     = Math.round(calcAmount * 0.40 * 100) / 100;

  const allocRows = [
    { label: '🏠 Household Contribution', pct: '40%', value: household,    color: '#60A5FA', note: 'Toward shared bills Vadim covers' },
    { label: '💰 Capital One Joint Savings', pct: '10%', value: jointSavings, color: '#4ADE80', note: 'Emergency fund & joint goals' },
    { label: '📈 Jessica Roth IRA',        pct: '10%', value: rothIRA,      color: '#D4AF37', note: 'Tax-free retirement growth' },
    { label: '👩 Personal Spending',        pct: '40%', value: personal,     color: '#F472B6', note: 'Personal care, dining, fun' },
  ];

  const pieData = calcAmount > 0
    ? allocRows.map(r => ({ name: `${r.label} (${r.pct})`, value: r.value, fill: r.color }))
    : [];

  return (
    <div className="pc-view">
      <MotivationalMessage messages={msgs} msgIdx={msgIdx} />

      {/* Job toggle */}
      <div className="pc-job-toggle">
        <button className={`pc-job-btn${job === 'combined' ? ' active' : ''}`} onClick={() => setJob('combined')}>
          🔀 Combined
        </button>
        <button className={`pc-job-btn${job === 'ce' ? ' active' : ''}`} onClick={() => setJob('ce')}>
          💼 Competitive Edge
        </button>
        <button className={`pc-job-btn${job === 'ot' ? ' active' : ''}`} onClick={() => setJob('ot')}>
          🏋️ Orange Theory
        </button>
      </div>

      {/* Header */}
      <div className="pc-header-card">
        <div className="pc-header-row">
          {(job === 'ce' || job === 'combined') && cePaydays[0] && (
            <div className="pc-header-field">
              <div className="pc-header-label">Competitive Edge Next Pay</div>
              <div className="pc-header-value blue">{formatPayday(format(cePaydays[0], 'yyyy-MM-dd'))}</div>
            </div>
          )}
          {(job === 'ot' || job === 'combined') && otPaydays[0] && (
            <div className="pc-header-field">
              <div className="pc-header-label">Orange Theory Next Pay</div>
              <div className="pc-header-value blue">{formatPayday(format(otPaydays[0], 'yyyy-MM-dd'))}</div>
            </div>
          )}
          <div className="pc-header-field">
            <div className="pc-header-label">Enter Paycheck Amount</div>
            <div className="pc-jessica-input-wrap">
              <span className="pc-dollar">$</span>
              <input
                className="pc-jessica-input"
                type="number"
                min="0"
                step="0.01"
                placeholder={calcAmount > 0 ? calcAmount.toFixed(0) : '0.00'}
                value={inputAmount}
                onChange={e => setInputAmount(e.target.value)}
              />
              {inputAmount && (
                <button className="pc-jessica-clear" onClick={() => setInputAmount('')}>×</button>
              )}
            </div>
          </div>
        </div>
        {calcAmount > 0 && (
          <div className="pc-jessica-using">
            Calculating for: <strong>{fmt(calcAmount)}</strong>
            {!enteredAmt && <span className="pc-jessica-estimated"> (estimated — enter actual to update)</span>}
          </div>
        )}
      </div>

      {calcAmount > 0 ? (
        <>
          <div className="pc-label-section">
            ALLOCATION — {job === 'combined' ? 'COMBINED' : job === 'ce' ? 'COMPETITIVE EDGE' : 'ORANGE THEORY'}
          </div>

          {/* Allocation rows */}
          {allocRows.map((r, i) => (
            <div key={i} className="pc-jessica-alloc-row" style={{ borderLeftColor: r.color }}>
              <div className="pc-jessica-alloc-left">
                <span className="pc-jessica-alloc-label" style={{ color: r.color }}>{r.label}</span>
                <span className="pc-jessica-alloc-pct">{r.pct}</span>
                <span className="pc-jessica-alloc-note">{r.note}</span>
              </div>
              <div className="pc-jessica-alloc-amount" style={{ color: r.color }}>{fmt(r.value)}</div>
            </div>
          ))}

          <div className="pc-bottom-row">
            {pieData.length > 0 && <PieBreakdown data={pieData} />}

            {/* Personal spending suggestions */}
            <div className="pc-jessica-tips">
              <div className="pc-section-label">PERSONAL SPENDING IDEAS ({fmt(personal)})</div>
              <div className="pc-tips-grid">
                {[
                  { icon: '💅', label: 'Personal Care', pct: 30 },
                  { icon: '🍽️', label: 'Dining Out',    pct: 25 },
                  { icon: '👗', label: 'Clothing',      pct: 20 },
                  { icon: '🎉', label: 'Entertainment', pct: 25 },
                ].map(t => (
                  <div key={t.label} className="pc-tip-card">
                    <span className="pc-tip-icon">{t.icon}</span>
                    <span className="pc-tip-label">{t.label}</span>
                    <span className="pc-tip-pct">{t.pct}%</span>
                    <span className="pc-tip-val">{fmt(personal * t.pct / 100)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="pc-jessica-placeholder">
          <div className="pc-placeholder-icon">💵</div>
          <div>Enter your paycheck amount above to see your full allocation breakdown</div>
          <div className="pc-placeholder-sub">Set estimated amounts in Budget Plan → Jessica's Budget</div>
        </div>
      )}
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function PaycheckPanel() {
  const [person, setPerson]     = useState('vadim');
  const [activeTab, setActiveTab] = useState('planner');

  const [settings, setSettings] = useLocalStorage('budget_settings',            DEFAULT_BUDGET_SETTINGS);
  const [recurringExpenses]     = useLocalStorage('budget_recurring_expenses',   DEFAULT_RECURRING_EXPENSES);
  const [recurringIncomes]      = useLocalStorage('budget_recurring_incomes',    DEFAULT_RECURRING_INCOMES);
  const [accounts]              = useLocalStorage('budget_accounts',             DEFAULT_ACCOUNTS);

  const setSetting = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));

  return (
    <div className="pc-panel">
      <div className="pc-panel-header">
        <div className="pc-panel-title">💸 Paycheck Planner</div>
        <div className="pc-panel-sub">Bi-weekly breakdown — every dollar has a job</div>
      </div>

      <div className="paycheck-tab-toggle">
        <button className={`tab-toggle-btn ${activeTab === 'planner' ? 'active' : ''}`} onClick={() => setActiveTab('planner')}>Planner</button>
        <button className={`tab-toggle-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>History</button>
      </div>

      {activeTab === 'history' ? <PaycheckHistoryPanel /> : <>

      <PersonToggle person={person} setPerson={setPerson} />

      {person === 'vadim' ? (
        <VadimView
          settings={settings}
          setSetting={setSetting}
          recurringExpenses={recurringExpenses}
          recurringIncomes={recurringIncomes}
          accounts={accounts}
        />
      ) : (
        <JessicaView
          settings={settings}
          recurringIncomes={recurringIncomes}
        />
      )}

      </>}
    </div>
  );
}
