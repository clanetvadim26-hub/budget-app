import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

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
  statCard: { background: '#0D1426', border: '1px solid #1E293B', borderRadius: '12px', padding: '16px 20px', flex: '1 1 140px' },
  statLabel: { fontSize: '12px', color: '#64748B', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' },
  statVal: { fontSize: '20px', fontWeight: '700', color: '#D4AF37' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: { textAlign: 'left', padding: '10px 12px', color: '#64748B', fontWeight: '600', borderBottom: '1px solid #1E293B', fontSize: '12px', textTransform: 'uppercase' },
  td: { padding: '9px 12px', color: '#CBD5E1', borderBottom: '1px solid #1E293B' },
};

const fmt = (n) => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtK = (n) => '$' + (n / 1000).toFixed(1) + 'k';

const DEFAULTS = { homePrice: '', downPayment: '', loanTerm: '30', apr: '', propertyTaxRate: '', homeInsurance: '', pmiRate: '0.5' };

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: '#0D1426', border: '1px solid #1E293B', borderRadius: '8px', padding: '10px 14px' }}>
      <p style={{ color: '#94A3B8', fontSize: '12px', margin: '0 0 6px' }}>Year {label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color, fontSize: '13px', fontWeight: '600', margin: '2px 0' }}>
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  );
};

export default function MortgageCalc() {
  const [form, setForm] = useState(DEFAULTS);
  const [results, setResults] = useState(null);

  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const calculate = () => {
    const price = parseFloat(form.homePrice) || 0;
    const down = parseFloat(form.downPayment) || 0;
    const termYears = parseInt(form.loanTerm);
    const n = termYears * 12;
    const r = (parseFloat(form.apr) || 0) / 100 / 12;
    const principal = Math.max(0, price - down);
    const downPct = price > 0 ? (down / price) * 100 : 0;

    const piPayment = r === 0
      ? principal / n
      : (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

    const propertyTaxMo = ((parseFloat(form.propertyTaxRate) || 0) / 100 * price) / 12;
    const insuranceMo = (parseFloat(form.homeInsurance) || 0) / 12;
    const pmiMo = downPct < 20 ? ((parseFloat(form.pmiRate) || 0) / 100 * principal) / 12 : 0;
    const totalPITI = piPayment + propertyTaxMo + insuranceMo + pmiMo;
    const totalInterest = piPayment * n - principal;
    const totalCost = piPayment * n + down + propertyTaxMo * n + insuranceMo * n;

    // Year-by-year summary (first 10 years)
    let balance = principal;
    const yearlyData = [];
    for (let yr = 1; yr <= Math.min(10, termYears); yr++) {
      let yearPrincipal = 0;
      let yearInterest = 0;
      for (let m = 0; m < 12; m++) {
        const intPmt = balance * r;
        const prinPmt = piPayment - intPmt;
        yearInterest += intPmt;
        yearPrincipal += prinPmt;
        balance = Math.max(0, balance - prinPmt);
      }
      const equity = price > 0 ? ((price - balance) / price * 100) : 0;
      yearlyData.push({ year: yr, principal: yearPrincipal, interest: yearInterest, balance, equity });
    }

    setResults({ piPayment, propertyTaxMo, insuranceMo, pmiMo, totalPITI, totalInterest, totalCost, principal, yearlyData });
  };

  const reset = () => { setForm(DEFAULTS); setResults(null); };

  return (
    <div style={s.wrap}>
      <div style={s.h1}>Mortgage Calculator</div>
      <div style={s.sub}>Calculate your full monthly PITI payment and long-term costs</div>

      <div style={s.card}>
        <div style={s.secTitle}>Loan Details</div>
        <div style={s.grid}>
          <div style={s.group}>
            <label style={s.label}>Home Price ($)</label>
            <input style={s.input} name="homePrice" value={form.homePrice} onChange={set} placeholder="400000" type="number" min="0" />
          </div>
          <div style={s.group}>
            <label style={s.label}>Down Payment ($)</label>
            <input style={s.input} name="downPayment" value={form.downPayment} onChange={set} placeholder="80000" type="number" min="0" />
          </div>
          <div style={s.group}>
            <label style={s.label}>Loan Term (years)</label>
            <select style={s.select} name="loanTerm" value={form.loanTerm} onChange={set}>
              {['10', '15', '20', '30'].map(v => <option key={v} value={v}>{v} years</option>)}
            </select>
          </div>
          <div style={s.group}>
            <label style={s.label}>APR (%)</label>
            <input style={s.input} name="apr" value={form.apr} onChange={set} placeholder="7.0" type="number" min="0" step="0.01" />
          </div>
          <div style={s.group}>
            <label style={s.label}>Property Tax Rate (% annual)</label>
            <input style={s.input} name="propertyTaxRate" value={form.propertyTaxRate} onChange={set} placeholder="1.2" type="number" min="0" step="0.01" />
          </div>
          <div style={s.group}>
            <label style={s.label}>Home Insurance ($/year)</label>
            <input style={s.input} name="homeInsurance" value={form.homeInsurance} onChange={set} placeholder="1800" type="number" min="0" />
          </div>
          <div style={s.group}>
            <label style={s.label}>PMI Rate (% if down &lt; 20%)</label>
            <input style={s.input} name="pmiRate" value={form.pmiRate} onChange={set} placeholder="0.5" type="number" min="0" step="0.01" />
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
            <div style={s.secTitle}>Monthly Payment Breakdown</div>
            <div style={s.statsGrid}>
              <div style={s.statCard}>
                <div style={s.statLabel}>Total PITI</div>
                <div style={s.statVal}>{fmt(results.totalPITI)}</div>
              </div>
              <div style={s.statCard}>
                <div style={s.statLabel}>Principal & Interest</div>
                <div style={{ ...s.statVal, color: '#60A5FA' }}>{fmt(results.piPayment)}</div>
              </div>
              <div style={s.statCard}>
                <div style={s.statLabel}>Property Tax/mo</div>
                <div style={{ ...s.statVal, color: '#CBD5E1' }}>{fmt(results.propertyTaxMo)}</div>
              </div>
              <div style={s.statCard}>
                <div style={s.statLabel}>Insurance/mo</div>
                <div style={{ ...s.statVal, color: '#CBD5E1' }}>{fmt(results.insuranceMo)}</div>
              </div>
              {results.pmiMo > 0 && (
                <div style={s.statCard}>
                  <div style={s.statLabel}>PMI/mo</div>
                  <div style={{ ...s.statVal, color: '#FBBF24' }}>{fmt(results.pmiMo)}</div>
                </div>
              )}
              <div style={s.statCard}>
                <div style={s.statLabel}>Total Interest</div>
                <div style={{ ...s.statVal, color: '#F87171' }}>{fmt(results.totalInterest)}</div>
              </div>
              <div style={s.statCard}>
                <div style={s.statLabel}>Total Cost</div>
                <div style={{ ...s.statVal, color: '#F1F5F9' }}>{fmt(results.totalCost)}</div>
              </div>
            </div>
          </div>

          <div style={s.card}>
            <div style={s.secTitle}>Principal vs Interest Paid — First 10 Years</div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={results.yearlyData} margin={{ top: 8, right: 20, left: 10, bottom: 8 }}>
                <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" />
                <XAxis dataKey="year" stroke="#334155" tick={{ fill: '#64748B', fontSize: 11 }} label={{ value: 'Year', position: 'insideBottom', offset: -2, fill: '#64748B', fontSize: 12 }} />
                <YAxis stroke="#334155" tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={fmtK} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ color: '#94A3B8', fontSize: '13px', paddingTop: '8px' }} />
                <Bar dataKey="principal" name="Principal" fill="#4ADE80" radius={[3, 3, 0, 0]} />
                <Bar dataKey="interest" name="Interest" fill="#F87171" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={s.card}>
            <div style={s.secTitle}>Year-by-Year Summary</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={s.table}>
                <thead>
                  <tr>
                    {['Year', 'Principal Paid', 'Interest Paid', 'Balance', 'Equity %'].map(h => <th key={h} style={s.th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {results.yearlyData.map((row) => (
                    <tr key={row.year}>
                      <td style={s.td}>{row.year}</td>
                      <td style={{ ...s.td, color: '#4ADE80' }}>{fmt(row.principal)}</td>
                      <td style={{ ...s.td, color: '#F87171' }}>{fmt(row.interest)}</td>
                      <td style={s.td}>{fmt(row.balance)}</td>
                      <td style={{ ...s.td, color: '#D4AF37' }}>{row.equity.toFixed(1)}%</td>
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
