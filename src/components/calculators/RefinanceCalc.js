import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';

const s = {
  wrap: { padding: '24px', color: '#F1F5F9', fontFamily: 'Inter, sans-serif' },
  h1: { fontSize: '22px', fontWeight: '700', color: '#F1F5F9', margin: '0 0 4px' },
  sub: { fontSize: '14px', color: '#64748B', margin: '0 0 24px' },
  card: { background: '#131d35', border: '1px solid #1E293B', borderRadius: '14px', padding: '20px', marginBottom: '20px' },
  secTitle: { fontSize: '15px', fontWeight: '600', color: '#CBD5E1', marginBottom: '14px' },
  grid: { display: 'flex', flexWrap: 'wrap', gap: '14px' },
  group: { display: 'flex', flexDirection: 'column', gap: '6px', flex: '1 1 170px' },
  label: { fontSize: '13px', color: '#94A3B8' },
  input: { background: '#0A1020', border: '1px solid #1E293B', color: '#F1F5F9', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' },
  btnRow: { display: 'flex', gap: '10px', marginTop: '18px', flexWrap: 'wrap' },
  calcBtn: { background: '#D4AF37', color: '#0A0F1E', border: 'none', borderRadius: '8px', padding: '10px 24px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' },
  resetBtn: { background: '#1E293B', color: '#CBD5E1', border: '1px solid #334155', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  statsGrid: { display: 'flex', flexWrap: 'wrap', gap: '14px' },
  statCard: { background: '#0D1426', border: '1px solid #1E293B', borderRadius: '12px', padding: '16px 20px', flex: '1 1 150px' },
  statLabel: { fontSize: '12px', color: '#64748B', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' },
  statVal: { fontSize: '20px', fontWeight: '700', color: '#D4AF37' },
  divider: { height: '1px', background: '#1E293B', margin: '16px 0' },
};

const fmt = (n) => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const DEFAULTS = {
  currentBalance: '',
  currentRate: '',
  currentPayment: '',
  newRate: '',
  newTerm: '',
  closingCosts: '',
  stayYears: '',
};

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: '#0D1426', border: '1px solid #1E293B', borderRadius: '8px', padding: '10px 14px' }}>
      <p style={{ color: '#94A3B8', fontSize: '12px', margin: '0 0 4px' }}>Month {label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color, fontSize: '13px', fontWeight: '600', margin: '2px 0' }}>
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  );
};

export default function RefinanceCalc() {
  const [form, setForm] = useState(DEFAULTS);
  const [results, setResults] = useState(null);

  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const calculate = () => {
    const balance = parseFloat(form.currentBalance) || 0;
    // eslint-disable-next-line no-unused-vars
    const currentRate = (parseFloat(form.currentRate) || 0) / 100 / 12;
    const currentPayment = parseFloat(form.currentPayment) || 0;
    const newRate = (parseFloat(form.newRate) || 0) / 100 / 12;
    const newTermMonths = parseInt(form.newTerm) || 0;
    const closingCosts = parseFloat(form.closingCosts) || 0;
    const stayMonths = (parseFloat(form.stayYears) || 0) * 12;

    if (!newTermMonths) return;

    // New monthly payment
    const newPayment = newRate === 0
      ? balance / newTermMonths
      : (balance * newRate * Math.pow(1 + newRate, newTermMonths)) / (Math.pow(1 + newRate, newTermMonths) - 1);

    const monthlySavings = currentPayment - newPayment;

    // Break-even: cumulative savings crosses closing costs
    let breakEvenMonth = null;
    const chartData = [];
    const maxMonths = Math.max(newTermMonths, stayMonths > 0 ? stayMonths + 12 : 60, 60);

    for (let m = 1; m <= Math.min(maxMonths, 360); m++) {
      const cumulativeSavings = monthlySavings * m;
      const netSavings = cumulativeSavings - closingCosts;
      if (breakEvenMonth === null && netSavings >= 0) {
        breakEvenMonth = m;
      }
      chartData.push({ month: m, cumulativeSavings, closingCosts, netSavings });
    }

    const netSavingsAtStay = stayMonths > 0 ? monthlySavings * stayMonths - closingCosts : null;
    const totalSavingsAfterBreakEven = breakEvenMonth
      ? monthlySavings * (newTermMonths - breakEvenMonth) - closingCosts
      : null;

    setResults({
      newPayment,
      monthlySavings,
      breakEvenMonth,
      totalSavingsAfterBreakEven,
      netSavingsAtStay,
      stayMonths,
      chartData: chartData.slice(0, Math.min(maxMonths, 120)),
      closingCosts,
    });
  };

  const reset = () => { setForm(DEFAULTS); setResults(null); };

  return (
    <div style={s.wrap}>
      <div style={s.h1}>Refinance Calculator</div>
      <div style={s.sub}>Find your break-even point and total savings from refinancing</div>

      <div style={s.card}>
        <div style={s.secTitle}>Current Loan</div>
        <div style={s.grid}>
          <div style={s.group}>
            <label style={s.label}>Current Balance ($)</label>
            <input style={s.input} name="currentBalance" value={form.currentBalance} onChange={set} placeholder="250000" type="number" min="0" />
          </div>
          <div style={s.group}>
            <label style={s.label}>Current Rate (%)</label>
            <input style={s.input} name="currentRate" value={form.currentRate} onChange={set} placeholder="7.5" type="number" min="0" step="0.01" />
          </div>
          <div style={s.group}>
            <label style={s.label}>Current Monthly Payment ($)</label>
            <input style={s.input} name="currentPayment" value={form.currentPayment} onChange={set} placeholder="1748" type="number" min="0" />
          </div>
        </div>

        <div style={s.divider} />
        <div style={s.secTitle}>New Loan</div>
        <div style={s.grid}>
          <div style={s.group}>
            <label style={s.label}>New Rate (%)</label>
            <input style={s.input} name="newRate" value={form.newRate} onChange={set} placeholder="6.0" type="number" min="0" step="0.01" />
          </div>
          <div style={s.group}>
            <label style={s.label}>New Term (months)</label>
            <input style={s.input} name="newTerm" value={form.newTerm} onChange={set} placeholder="360" type="number" min="1" />
          </div>
          <div style={s.group}>
            <label style={s.label}>Closing Costs ($)</label>
            <input style={s.input} name="closingCosts" value={form.closingCosts} onChange={set} placeholder="4500" type="number" min="0" />
          </div>
          <div style={s.group}>
            <label style={s.label}>Years Planning to Stay</label>
            <input style={s.input} name="stayYears" value={form.stayYears} onChange={set} placeholder="5" type="number" min="0" step="0.5" />
          </div>
        </div>

        <div style={s.btnRow}>
          <button style={s.calcBtn} onClick={calculate}>Calculate</button>
          <button style={s.resetBtn} onClick={reset}>Reset</button>
        </div>
      </div>

      {results && (
        <>
          <div style={s.card}>
            <div style={s.secTitle}>Results</div>
            <div style={s.statsGrid}>
              <div style={s.statCard}>
                <div style={s.statLabel}>New Monthly Payment</div>
                <div style={s.statVal}>{fmt(results.newPayment)}</div>
              </div>
              <div style={s.statCard}>
                <div style={s.statLabel}>Monthly Savings</div>
                <div style={{ ...s.statVal, color: results.monthlySavings >= 0 ? '#4ADE80' : '#F87171' }}>
                  {results.monthlySavings >= 0 ? '' : '-'}{fmt(Math.abs(results.monthlySavings))}
                </div>
              </div>
              <div style={s.statCard}>
                <div style={s.statLabel}>Break-even Point</div>
                <div style={{ ...s.statVal, color: '#60A5FA' }}>
                  {results.breakEvenMonth ? results.breakEvenMonth + ' mo' : 'Never'}
                </div>
              </div>
              {results.totalSavingsAfterBreakEven !== null && (
                <div style={s.statCard}>
                  <div style={s.statLabel}>Net Savings (full term)</div>
                  <div style={{ ...s.statVal, color: results.totalSavingsAfterBreakEven >= 0 ? '#4ADE80' : '#F87171' }}>
                    {fmt(results.totalSavingsAfterBreakEven)}
                  </div>
                </div>
              )}
              {results.netSavingsAtStay !== null && results.stayMonths > 0 && (
                <div style={{ ...s.statCard, border: '1px solid #D4AF37' }}>
                  <div style={s.statLabel}>Net Savings if You Stay ({Math.round(results.stayMonths / 12)}yr)</div>
                  <div style={{ ...s.statVal, color: results.netSavingsAtStay >= 0 ? '#D4AF37' : '#F87171' }}>
                    {fmt(results.netSavingsAtStay)}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={s.card}>
            <div style={s.secTitle}>Cumulative Savings vs Closing Costs</div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={results.chartData} margin={{ top: 8, right: 20, left: 10, bottom: 20 }}>
                <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" />
                <XAxis dataKey="month" stroke="#334155" tick={{ fill: '#64748B', fontSize: 11 }} label={{ value: 'Month', position: 'insideBottom', offset: -10, fill: '#64748B', fontSize: 12 }} />
                <YAxis stroke="#334155" tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={(v) => '$' + (v / 1000).toFixed(0) + 'k'} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ color: '#94A3B8', fontSize: '13px', paddingTop: '8px' }} />
                {results.breakEvenMonth && (
                  <ReferenceLine x={results.breakEvenMonth} stroke="#D4AF37" strokeDasharray="4 4" label={{ value: 'Break-even', position: 'top', fill: '#D4AF37', fontSize: 11 }} />
                )}
                <Line type="monotone" dataKey="cumulativeSavings" stroke="#4ADE80" strokeWidth={2} dot={false} name="Cumulative Savings" />
                <Line type="monotone" dataKey="closingCosts" stroke="#F87171" strokeWidth={2} dot={false} name="Closing Costs" strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
