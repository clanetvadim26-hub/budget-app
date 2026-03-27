import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const s = {
  wrap: { padding: '24px', color: '#F1F5F9', fontFamily: 'Inter, sans-serif' },
  h1: { fontSize: '22px', fontWeight: '700', color: '#F1F5F9', margin: '0 0 4px' },
  sub: { fontSize: '14px', color: '#64748B', margin: '0 0 24px' },
  card: { background: '#131d35', border: '1px solid #1E293B', borderRadius: '14px', padding: '20px', marginBottom: '20px' },
  secTitle: { fontSize: '15px', fontWeight: '600', color: '#CBD5E1', marginBottom: '14px' },
  grid: { display: 'flex', flexWrap: 'wrap', gap: '14px' },
  group: { display: 'flex', flexDirection: 'column', gap: '6px', flex: '1 1 140px' },
  label: { fontSize: '13px', color: '#94A3B8' },
  input: { background: '#0A1020', border: '1px solid #1E293B', color: '#F1F5F9', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' },
  btnRow: { display: 'flex', gap: '10px', marginTop: '18px', flexWrap: 'wrap' },
  calcBtn: { background: '#D4AF37', color: '#0A0F1E', border: 'none', borderRadius: '8px', padding: '10px 24px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' },
  resetBtn: { background: '#1E293B', color: '#CBD5E1', border: '1px solid #334155', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  addBtn: { background: 'transparent', color: '#60A5FA', border: '1px solid #60A5FA', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  removeBtn: { background: 'transparent', color: '#F87171', border: '1px solid #F87171', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer', alignSelf: 'flex-end', marginBottom: '2px' },
  statsGrid: { display: 'flex', flexWrap: 'wrap', gap: '14px' },
  statCard: { background: '#0D1426', border: '1px solid #1E293B', borderRadius: '12px', padding: '16px 20px', flex: '1 1 150px' },
  statLabel: { fontSize: '12px', color: '#64748B', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' },
  statVal: { fontSize: '20px', fontWeight: '700', color: '#D4AF37' },
  debtRow: { display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'flex-end', padding: '12px 0', borderBottom: '1px solid #1E293B' },
  debtNum: { fontSize: '13px', color: '#64748B', width: '24px', paddingBottom: '12px', flexShrink: 0 },
  methodLabel: { fontSize: '13px', fontWeight: '700', padding: '4px 12px', borderRadius: '20px', display: 'inline-block' },
};

const fmt = (n) => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const BLANK_DEBT = { name: '', balance: '', apr: '', minPayment: '' };

const DEFAULT_DEBTS = [
  { name: 'Credit Card', balance: '', apr: '', minPayment: '' },
  { name: 'Car Loan', balance: '', apr: '', minPayment: '' },
];

function runStrategy(debts, extra, sortFn) {
  // Deep copy debts with mutable balances and track paid-off minimums
  let balances = debts.map(d => parseFloat(d.balance) || 0);
  const aprs = debts.map(d => parseFloat(d.apr) || 0);
  const minPayments = debts.map(d => parseFloat(d.minPayment) || 0);
  let month = 0;
  let totalInterest = 0;
  const monthlyTotals = [{ month: 0, total: balances.reduce((s, b) => s + b, 0) }];

  while (balances.some(b => b > 0.01) && month < 600) {
    month++;

    // 1. Apply monthly interest to each active debt
    for (let i = 0; i < balances.length; i++) {
      if (balances[i] <= 0.01) continue;
      const interest = balances[i] * (aprs[i] / 100 / 12);
      totalInterest += interest;
      balances[i] += interest;
    }

    // 2. Pay minimums; collect freed cash from debts paid off this month
    let freedCash = extra; // start with user's extra payment
    for (let i = 0; i < balances.length; i++) {
      if (balances[i] <= 0.01) {
        // Debt already paid off — its minimum is freed each month going forward
        freedCash += minPayments[i];
        continue;
      }
      const pmt = Math.min(minPayments[i], balances[i]);
      balances[i] -= pmt;
      if (balances[i] <= 0.01) {
        // Just paid off — overpayment goes back as freed cash
        freedCash += Math.abs(balances[i]);
        balances[i] = 0;
      }
    }

    // 3. Apply freed cash (extra + freed minimums) to target debt per strategy
    // Build index-sorted list using sortFn on synthetic debt objects
    const indexed = balances.map((b, i) => ({ i, balance: b, apr: aprs[i] }));
    indexed.sort(sortFn);

    let pool = freedCash;
    for (const { i } of indexed) {
      if (balances[i] <= 0.01 || pool <= 0) continue;
      const payment = Math.min(pool, balances[i]);
      balances[i] -= payment;
      pool -= payment;
      if (balances[i] < 0.01) balances[i] = 0;
    }

    const totalDebt = balances.reduce((sum, b) => sum + b, 0);
    monthlyTotals.push({ month, total: totalDebt });
  }

  return { months: month, totalInterest, monthlyTotals };
}

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

export default function DebtSnowballCalc() {
  const [debts, setDebts] = useState(DEFAULT_DEBTS);
  const [extra, setExtra] = useState('');
  const [results, setResults] = useState(null);

  const updateDebt = (i, field, value) => {
    const updated = debts.map((d, idx) => idx === i ? { ...d, [field]: value } : d);
    setDebts(updated);
  };

  const addDebt = () => {
    if (debts.length < 5) setDebts([...debts, { ...BLANK_DEBT }]);
  };

  const removeDebt = (i) => {
    if (debts.length > 1) setDebts(debts.filter((_, idx) => idx !== i));
  };

  const calculate = () => {
    const validDebts = debts.filter(d => (parseFloat(d.balance) || 0) > 0);
    if (!validDebts.length) return;
    const extraAmt = parseFloat(extra) || 0;

    // Snowball: lowest balance first
    const snowball = runStrategy(validDebts, extraAmt, (a, b) => a.balance - b.balance);
    // Avalanche: highest APR first
    const avalanche = runStrategy(validDebts, extraAmt, (a, b) => b.apr - a.apr);

    // Merge chart data to same length
    const maxMonths = Math.max(snowball.monthlyTotals.length, avalanche.monthlyTotals.length);
    const chartData = [];
    for (let i = 0; i < maxMonths; i++) {
      chartData.push({
        month: i,
        snowball: snowball.monthlyTotals[i] ? snowball.monthlyTotals[i].total : 0,
        avalanche: avalanche.monthlyTotals[i] ? avalanche.monthlyTotals[i].total : 0,
      });
    }

    setResults({ snowball, avalanche, chartData });
  };

  const reset = () => { setDebts(DEFAULT_DEBTS); setExtra(''); setResults(null); };

  const savings = results ? Math.max(0, results.snowball.totalInterest - results.avalanche.totalInterest) : 0;

  return (
    <div style={s.wrap}>
      <div style={s.h1}>Debt Snowball & Avalanche Calculator</div>
      <div style={s.sub}>Compare two payoff strategies to find the fastest and cheapest path to debt freedom</div>

      <div style={s.card}>
        <div style={s.secTitle}>Your Debts (up to 5)</div>
        {debts.map((debt, i) => (
          <div key={i} style={s.debtRow}>
            <div style={s.debtNum}>{i + 1}.</div>
            <div style={s.group}>
              <label style={s.label}>Name</label>
              <input style={s.input} value={debt.name} onChange={e => updateDebt(i, 'name', e.target.value)} placeholder="Credit Card" />
            </div>
            <div style={s.group}>
              <label style={s.label}>Balance ($)</label>
              <input style={s.input} value={debt.balance} onChange={e => updateDebt(i, 'balance', e.target.value)} placeholder="5000" type="number" min="0" />
            </div>
            <div style={s.group}>
              <label style={s.label}>APR (%)</label>
              <input style={s.input} value={debt.apr} onChange={e => updateDebt(i, 'apr', e.target.value)} placeholder="19.99" type="number" min="0" step="0.01" />
            </div>
            <div style={s.group}>
              <label style={s.label}>Min Payment ($)</label>
              <input style={s.input} value={debt.minPayment} onChange={e => updateDebt(i, 'minPayment', e.target.value)} placeholder="100" type="number" min="0" />
            </div>
            {debts.length > 1 && (
              <button style={s.removeBtn} onClick={() => removeDebt(i)}>Remove</button>
            )}
          </div>
        ))}
        <div style={{ marginTop: '14px', display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {debts.length < 5 && (
            <button style={s.addBtn} onClick={addDebt}>+ Add Debt</button>
          )}
          <div style={s.group}>
            <label style={s.label}>Extra Monthly Payment ($)</label>
            <input style={s.input} value={extra} onChange={e => setExtra(e.target.value)} placeholder="200" type="number" min="0" />
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
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
              {/* Snowball */}
              <div style={{ flex: '1 1 240px', background: '#0D1426', border: '1px solid #1E293B', borderRadius: '12px', padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <span style={{ ...s.methodLabel, background: '#1e3a5f', color: '#60A5FA' }}>Snowball</span>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>Lowest balance first</span>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <div style={s.statLabel}>Payoff Time</div>
                  <div style={{ ...s.statVal, color: '#60A5FA' }}>{results.snowball.months} months</div>
                </div>
                <div>
                  <div style={s.statLabel}>Total Interest</div>
                  <div style={{ ...s.statVal, color: '#F87171' }}>{fmt(results.snowball.totalInterest)}</div>
                </div>
              </div>

              {/* Avalanche */}
              <div style={{ flex: '1 1 240px', background: '#0D1426', border: '1px solid #1E293B', borderRadius: '12px', padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <span style={{ ...s.methodLabel, background: '#1a3a2a', color: '#4ADE80' }}>Avalanche</span>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>Highest APR first</span>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <div style={s.statLabel}>Payoff Time</div>
                  <div style={{ ...s.statVal, color: '#4ADE80' }}>{results.avalanche.months} months</div>
                </div>
                <div>
                  <div style={s.statLabel}>Total Interest</div>
                  <div style={{ ...s.statVal, color: '#F87171' }}>{fmt(results.avalanche.totalInterest)}</div>
                </div>
              </div>

              {/* Savings */}
              <div style={{ flex: '1 1 200px', background: '#0D1426', border: '1px solid #D4AF37', borderRadius: '12px', padding: '16px 20px' }}>
                <div style={{ fontSize: '13px', color: '#D4AF37', fontWeight: '700', marginBottom: '12px' }}>Avalanche Advantage</div>
                <div style={{ marginBottom: '8px' }}>
                  <div style={s.statLabel}>Interest Saved</div>
                  <div style={s.statVal}>{fmt(savings)}</div>
                </div>
                <div>
                  <div style={s.statLabel}>Months Faster</div>
                  <div style={{ ...s.statVal, color: '#4ADE80' }}>{Math.max(0, results.snowball.months - results.avalanche.months)}</div>
                </div>
              </div>
            </div>
          </div>

          <div style={s.card}>
            <div style={s.secTitle}>Total Debt Over Time — Snowball vs Avalanche</div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={results.chartData} margin={{ top: 8, right: 20, left: 10, bottom: 20 }}>
                <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" />
                <XAxis dataKey="month" stroke="#334155" tick={{ fill: '#64748B', fontSize: 11 }} label={{ value: 'Month', position: 'insideBottom', offset: -10, fill: '#64748B', fontSize: 12 }} />
                <YAxis stroke="#334155" tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={(v) => '$' + (v / 1000).toFixed(0) + 'k'} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ color: '#94A3B8', fontSize: '13px', paddingTop: '8px' }} />
                <Line type="monotone" dataKey="snowball" stroke="#60A5FA" strokeWidth={2} dot={false} name="Snowball" />
                <Line type="monotone" dataKey="avalanche" stroke="#4ADE80" strokeWidth={2} dot={false} name="Avalanche" strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
