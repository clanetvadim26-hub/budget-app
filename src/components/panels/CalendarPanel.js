import React, { useState, useMemo } from 'react';
import { useConfirm } from '../ConfirmModal';
import {
  format, addDays, addWeeks, addMonths, addYears,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear,
  eachDayOfInterval, isSameMonth, isToday, getDate, getYear,
  getDaysInMonth,
} from 'date-fns';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { DEFAULT_ACCOUNTS } from '../../data/accounts';
import { buildEventMap, getEventColor, getDayNet } from '../../utils/calendarEvents';
import { filterByMonth, getTotalIncome, getTotalExpenses } from '../../utils/calculations';
import { formatCurrency } from '../../utils/calculations';

// ── Event Pill ─────────────────────────────────────────────────────────────
function EventPill({ event, compact }) {
  const color = getEventColor(event);
  return (
    <div
      className={`event-pill ${compact ? 'compact' : ''}`}
      style={{ backgroundColor: color + '28', color, borderColor: color + '55' }}
      title={`${event.label}: ${formatCurrency(event.amount)}`}
    >
      <span className="pill-dot" style={{ backgroundColor: color }} />
      <span className="pill-text">{compact ? event.shortLabel : event.label}</span>
      {!compact && <span className="pill-amt">${Math.round(event.amount).toLocaleString()}</span>}
    </div>
  );
}

// ── Day Cell ───────────────────────────────────────────────────────────────
function DayCell({ day, events = [], isCurrentMonth = true, onClick, compact = false }) {
  const net = getDayNet(events);
  const today = isToday(day);
  const MAX = compact ? 2 : 3;

  return (
    <div
      className={`day-cell ${!isCurrentMonth ? 'other-month' : ''} ${today ? 'today' : ''} ${events.length ? 'has-events' : ''}`}
      onClick={() => onClick(day)}
    >
      <div className="day-num-row">
        <span className={`day-num ${today ? 'today-badge' : ''}`}>{getDate(day)}</span>
        {compact && events.length > 0 && (
          <span className="day-event-count">{events.length}</span>
        )}
      </div>
      {!compact && (
        <div className="day-pills">
          {events.slice(0, MAX).map((e, i) => <EventPill key={i} event={e} compact />)}
          {events.length > MAX && <div className="more-pills">+{events.length - MAX}</div>}
        </div>
      )}
      {events.length > 0 && (
        <div className={`day-net-flow ${net > 0 ? 'positive' : net < 0 ? 'negative' : ''}`}>
          {net !== 0 && (net > 0 ? '+' : '') + formatCurrency(Math.abs(net))}
        </div>
      )}
    </div>
  );
}

// ── Day Modal ──────────────────────────────────────────────────────────────
function DayModal({ day, events, onClose, onMarkCCPaid, paidCCPayments, onDeleteExpense, onDeleteIncome, confirm }) {
  const income  = events.filter((e) => e.isIncome).reduce((s, e) => s + e.amount, 0);
  const expAmt  = events.filter((e) => e.isExpense).reduce((s, e) => s + e.amount, 0);
  const net     = income - expAmt;

  const groups = {
    income:   events.filter((e) => e.type === 'paycheck' || e.type === 'income'),
    bills:    events.filter((e) => e.type === 'bill'),
    cc:       events.filter((e) => e.type === 'credit-payment'),
    loans:    events.filter((e) => e.type === 'loan-payment'),
    expenses: events.filter((e) => e.type === 'expense'),
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="day-modal" onClick={(e) => e.stopPropagation()}>
        <div className="day-modal-header">
          <div>
            <div className="day-modal-weekday">{format(day, 'EEEE')}</div>
            <div className="day-modal-date">{format(day, 'MMMM d, yyyy')}</div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="day-modal-summary">
          <div className="dms-item"><div className="dms-label">Income</div><div className="dms-val positive">{formatCurrency(income)}</div></div>
          <div className="dms-item"><div className="dms-label">Expenses</div><div className="dms-val negative">{formatCurrency(expAmt)}</div></div>
          <div className="dms-item"><div className="dms-label">Net</div><div className={`dms-val ${net >= 0 ? 'positive' : 'negative'}`}>{formatCurrency(net)}</div></div>
        </div>

        {[
          { title: '💰 Income', items: groups.income },
          { title: '🏠 Bills Due', items: groups.bills },
          { title: '💳 CC Payments Due', items: groups.cc },
          { title: '💸 Expenses', items: groups.expenses },
        ].map(({ title, items }) =>
          items.length > 0 && (
            <div key={title} className="day-modal-group">
              <div className="dmg-title">{title}</div>
              {items.map((e, i) => (
                <div key={i} className="dmg-row">
                  <span className="dmg-dot" style={{ backgroundColor: getEventColor(e) }} />
                  <span className="dmg-label">{e.label}</span>
                  <span className={`dmg-amount ${e.isIncome ? 'positive' : 'negative'}`}>
                    {e.isIncome ? '+' : '-'}{formatCurrency(e.amount)}
                  </span>
                  <span className="dmg-status" style={{ color: e.status === 'paid' || e.status === 'confirmed' ? '#4ADE80' : e.status === 'pending' ? '#FACC15' : '#94A3B8' }}>
                    {e.status}
                  </span>
                  {e.type === 'credit-payment' && e.status !== 'paid' && (
                    <button className="btn-mark-paid-sm" onClick={() => onMarkCCPaid(e.id)}>✓ Paid</button>
                  )}
                  {e.type === 'expense' && onDeleteExpense && (
                    <button className="cal-event-delete" title="Delete" onClick={async () => {
                      const ok = await confirm?.(e.label || 'this expense');
                      if (ok) onDeleteExpense(e.id);
                    }}>🗑️</button>
                  )}
                  {e.type === 'income' && onDeleteIncome && (
                    <button className="cal-event-delete" title="Delete" onClick={async () => {
                      const ok = await confirm?.(e.label || 'this income');
                      if (ok) onDeleteIncome(e.id);
                    }}>🗑️</button>
                  )}
                </div>
              ))}
            </div>
          )
        )}

        {groups.loans.length > 0 && (
          <div className="day-modal-group">
            <div className="dmg-title">🏦 Loan Payments Due</div>
            {groups.loans.map((e, i) => (
              <div key={i} className="dmg-row dmg-row-loan">
                <span className="dmg-dot" style={{ backgroundColor: '#60A5FA' }} />
                <div className="dmg-loan-info">
                  <span className="dmg-label">{e.label}</span>
                  <span className="dmg-loan-breakdown">
                    Principal: <span className="positive">{formatCurrency(e.loanPrincipal)}</span>
                    &nbsp;·&nbsp;
                    Interest: <span className="negative">{formatCurrency(e.loanInterest)}</span>
                  </span>
                </div>
                <span className="dmg-amount negative">-{formatCurrency(e.amount)}</span>
              </div>
            ))}
          </div>
        )}

        {events.length === 0 && <div className="empty-state">No events for this day.</div>}
      </div>
    </div>
  );
}

// ── Week View ──────────────────────────────────────────────────────────────
function WeekView({ weekStart, eventMap, onDayClick }) {
  const days = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
  const weekIncome   = days.reduce((s, d) => s + (eventMap[format(d, 'yyyy-MM-dd')] || []).filter((e) => e.isIncome).reduce((a, e) => a + e.amount, 0), 0);
  const weekExpenses = days.reduce((s, d) => s + (eventMap[format(d, 'yyyy-MM-dd')] || []).filter((e) => e.isExpense).reduce((a, e) => a + e.amount, 0), 0);

  return (
    <div>
      <div className="week-day-labels">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d} className="week-day-label">{d}</div>
        ))}
      </div>
      <div className="week-grid">
        {days.map((day) => (
          <DayCell
            key={format(day, 'yyyy-MM-dd')}
            day={day}
            events={eventMap[format(day, 'yyyy-MM-dd')] || []}
            onClick={onDayClick}
          />
        ))}
      </div>
      <div className="week-summary">
        <span className="positive">Income: {formatCurrency(weekIncome)}</span>
        <span className="negative">Expenses: {formatCurrency(weekExpenses)}</span>
        <span className={weekIncome - weekExpenses >= 0 ? 'positive' : 'negative'}>
          Net: {formatCurrency(weekIncome - weekExpenses)}
        </span>
      </div>
    </div>
  );
}

// ── Month View ─────────────────────────────────────────────────────────────
function MonthView({ currentDate, eventMap, onDayClick, incomes, expenses }) {
  const mStart = startOfMonth(currentDate);
  const mEnd   = endOfMonth(currentDate);
  const gStart = startOfWeek(mStart, { weekStartsOn: 1 });
  const gEnd   = endOfWeek(mEnd,   { weekStartsOn: 1 });
  const days   = eachDayOfInterval({ start: gStart, end: gEnd });

  const monthInc = getTotalIncome(filterByMonth(incomes, currentDate));
  const monthExp = getTotalExpenses(filterByMonth(expenses, currentDate));
  const monthNet = monthInc - monthExp;
  const savingsRate = monthInc > 0 ? ((monthNet / monthInc) * 100).toFixed(1) : '0.0';

  return (
    <div>
      <div className="month-summary-bar">
        <span className="positive">Income: {formatCurrency(monthInc)}</span>
        <span className="negative">Expenses: {formatCurrency(monthExp)}</span>
        <span className={monthNet >= 0 ? 'positive' : 'negative'}>Net: {formatCurrency(monthNet)}</span>
        <span style={{ color: '#D4AF37' }}>Savings: {savingsRate}%</span>
      </div>
      <div className="week-day-labels">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d} className="week-day-label">{d}</div>
        ))}
      </div>
      <div className="month-grid">
        {days.map((day) => (
          <DayCell
            key={format(day, 'yyyy-MM-dd')}
            day={day}
            events={eventMap[format(day, 'yyyy-MM-dd')] || []}
            isCurrentMonth={isSameMonth(day, currentDate)}
            onClick={onDayClick}
            compact
          />
        ))}
      </div>
    </div>
  );
}

// ── Year View ──────────────────────────────────────────────────────────────
function YearView({ currentDate, incomes, expenses, onMonthClick }) {
  const year = getYear(currentDate);
  const monthlyData = useMemo(() => {
    return Array.from({ length: 12 }, (_, m) => {
      const d = new Date(year, m, 1);
      const inc = getTotalIncome(filterByMonth(incomes, d));
      const exp = getTotalExpenses(filterByMonth(expenses, d));
      return { month: format(d, 'MMM'), fullDate: d, income: inc, expenses: exp, net: inc - exp };
    });
  }, [year, incomes, expenses]);

  const totalInc = monthlyData.reduce((s, d) => s + d.income, 0);
  const totalExp = monthlyData.reduce((s, d) => s + d.expenses, 0);
  const avgSavings = monthlyData.reduce((s, d) => s + d.net, 0) / 12;
  const best  = monthlyData.reduce((b, d) => d.net > b.net ? d : b, monthlyData[0]);
  const worst = monthlyData.reduce((w, d) => d.net < w.net ? d : w, monthlyData[0]);

  const YearTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
      return (
        <div className="chart-tooltip">
          <div className="tooltip-label">{label} {year}</div>
          {payload.map((p) => <div key={p.name} style={{ color: p.color }}>{p.name}: {formatCurrency(p.value)}</div>)}
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <div className="year-summary-cards">
        <div className="year-stat"><div className="year-stat-label">Total Income</div><div className="year-stat-val positive">{formatCurrency(totalInc)}</div></div>
        <div className="year-stat"><div className="year-stat-label">Total Expenses</div><div className="year-stat-val negative">{formatCurrency(totalExp)}</div></div>
        <div className="year-stat"><div className="year-stat-label">Avg Monthly Savings</div><div className={`year-stat-val ${avgSavings >= 0 ? 'positive' : 'negative'}`}>{formatCurrency(avgSavings)}</div></div>
        <div className="year-stat"><div className="year-stat-label">Best Month</div><div className="year-stat-val positive">{best?.month} ({formatCurrency(best?.net)})</div></div>
        <div className="year-stat"><div className="year-stat-label">Worst Month</div><div className="year-stat-val negative">{worst?.month} ({formatCurrency(worst?.net)})</div></div>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={monthlyData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
          onClick={(d) => { if (d?.activePayload?.[0]?.payload) onMonthClick(d.activePayload[0].payload.fullDate); }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
          <XAxis dataKey="month" tick={{ fill: '#94A3B8', fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fill: '#94A3B8', fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip content={<YearTooltip />} />
          <Legend formatter={(v) => <span style={{ color: '#CBD5E1', fontSize: 12 }}>{v}</span>} />
          <Bar dataKey="income"   name="Income"   fill="#D4AF37" opacity={0.85} radius={[3, 3, 0, 0]} style={{ cursor: 'pointer' }} />
          <Bar dataKey="expenses" name="Expenses" fill="#F87171" opacity={0.85} radius={[3, 3, 0, 0]} style={{ cursor: 'pointer' }} />
          <Line type="monotone" dataKey="net" name="Net" stroke="#4ADE80" strokeWidth={2.5} dot={{ r: 4, fill: '#4ADE80' }} activeDot={{ r: 6 }} />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="year-click-hint">Click a month bar to view that month's calendar</div>
    </div>
  );
}

// ── Day View ───────────────────────────────────────────────────────────────
function DayView({ day, events, onMarkCCPaid }) {
  const income  = events.filter((e) => e.isIncome).reduce((s, e) => s + e.amount, 0);
  const expAmt  = events.filter((e) => e.isExpense).reduce((s, e) => s + e.amount, 0);
  const net = income - expAmt;

  return (
    <div>
      <div className="day-view-summary">
        <div className="dms-item"><div className="dms-label">Income</div><div className="dms-val positive">{formatCurrency(income)}</div></div>
        <div className="dms-item"><div className="dms-label">Expenses</div><div className="dms-val negative">{formatCurrency(expAmt)}</div></div>
        <div className="dms-item"><div className="dms-label">Net</div><div className={`dms-val ${net >= 0 ? 'positive' : 'negative'}`}>{formatCurrency(net)}</div></div>
      </div>
      {events.length === 0 ? (
        <div className="empty-state">No events for {format(day, 'MMMM d, yyyy')}.</div>
      ) : (
        <div className="day-view-events">
          {events.map((e, i) => (
            <div key={i} className="dmg-row">
              <span className="dmg-dot" style={{ backgroundColor: getEventColor(e) }} />
              <span className="dmg-label">{e.label}</span>
              <span className={`dmg-amount ${e.isIncome ? 'positive' : 'negative'}`}>
                {e.isIncome ? '+' : '-'}{formatCurrency(e.amount)}
              </span>
              <span className="dmg-status" style={{ color: e.status === 'paid' || e.status === 'confirmed' ? '#4ADE80' : '#94A3B8' }}>
                {e.status}
              </span>
              {e.type === 'credit-payment' && e.status !== 'paid' && (
                <button className="btn-mark-paid-sm" onClick={() => onMarkCCPaid(e.id)}>✓ Paid</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Budget Tracker ─────────────────────────────────────────────────────────
function BudgetTracker({ expenses, recurringExpenses }) {
  const now = new Date();
  const mStart = startOfMonth(now);
  const mEnd   = endOfMonth(now);
  const todayNum = now.getDate();
  const totalDays = getDaysInMonth(now);
  const daysLeft = totalDays - todayNum + 1; // including today

  // Budget categories: recurringExpenses where isBudget === true
  const budgets = useMemo(
    () => (recurringExpenses || []).filter(e => e.metadata?.isBudget && e.active),
    [recurringExpenses]
  );

  // Normalize budget name → category ID (e.g., "Dining Out" → "dining_out")
  const normalizeName = (name) =>
    (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

  // Expenses this month
  const monthExpenses = useMemo(
    () => expenses.filter(e => {
      const d = new Date(e.date);
      return d >= mStart && d <= mEnd;
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [expenses]
  );

  // Weeks of current month (Mon-Sun)
  const weeks = useMemo(() => {
    const result = [];
    let cursor = startOfWeek(mStart, { weekStartsOn: 1 });
    while (cursor <= mEnd) {
      const wEnd = endOfWeek(cursor, { weekStartsOn: 1 });
      result.push({ start: new Date(cursor), end: new Date(wEnd < mEnd ? wEnd : mEnd) });
      cursor = addDays(wEnd, 1);
    }
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [expandedCat, setExpandedCat] = useState(null);

  if (budgets.length === 0) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: '#64748B' }}>
        No budget categories found. Add variable budgets in the Budget Plan → Vadim tab.
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 12, color: '#64748B', marginBottom: 16 }}>
        Showing spending vs. budget for <strong style={{ color: '#94A3B8' }}>{format(now, 'MMMM yyyy')}</strong> · {daysLeft} days remaining
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {budgets.map(budget => {
          const catId   = normalizeName(budget.name);
          const monthly = Number(budget.amount) || 0;
          const spent   = monthExpenses
            .filter(e => e.category === catId || normalizeName(e.category) === catId)
            .reduce((s, e) => s + Number(e.amount), 0);
          const remaining   = monthly - spent;
          const pct         = monthly > 0 ? Math.min((spent / monthly) * 100, 100) : 0;
          const dailyAllow  = daysLeft > 0 ? Math.max(0, remaining) / daysLeft : 0;
          const overBudget  = spent > monthly;
          const barColor    = pct < 50 ? '#4ADE80' : pct < 75 ? '#FBBF24' : '#F87171';
          const isExpanded  = expandedCat === budget.id;

          // Weekly spending
          const weeklyData = weeks.map((w, i) => {
            const wSpent = monthExpenses
              .filter(e => {
                const d = new Date(e.date);
                return (e.category === catId || normalizeName(e.category) === catId) && d >= w.start && d <= w.end;
              })
              .reduce((s, e) => s + Number(e.amount), 0);
            const isCurrentWeek = now >= w.start && now <= w.end;
            return { label: `Wk ${i + 1} (${format(w.start, 'M/d')}–${format(w.end, 'M/d')})`, spent: wSpent, isCurrent: isCurrentWeek };
          });

          return (
            <div key={budget.id} style={{ background: '#0F1829', border: '1px solid #1E293B', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#F1F5F9' }}>{budget.name}</span>
                <button
                  type="button"
                  onClick={() => setExpandedCat(isExpanded ? null : budget.id)}
                  style={{ background: 'transparent', border: 'none', color: '#64748B', fontSize: 11, cursor: 'pointer', padding: '2px 6px' }}
                >
                  {isExpanded ? '▲ Hide weeks' : '▼ Weekly'}
                </button>
              </div>

              {/* Progress bar */}
              <div style={{ background: '#1E293B', borderRadius: 4, height: 6, marginBottom: 8, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, background: barColor, height: '100%', borderRadius: 4, transition: 'width 0.3s' }} />
              </div>

              {/* Stats row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', marginBottom: 2 }}>Budget</div>
                  <div style={{ fontSize: 13, color: '#94A3B8' }}>${monthly.toFixed(0)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', marginBottom: 2 }}>Spent</div>
                  <div style={{ fontSize: 13, color: overBudget ? '#F87171' : '#F1F5F9', fontWeight: overBudget ? 700 : 400 }}>${spent.toFixed(0)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', marginBottom: 2 }}>Remaining</div>
                  <div style={{ fontSize: 13, color: overBudget ? '#F87171' : '#4ADE80', fontWeight: 600 }}>
                    {overBudget ? `-$${Math.abs(remaining).toFixed(0)}` : `$${remaining.toFixed(0)}`}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', marginBottom: 2 }}>Daily Left</div>
                  <div style={{ fontSize: 13, color: '#94A3B8' }}>${dailyAllow.toFixed(0)}/day</div>
                </div>
              </div>

              {/* Weekly breakdown */}
              {isExpanded && (
                <div style={{ marginTop: 12, borderTop: '1px solid #1E293B', paddingTop: 10 }}>
                  <div style={{ fontSize: 11, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Weekly Breakdown</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {weeklyData.map(w => (
                      <div key={w.label} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '5px 8px', borderRadius: 6,
                        background: w.isCurrent ? 'rgba(212,175,55,0.08)' : 'transparent',
                        border: w.isCurrent ? '1px solid rgba(212,175,55,0.2)' : '1px solid transparent',
                      }}>
                        <span style={{ fontSize: 12, color: w.isCurrent ? '#D4AF37' : '#64748B' }}>
                          {w.label}{w.isCurrent ? ' ← current' : ''}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: w.spent > 0 ? '#F1F5F9' : '#334155' }}>
                          {w.spent > 0 ? `$${w.spent.toFixed(0)}` : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Calendar ──────────────────────────────────────────────────────────
export default function CalendarPanel() {
  const [pageTab, setPageTab]         = useState('calendar'); // 'calendar' | 'budget'
  const [view, setView]               = useState('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  const [expenses, setExpenses] = useLocalStorage('budget_expenses', []);
  const [incomes,  setIncomes]  = useLocalStorage('budget_incomes',  []);
  const confirm = useConfirm();
  const [recurringIncomes]  = useLocalStorage('budget_recurring_incomes',    []);
  const [recurringExpenses] = useLocalStorage('budget_recurring_expenses',   []);
  const [confirmedPaychecks]= useLocalStorage('budget_confirmed_paychecks',  {});
  const [paidExpenseKeys]   = useLocalStorage('budget_paid_recurring_expenses', {});
  const [accounts]          = useLocalStorage('budget_accounts',             DEFAULT_ACCOUNTS);
  const [paidCCPayments, setPaidCCPayments] = useLocalStorage('budget_paid_cc_payments', {});
  const [loans]                             = useLocalStorage('budget_loans', []);

  const { rangeStart, rangeEnd } = useMemo(() => {
    switch (view) {
      case 'week':  return { rangeStart: startOfWeek(currentDate, { weekStartsOn: 1 }), rangeEnd: endOfWeek(currentDate, { weekStartsOn: 1 }) };
      case 'month': return { rangeStart: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }), rangeEnd: endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }) };
      case 'year':  return { rangeStart: startOfYear(currentDate), rangeEnd: endOfYear(currentDate) };
      case 'day':   return { rangeStart: currentDate, rangeEnd: currentDate };
      default:      return { rangeStart: new Date(), rangeEnd: new Date() };
    }
  }, [view, currentDate]);

  const eventMap = useMemo(() => buildEventMap(rangeStart, rangeEnd, {
    recurringIncomes, recurringExpenses, accounts, expenses, incomes,
    confirmedPaychecks, paidExpenseKeys, paidCCPayments, loans,
  }), [rangeStart, rangeEnd, recurringIncomes, recurringExpenses, accounts, expenses, incomes, confirmedPaychecks, paidExpenseKeys, paidCCPayments, loans]);

  const navigate = (dir) => {
    setCurrentDate((d) => {
      switch (view) {
        case 'day':   return addDays(d, dir);
        case 'week':  return addWeeks(d, dir);
        case 'month': return addMonths(d, dir);
        case 'year':  return addYears(d, dir);
        default:      return d;
      }
    });
  };

  const headerLabel = useMemo(() => {
    switch (view) {
      case 'day':   return format(currentDate, 'EEEE, MMMM d, yyyy');
      case 'week': {
        const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
        const we = endOfWeek(currentDate, { weekStartsOn: 1 });
        return `${format(ws, 'MMM d')} – ${format(we, 'MMM d, yyyy')}`;
      }
      case 'month': return format(currentDate, 'MMMM yyyy');
      case 'year':  return String(getYear(currentDate));
      default:      return '';
    }
  }, [view, currentDate]);

  const handleDayClick = (day) => {
    if (view === 'day') { setCurrentDate(day); return; }
    setSelectedDay(day);
  };

  const markCCPaid = (paymentId) => {
    setPaidCCPayments((prev) => ({ ...prev, [paymentId]: true }));
    setSelectedDay(null);
  };

  const dayEvents = selectedDay ? (eventMap[format(selectedDay, 'yyyy-MM-dd')] || []) : [];
  const currentDayEvents = view === 'day' ? (eventMap[format(currentDate, 'yyyy-MM-dd')] || []) : [];

  return (
    <div className="panel calendar-panel">
      {/* Page-level tab toggle */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #1E293B', marginBottom: 20 }}>
        {[
          { id: 'calendar', label: '📅 Calendar'       },
          { id: 'budget',   label: '📊 Budget Tracker' },
        ].map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setPageTab(t.id)}
            style={{
              padding: '10px 18px', background: 'transparent', border: 'none',
              borderBottom: `2px solid ${pageTab === t.id ? '#D4AF37' : 'transparent'}`,
              color: pageTab === t.id ? '#D4AF37' : '#64748B',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: -1, transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {pageTab === 'budget' && (
        <BudgetTracker expenses={expenses} recurringExpenses={recurringExpenses} />
      )}

      {pageTab === 'calendar' && <>
      <div className="cal-toolbar">
        <div className="cal-nav">
          <button className="cal-nav-btn" onClick={() => navigate(-1)}>‹</button>
          <button className="cal-today-btn" onClick={() => setCurrentDate(new Date())}>Today</button>
          <button className="cal-nav-btn" onClick={() => navigate(1)}>›</button>
        </div>
        <div className="cal-title">{headerLabel}</div>
        <div className="cal-view-toggle">
          {['day', 'week', 'month', 'year'].map((v) => (
            <button key={v} className={`cal-view-btn ${view === v ? 'active' : ''}`} onClick={() => setView(v)}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="cal-legend">
        <span className="legend-item" style={{ color: '#D4AF37' }}>● Income/Paycheck</span>
        <span className="legend-item" style={{ color: '#F87171' }}>● Bills (unpaid)</span>
        <span className="legend-item" style={{ color: '#FB923C' }}>● CC Payment</span>
        <span className="legend-item" style={{ color: '#FB7185' }}>● Expense</span>
        <span className="legend-item" style={{ color: '#4ADE80' }}>● Paid</span>
      </div>

      <div className="cal-body">
        {view === 'week' && (
          <WeekView
            weekStart={startOfWeek(currentDate, { weekStartsOn: 1 })}
            eventMap={eventMap}
            onDayClick={handleDayClick}
          />
        )}
        {view === 'month' && (
          <MonthView
            currentDate={currentDate}
            eventMap={eventMap}
            onDayClick={handleDayClick}
            incomes={incomes}
            expenses={expenses}
          />
        )}
        {view === 'year' && (
          <YearView
            currentDate={currentDate}
            incomes={incomes}
            expenses={expenses}
            onMonthClick={(d) => { setCurrentDate(d); setView('month'); }}
          />
        )}
        {view === 'day' && (
          <div className="day-view-wrap">
            <div className="day-view-date">{format(currentDate, 'EEEE, MMMM d, yyyy')}</div>
            <DayView day={currentDate} events={currentDayEvents} onMarkCCPaid={markCCPaid} />
          </div>
        )}
      </div>

      {selectedDay && (
        <DayModal
          day={selectedDay}
          events={dayEvents}
          onClose={() => setSelectedDay(null)}
          onMarkCCPaid={markCCPaid}
          paidCCPayments={paidCCPayments}
          onDeleteExpense={(id) => setExpenses((prev) => prev.filter((e) => e.id !== id))}
          onDeleteIncome={(id)  => setIncomes((prev)  => prev.filter((i) => i.id !== id))}
          confirm={confirm}
        />
      )}
      </>}
    </div>
  );
}
