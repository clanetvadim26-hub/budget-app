import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

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
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: { textAlign: 'left', padding: '10px 12px', color: '#64748B', fontWeight: '600', borderBottom: '1px solid #1E293B', fontSize: '12px', textTransform: 'uppercase' },
  td: { padding: '9px 12px', color: '#CBD5E1', borderBottom: '1px solid #1E293B' },
  note: { fontSize: '12px', color: '#64748B', marginTop: '8px' },
};

const fmt = (n) => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const MONTHS_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getPayoffDate(months) {
  const now = new Date(2026, 2, 27);
  const payoff = new Date(now.getFullYear(), now.getMonth() + months, 1);
  return MONTHS_ABBR[payoff.getMonth()] + ' ' + payoff.getFullYear();
}

function buildSchedule(balance, monthlyRate, payment) {
  const rows = [];
  let bal = balance;
  let month = 1;
  while (bal > 0.01 && month <= 600) {
    const intCharge = bal * monthlyRate;
    const pmt = Math.min(payment, bal + intCharge);
    const principalPaid = pmt - intCharge;
    bal = Math.max(0, bal - principalPaid);
    rows.push({ month, payment: pmt, interest: intCharge, principal: principalPaid, balance: bal });
    month++;
  }
  return rows;
}

const DEFAULTS = { balance: '', apr: '', monthlyPayment: '' };

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

export default function CreditCardPayoffCalc() {
  const [form, setForm] = useState(DEFAULTS);
  const [results, setResults] = useState(null);

  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const calculate = () => {
    const balance = parseFloat(form.balance) || 0;
    const monthlyRate = (parseFloat(form.apr) || 0) / 100 / 12;
    const payment = parseFloat(form.monthlyPayment) || 0;
    const minPayment = Math.max(balance * 0.02, 25);

    if (payment <= balance * monthlyRate && payment > 0) {
      setResults({ error: 'Monthly payment must be greater than the monthly interest charge (' + fmt(balance * monthlyRate) + ') to pay off the balance.' });
      return;
    }

    const schedule = buildSchedule(balance, monthlyRate, Math.max(payment, minPayment));
    const minSchedule = buildSchedule(balance, monthlyRate, minPayment);

    const totalInterest = schedule.reduce((sum, r) => sum + r.interest, 0);
    const minTotalInterest = minSchedule.reduce((sum, r) => sum + r.interest, 0);
    const interestSaved = minTotalInterest - totalInterest;
    const months = schedule.length;

    // Build chart data: user payment vs minimum payment balance, capped at 60 months for readability
    const chartMonths = Math.min(Math.max(months, minSchedule.length), 60);
    const chartData = [];
    for (let i = 0; i < chartMonths; i++) {
      chartData.push({
        month: i + 1,
        yourPayment: schedule[i] ? schedule[i].balance : 0,
        minPayment: minSchedule[i] ? minSchedule[i].balance : 0,
      });
    }

    setResults({ schedule, months, totalInterest, payoffDate: getPayoffDate(months), interestSaved, minPayment, chartData });
  };

  const reset = () => { setForm(DEFAULTS); setResults(null); };

  return (
    <div style={s.wrap}>
      <div style={s.h1}>Credit Card Payoff Calculator</div>
      <div style={s.sub}>See how long it takes to pay off your credit card and how much interest you'll pay</div>

      <div style={s.card}>
        <div style={s.secTitle}>Card Details</div>
        <div style={s.grid}>
          <div style={s.group}>
            <label style={s.label}>Current Balance ($)</label>
            <input style={s.input} name="balance" value={form.balance} onChange={set} placeholder="5000" type="number" min="0" />
          </div>
          <div style={s.group}>
            <label style={s.label}>APR (%)</label>
            <input style={s.input} name="apr" value={form.apr} onChange={set} placeholder="22.99" type="number" min="0" step="0.01" />
          </div>
          <div style={s.group}>
            <label style={s.label}>Monthly Payment ($)</label>
            <input style={s.input} name="monthlyPayment" value={form.monthlyPayment} onChange={set} placeholder="200" type="number" min="0" />
          </div>
        </div>
        {form.balance && (
          <div style={s.note}>
            Minimum payment: {fmt(Math.max((parseFloat(form.balance) || 0) * 0.02, 25))} (2% of balance or $25, whichever is greater)
          </div>
        )}
        <div style={s.btnRow}>
          <button style={s.calcBtn} onClick={calculate}>Calculate</button>
          <button style={s.resetBtn} onClick={reset}>Reset</button>
        </div>
      </div>

      {results && results.error && (
        <div style={{ ...s.card, borderColor: '#F87171' }}>
          <div style={{ color: '#F87171', fontSize: '14px' }}>{results.error}</div>
        </div>
      )}

      {results && !results.error && (
        <>
          <div style={s.card}>
            <div style={s.secTitle}>Results</div>
            <div style={s.statsGrid}>
              <div style={s.statCard}>
                <div style={s.statLabel}>Months to Payoff</div>
                <div style={s.statVal}>{results.months}</div>
              </div>
              <div style={s.statCard}>
                <div style={s.statLabel}>Payoff Date</div>
                <div style={{ ...s.statVal, color: '#4ADE80', fontSize: '16px' }}>{results.payoffDate}</div>
              </div>
              <div style={s.statCard}>
                <div style={s.statLabel}>Total Interest</div>
                <div style={{ ...s.statVal, color: '#F87171' }}>{fmt(results.totalInterest)}</div>
              </div>
              <div style={s.statCard}>
                <div style={s.statLabel}>Interest Saved vs Min</div>
                <div style={{ ...s.statVal, color: '#4ADE80' }}>{fmt(Math.max(0, results.interestSaved))}</div>
              </div>
            </div>
          </div>

          <div style={s.card}>
            <div style={s.secTitle}>Balance Over Time — Your Payment vs Minimum Payment</div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={results.chartData} margin={{ top: 8, right: 20, left: 10, bottom: 20 }}>
                <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" />
                <XAxis dataKey="month" stroke="#334155" tick={{ fill: '#64748B', fontSize: 11 }} label={{ value: 'Month', position: 'insideBottom', offset: -10, fill: '#64748B', fontSize: 12 }} />
                <YAxis stroke="#334155" tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={(v) => '$' + (v / 1000).toFixed(1) + 'k'} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ color: '#94A3B8', fontSize: '13px', paddingTop: '8px' }} />
                <Line type="monotone" dataKey="yourPayment" stroke="#4ADE80" strokeWidth={2} dot={false} name="Your Payment" />
                <Line type="monotone" dataKey="minPayment" stroke="#F87171" strokeWidth={2} dot={false} name="Min Payment" strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={s.card}>
            <div style={s.secTitle}>Month-by-Month — First 24 Months</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={s.table}>
                <thead>
                  <tr>
                    {['Month', 'Payment', 'Interest', 'Principal', 'Balance'].map(h => <th key={h} style={s.th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {results.schedule.slice(0, 24).map((row) => (
                    <tr key={row.month}>
                      <td style={s.td}>{row.month}</td>
                      <td style={s.td}>{fmt(row.payment)}</td>
                      <td style={{ ...s.td, color: '#F87171' }}>{fmt(row.interest)}</td>
                      <td style={{ ...s.td, color: '#4ADE80' }}>{fmt(row.principal)}</td>
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
