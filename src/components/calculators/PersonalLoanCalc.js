import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
  select: { background: '#0A1020', border: '1px solid #1E293B', color: '#F1F5F9', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' },
  btnRow: { display: 'flex', gap: '10px', marginTop: '18px', flexWrap: 'wrap' },
  calcBtn: { background: '#D4AF37', color: '#0A0F1E', border: 'none', borderRadius: '8px', padding: '10px 24px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' },
  resetBtn: { background: '#1E293B', color: '#CBD5E1', border: '1px solid #334155', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  statsGrid: { display: 'flex', flexWrap: 'wrap', gap: '14px' },
  statCard: { background: '#0D1426', border: '1px solid #1E293B', borderRadius: '12px', padding: '16px 20px', flex: '1 1 150px' },
  statLabel: { fontSize: '12px', color: '#64748B', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' },
  statVal: { fontSize: '22px', fontWeight: '700', color: '#D4AF37' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: { textAlign: 'left', padding: '10px 12px', color: '#64748B', fontWeight: '600', borderBottom: '1px solid #1E293B', fontSize: '12px', textTransform: 'uppercase' },
  td: { padding: '9px 12px', color: '#CBD5E1', borderBottom: '1px solid #1E293B' },
};

const fmt = (n) => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getPayoffDate(months) {
  const now = new Date(2026, 2, 27); // today per system date
  const payoff = new Date(now.getFullYear(), now.getMonth() + months, 1);
  return MONTHS[payoff.getMonth()] + ' ' + payoff.getFullYear();
}

const DEFAULTS = { loanAmount: '', apr: '', loanTerm: '36' };

const BalanceTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: '#0D1426', border: '1px solid #1E293B', borderRadius: '8px', padding: '10px 14px' }}>
      <p style={{ color: '#94A3B8', fontSize: '12px', margin: 0 }}>Month {label}</p>
      <p style={{ color: '#60A5FA', fontSize: '14px', fontWeight: '700', margin: '4px 0 0' }}>{fmt(payload[0].value)}</p>
    </div>
  );
};

export default function PersonalLoanCalc() {
  const [form, setForm] = useState(DEFAULTS);
  const [results, setResults] = useState(null);

  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const calculate = () => {
    const principal = parseFloat(form.loanAmount) || 0;
    const n = parseInt(form.loanTerm);
    const r = (parseFloat(form.apr) || 0) / 100 / 12;

    const monthlyPayment = r === 0
      ? principal / n
      : (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

    const totalInterest = monthlyPayment * n - principal;
    const totalCost = monthlyPayment * n;
    const payoffDate = getPayoffDate(n);

    let balance = principal;
    const schedule = [];
    for (let i = 1; i <= n; i++) {
      const intPmt = balance * r;
      const prinPmt = monthlyPayment - intPmt;
      balance = Math.max(0, balance - prinPmt);
      schedule.push({ month: i, payment: monthlyPayment, principal: prinPmt, interest: intPmt, balance });
    }

    setResults({ monthlyPayment, totalInterest, totalCost, payoffDate, schedule });
  };

  const reset = () => { setForm(DEFAULTS); setResults(null); };

  return (
    <div style={s.wrap}>
      <div style={s.h1}>Personal Loan Calculator</div>
      <div style={s.sub}>Calculate payments and total cost for a personal loan</div>

      <div style={s.card}>
        <div style={s.secTitle}>Loan Details</div>
        <div style={s.grid}>
          <div style={s.group}>
            <label style={s.label}>Loan Amount ($)</label>
            <input style={s.input} name="loanAmount" value={form.loanAmount} onChange={set} placeholder="10000" type="number" min="0" />
          </div>
          <div style={s.group}>
            <label style={s.label}>APR (%)</label>
            <input style={s.input} name="apr" value={form.apr} onChange={set} placeholder="12.0" type="number" min="0" step="0.01" />
          </div>
          <div style={s.group}>
            <label style={s.label}>Loan Term (months)</label>
            <select style={s.select} name="loanTerm" value={form.loanTerm} onChange={set}>
              {['12', '24', '36', '48', '60'].map(v => <option key={v} value={v}>{v} months</option>)}
            </select>
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
                <div style={s.statLabel}>Monthly Payment</div>
                <div style={s.statVal}>{fmt(results.monthlyPayment)}</div>
              </div>
              <div style={s.statCard}>
                <div style={s.statLabel}>Total Interest</div>
                <div style={{ ...s.statVal, color: '#F87171' }}>{fmt(results.totalInterest)}</div>
              </div>
              <div style={s.statCard}>
                <div style={s.statLabel}>Total Cost</div>
                <div style={{ ...s.statVal, color: '#F1F5F9' }}>{fmt(results.totalCost)}</div>
              </div>
              <div style={s.statCard}>
                <div style={s.statLabel}>Payoff Date</div>
                <div style={{ ...s.statVal, color: '#4ADE80', fontSize: '18px' }}>{results.payoffDate}</div>
              </div>
            </div>
          </div>

          <div style={s.card}>
            <div style={s.secTitle}>Remaining Balance Over Loan Term</div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={results.schedule} margin={{ top: 8, right: 20, left: 10, bottom: 20 }}>
                <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" />
                <XAxis dataKey="month" stroke="#334155" tick={{ fill: '#64748B', fontSize: 11 }} label={{ value: 'Month', position: 'insideBottom', offset: -10, fill: '#64748B', fontSize: 12 }} />
                <YAxis stroke="#334155" tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={(v) => '$' + (v / 1000).toFixed(1) + 'k'} />
                <Tooltip content={<BalanceTooltip />} />
                <Line type="monotone" dataKey="balance" stroke="#60A5FA" strokeWidth={2} dot={false} name="Balance" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={s.card}>
            <div style={s.secTitle}>Amortization Schedule — First 12 Months</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={s.table}>
                <thead>
                  <tr>
                    {['Month', 'Payment', 'Principal', 'Interest', 'Balance'].map(h => <th key={h} style={s.th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {results.schedule.slice(0, 12).map((row) => (
                    <tr key={row.month}>
                      <td style={s.td}>{row.month}</td>
                      <td style={s.td}>{fmt(row.payment)}</td>
                      <td style={{ ...s.td, color: '#4ADE80' }}>{fmt(row.principal)}</td>
                      <td style={{ ...s.td, color: '#F87171' }}>{fmt(row.interest)}</td>
                      <td style={s.td}>{fmt(row.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
