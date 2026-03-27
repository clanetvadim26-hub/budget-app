import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const S = {
  wrap: { padding: 24, color: '#F1F5F9', maxWidth: 860, margin: '0 auto' },
  title: { fontSize: 22, fontWeight: 700, color: '#F1F5F9', marginBottom: 4 },
  sub: { fontSize: 13, color: '#64748B', marginBottom: 24 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 },
  card: { background: '#131d35', border: '1px solid #1E293B', borderRadius: 12, padding: 16 },
  label: { fontSize: 12, color: '#64748B', marginBottom: 6, display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },
  input: { background: '#0A1020', border: '1px solid #1E293B', color: '#F1F5F9', borderRadius: 8, padding: '10px 12px', width: '100%', boxSizing: 'border-box', fontSize: 14 },
  btnRow: { display: 'flex', gap: 12, marginBottom: 24 },
  calcBtn: { background: '#D4AF37', color: '#0A0F1E', fontWeight: 700, border: 'none', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontSize: 14 },
  resetBtn: { background: 'transparent', border: '1px solid #334155', color: '#94A3B8', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontSize: 14 },
  resultsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 },
  chartWrap: { background: '#131d35', border: '1px solid #1E293B', borderRadius: 12, padding: 20, marginBottom: 16 },
  chartTitle: { fontSize: 14, fontWeight: 600, color: '#94A3B8', marginBottom: 16 },
  errorBox: { background: '#1a0a0a', border: '1px solid #F87171', borderRadius: 8, padding: '12px 16px', color: '#F87171', marginBottom: 16, fontSize: 13 },
  noteBox: { background: '#131d35', border: '1px solid #1E293B', borderRadius: 12, padding: 16, fontSize: 12, color: '#64748B' },
  tableWrap: { background: '#131d35', border: '1px solid #1E293B', borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { padding: '10px 14px', textAlign: 'left', borderBottom: '1px solid #1E293B', color: '#64748B', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', background: '#0A1020' },
  td: { padding: '10px 14px', borderBottom: '1px solid #1E293B', color: '#F1F5F9' },
};

const resultCard = (highlight) => ({
  background: '#131d35', border: `1px solid ${highlight ? '#D4AF37' : '#1E293B'}`,
  borderRadius: 12, padding: 16, textAlign: 'center',
});

const fmt = (n) => '$' + Math.round(n).toLocaleString();
const pct = (n) => n.toFixed(1) + '%';

// IRS Uniform Lifetime Table (simplified) — divisor at age 72 = 27.4, decreases ~0.4–0.5/yr
function getULTDivisor(age) {
  // Key IRS table values
  const table = {
    72: 27.4, 73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9,
    78: 22.0, 79: 21.1, 80: 20.2, 81: 19.4, 82: 18.5, 83: 17.7,
    84: 16.8, 85: 16.0, 86: 15.2, 87: 14.4, 88: 13.7, 89: 12.9,
    90: 12.2, 91: 11.5, 92: 10.8, 93: 10.1, 94: 9.5, 95: 8.9,
    96: 8.4, 97: 7.8, 98: 7.3, 99: 6.8, 100: 6.4,
  };
  if (age < 72) return null; // RMDs start at 73 (SECURE 2.0), but calculator uses 72+ for illustration
  if (age >= 100) return 6.4;
  return table[age] || Math.max(1, 27.4 - (age - 72) * 0.45);
}

const DEFAULTS = { currentAge: '', balance: '', returnRate: '6' };

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: '#131d35', border: '1px solid #1E293B', borderRadius: 8, padding: '10px 14px' }}>
      <p style={{ color: '#94A3B8', fontSize: 12, marginBottom: 4 }}>{label}</p>
      <p style={{ color: '#D4AF37', fontWeight: 700 }}>{fmt(payload[0].value)}</p>
    </div>
  );
};

export default function RMDCalc() {
  const [form, setForm] = useState(DEFAULTS);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const calculate = () => {
    setError('');
    const age = parseInt(form.currentAge, 10);
    const balance = parseFloat(form.balance);
    const returnRate = parseFloat(form.returnRate) / 100;
    if (isNaN(age) || age < 72 || age > 120) { setError('Age must be between 72 and 120.'); return; }
    if (isNaN(balance) || balance <= 0) { setError('Please enter a valid account balance.'); return; }
    if (isNaN(returnRate) || returnRate < 0) { setError('Please enter a valid return rate.'); return; }

    const divisor = getULTDivisor(age);
    const thisYearRMD = balance / divisor;

    // Project next 10 years
    const rows = [];
    let bal = balance;
    for (let i = 0; i < 10; i++) {
      const a = age + i;
      const div = getULTDivisor(a);
      const rmd = div ? bal / div : bal;
      const pctOfAcct = (rmd / bal) * 100;
      rows.push({ year: new Date().getFullYear() + i, age: a, balance: Math.round(bal), rmd: Math.round(rmd), pctOfAcct });
      bal = Math.max(0, (bal - rmd) * (1 + returnRate));
    }

    setResults({ thisYearRMD, rows, age, balance });
  };

  const reset = () => { setForm(DEFAULTS); setResults(null); setError(''); };

  const chartData = results ? results.rows.map(r => ({ name: `Age ${r.age}`, RMD: r.rmd })) : [];

  return (
    <div style={S.wrap}>
      <div style={S.title}>Required Minimum Distribution (RMD) Calculator</div>
      <div style={S.sub}>Calculate IRS-required withdrawals from tax-deferred retirement accounts</div>

      <div style={S.grid}>
        <div style={S.card}>
          <label style={S.label}>Current Age</label>
          <input style={S.input} type="number" min="72" max="120" placeholder="e.g. 73" value={form.currentAge} onChange={e => set('currentAge', e.target.value)} />
        </div>
        <div style={S.card}>
          <label style={S.label}>Account Balance ($)</label>
          <input style={S.input} type="number" min="0" placeholder="e.g. 500000" value={form.balance} onChange={e => set('balance', e.target.value)} />
        </div>
        <div style={S.card}>
          <label style={S.label}>Expected Annual Return (%)</label>
          <input style={S.input} type="number" min="0" max="20" step="0.1" placeholder="e.g. 6" value={form.returnRate} onChange={e => set('returnRate', e.target.value)} />
        </div>
      </div>

      {error && <div style={S.errorBox}>{error}</div>}
      <div style={S.btnRow}>
        <button style={S.calcBtn} onClick={calculate}>Calculate</button>
        <button style={S.resetBtn} onClick={reset}>Reset</button>
      </div>

      {results && (
        <>
          <div style={S.resultsGrid}>
            <div style={resultCard(true)}>
              <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>This Year's RMD</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#D4AF37' }}>{fmt(results.thisYearRMD)}</div>
            </div>
            <div style={resultCard(false)}>
              <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>% of Account</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#F1F5F9' }}>{pct((results.thisYearRMD / results.balance) * 100)}</div>
            </div>
            <div style={resultCard(false)}>
              <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Monthly Amount</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#4ADE80' }}>{fmt(results.thisYearRMD / 12)}</div>
            </div>
          </div>

          <div style={S.chartWrap}>
            <div style={S.chartTitle}>RMD Projections — Next 10 Years</div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={v => '$' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="RMD" fill="#D4AF37" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={S.tableWrap}>
            <div style={{ padding: '16px 20px 8px', fontSize: 14, fontWeight: 600, color: '#94A3B8' }}>10-Year RMD Projection Table</div>
            <table style={S.table}>
              <thead>
                <tr>
                  {['Year', 'Age', 'Account Balance', 'RMD Amount', '% of Account'].map(h => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.rows.map((r, i) => (
                  <tr key={i} style={{ background: i === 0 ? 'rgba(212,175,55,0.05)' : 'transparent' }}>
                    <td style={S.td}>{r.year}</td>
                    <td style={{ ...S.td, color: '#94A3B8' }}>{r.age}</td>
                    <td style={S.td}>{fmt(r.balance)}</td>
                    <td style={{ ...S.td, color: '#D4AF37', fontWeight: i === 0 ? 700 : 400 }}>{fmt(r.rmd)}</td>
                    <td style={{ ...S.td, color: '#64748B' }}>{pct(r.pctOfAcct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={S.noteBox}>
            <strong style={{ color: '#94A3B8' }}>Note:</strong> RMDs now start at age 73 per SECURE 2.0 Act. Uses IRS Uniform Lifetime Table. Balances grow at your specified return rate net of withdrawals. Consult your financial institution or tax advisor for your exact RMD amount.
          </div>
        </>
      )}
    </div>
  );
}
