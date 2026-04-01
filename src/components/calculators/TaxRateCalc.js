import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend} from 'recharts';

const S = {
  wrap: { padding: 24, color: '#F1F5F9', maxWidth: 900, margin: '0 auto' },
  title: { fontSize: 22, fontWeight: 700, color: '#F1F5F9', marginBottom: 4 },
  sub: { fontSize: 13, color: '#64748B', marginBottom: 24 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 },
  card: { background: '#131d35', border: '1px solid #1E293B', borderRadius: 12, padding: 16 },
  label: { fontSize: 12, color: '#64748B', marginBottom: 6, display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },
  input: { background: '#0A1020', border: '1px solid #1E293B', color: '#F1F5F9', borderRadius: 8, padding: '10px 12px', width: '100%', boxSizing: 'border-box', fontSize: 14 },
  toggleRow: { display: 'flex', gap: 8 },
  btnRow: { display: 'flex', gap: 12, marginBottom: 24 },
  calcBtn: { background: '#D4AF37', color: '#0A0F1E', fontWeight: 700, border: 'none', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontSize: 14 },
  resetBtn: { background: 'transparent', border: '1px solid #334155', color: '#94A3B8', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontSize: 14 },
  resultsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 },
  chartWrap: { background: '#131d35', border: '1px solid #1E293B', borderRadius: 12, padding: 20, marginBottom: 16 },
  chartTitle: { fontSize: 14, fontWeight: 600, color: '#94A3B8', marginBottom: 16 },
  errorBox: { background: '#1a0a0a', border: '1px solid #F87171', borderRadius: 8, padding: '12px 16px', color: '#F87171', marginBottom: 16, fontSize: 13 },
  noteBox: { background: '#131d35', border: '1px solid #1E293B', borderRadius: 12, padding: 16, fontSize: 12, color: '#64748B' },
  bracketTable: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #1E293B', color: '#64748B', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' },
  td: { padding: '8px 12px', borderBottom: '1px solid #1E293B', color: '#F1F5F9' },
};

const toggleBtn = (active) => ({
  flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid #1E293B',
  background: active ? '#D4AF37' : '#0A1020', color: active ? '#0A0F1E' : '#94A3B8',
  fontWeight: active ? 700 : 400, cursor: 'pointer', fontSize: 13,
});

const resultCard = (highlight) => ({
  background: '#131d35', border: `1px solid ${highlight ? '#D4AF37' : '#1E293B'}`,
  borderRadius: 12, padding: 16, textAlign: 'center',
});

const fmt = (n) => '$' + Math.round(n).toLocaleString();
const pct = (n) => (typeof n === 'number' ? n.toFixed(1) : '0.0') + '%';

const STANDARD_DEDUCTIONS = { Single: 15000, MFJ: 30000, HOH: 22500 };

// 2026 federal tax brackets (IRS)
const BRACKETS = {
  Single: [[12075, 0.10], [49050, 0.12], [99575, 0.22], [195250, 0.24], [276850, 0.32], [346875, 0.35], [Infinity, 0.37]],
  MFJ:    [[24150, 0.10], [98100, 0.12], [199150, 0.22], [390500, 0.24], [553700, 0.32], [693750, 0.35], [Infinity, 0.37]],
  HOH:    [[17100, 0.10], [65150, 0.12], [104200, 0.22], [197950, 0.24], [251950, 0.32], [629150, 0.35], [Infinity, 0.37]],
};

function calcTax(taxableIncome, status) {
  const b = BRACKETS[status] || BRACKETS.Single;
  let tax = 0, prev = 0;
  const breakdown = [];
  for (const [top, rate] of b) {
    if (taxableIncome <= prev) break;
    const amount = (Math.min(taxableIncome, top) - prev) * rate;
    if (amount > 0) breakdown.push({ rate, amount, income: Math.min(taxableIncome, top) - prev });
    tax += amount;
    prev = top;
    if (top === Infinity) break;
  }
  const marginalBracket = b.find(([top], i) => taxableIncome <= top || i === b.length - 1);
  return { tax, breakdown, marginalRate: marginalBracket ? marginalBracket[1] * 100 : 37 };
}

const BRACKET_COLORS = ['#4ADE80', '#86EFAC', '#FDE68A', '#FBBF24', '#F97316', '#EF4444', '#DC2626'];

const DEFAULTS = { filingStatus: 'Single', grossIncome: '', preTaxDeductions: '', deductionType: 'standard', itemizedDeductions: '' };

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: '#131d35', border: '1px solid #1E293B', borderRadius: 8, padding: '10px 14px', maxWidth: 200 }}>
      <p style={{ color: '#94A3B8', fontSize: 12, marginBottom: 6 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.fill, fontSize: 12, margin: '2px 0' }}>{p.name}: {fmt(p.value)}</p>
      ))}
    </div>
  );
};

export default function TaxRateCalc() {
  const [form, setForm] = useState(DEFAULTS);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const calculate = () => {
    setError('');
    const gross = parseFloat(form.grossIncome);
    const pretax = parseFloat(form.preTaxDeductions) || 0;
    const itemized = parseFloat(form.itemizedDeductions) || 0;
    if (isNaN(gross) || gross < 0) { setError('Please enter a valid gross income.'); return; }

    const agi = Math.max(0, gross - pretax);
    const standardDed = STANDARD_DEDUCTIONS[form.filingStatus];
    const deduction = form.deductionType === 'standard' ? standardDed : Math.max(itemized, 0);
    const taxableIncome = Math.max(0, agi - deduction);
    const { tax, breakdown, marginalRate } = calcTax(taxableIncome, form.filingStatus);
    const effectiveRate = gross > 0 ? (tax / gross) * 100 : 0;
    const afterTax = gross - tax;
    setResults({ gross, pretax, agi, deduction, taxableIncome, tax, marginalRate, effectiveRate, afterTax, breakdown });
  };

  const reset = () => { setForm(DEFAULTS); setResults(null); setError(''); };

  const chartData = results ? (() => {
    const row = { Deductions: Math.round(results.deduction + results.pretax) };
    results.breakdown.forEach((b, i) => { row[`${(b.rate * 100).toFixed(0)}% Bracket`] = Math.round(b.income); });
    return [{ name: 'Income', ...row }];
  })() : [];

  const bracketKeys = results ? results.breakdown.map((b, i) => `${(b.rate * 100).toFixed(0)}% Bracket`) : [];

  return (
    <div style={S.wrap}>
      <div style={S.title}>Tax Rate Calculator</div>
      <div style={S.sub}>Estimate your 2026 federal income tax, marginal rate, and effective rate</div>

      <div style={S.grid}>
        <div style={S.card}>
          <label style={S.label}>Filing Status</label>
          <select style={S.input} value={form.filingStatus} onChange={e => set('filingStatus', e.target.value)}>
            <option value="Single">Single</option>
            <option value="MFJ">Married Filing Jointly</option>
            <option value="HOH">Head of Household</option>
          </select>
        </div>
        <div style={S.card}>
          <label style={S.label}>Gross Income ($)</label>
          <input style={S.input} type="number" min="0" placeholder="e.g. 85000" value={form.grossIncome} onChange={e => set('grossIncome', e.target.value)} />
        </div>
        <div style={S.card}>
          <label style={S.label}>Pre-tax Deductions ($)</label>
          <input style={S.input} type="number" min="0" placeholder="e.g. 6000 (401k)" value={form.preTaxDeductions} onChange={e => set('preTaxDeductions', e.target.value)} />
        </div>
        <div style={S.card}>
          <label style={S.label}>Deduction Type</label>
          <div style={S.toggleRow}>
            <button style={toggleBtn(form.deductionType === 'standard')} onClick={() => set('deductionType', 'standard')}>Standard</button>
            <button style={toggleBtn(form.deductionType === 'itemized')} onClick={() => set('deductionType', 'itemized')}>Itemized</button>
          </div>
        </div>
        {form.deductionType === 'itemized' && (
          <div style={S.card}>
            <label style={S.label}>Itemized Deductions ($)</label>
            <input style={S.input} type="number" min="0" placeholder="e.g. 20000" value={form.itemizedDeductions} onChange={e => set('itemizedDeductions', e.target.value)} />
          </div>
        )}
      </div>

      {error && <div style={S.errorBox}>{error}</div>}
      <div style={S.btnRow}>
        <button style={S.calcBtn} onClick={calculate}>Calculate</button>
        <button style={S.resetBtn} onClick={reset}>Reset</button>
      </div>

      {results && (
        <>
          <div style={S.resultsGrid}>
            {[
              { label: 'Taxable Income', value: fmt(results.taxableIncome), color: '#F1F5F9', hi: false },
              { label: 'Marginal Rate', value: pct(results.marginalRate), color: '#D4AF37', hi: false },
              { label: 'Effective Rate', value: pct(results.effectiveRate), color: '#D4AF37', hi: false },
              { label: 'Tax Owed', value: fmt(results.tax), color: '#F87171', hi: false },
              { label: 'After-tax Income', value: fmt(results.afterTax), color: '#4ADE80', hi: true },
            ].map(({ label, value, color, hi }) => (
              <div key={label} style={resultCard(hi)}>
                <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={S.chartWrap}>
            <div style={S.chartTitle}>Income Breakdown by Tax Bracket</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, left: 60, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={v => '$' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#94A3B8', fontSize: 12 }} />
                <Tooltip content={<ChartTip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
                <Bar dataKey="Deductions" stackId="a" fill="#334155" radius={[0, 0, 0, 0]} />
                {bracketKeys.map((k, i) => (
                  <Bar key={k} dataKey={k} stackId="a" fill={BRACKET_COLORS[i] || '#64748B'} radius={i === bracketKeys.length - 1 ? [0, 4, 4, 0] : [0, 0, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ ...S.chartWrap, padding: '0 0 16px 0', overflow: 'hidden' }}>
            <div style={{ ...S.chartTitle, padding: '20px 20px 0 20px' }}>Bracket-by-Bracket Breakdown</div>
            <table style={S.bracketTable}>
              <thead>
                <tr>
                  <th style={S.th}>Rate</th>
                  <th style={S.th}>Income in Bracket</th>
                  <th style={S.th}>Tax in Bracket</th>
                </tr>
              </thead>
              <tbody>
                {results.breakdown.map((b, i) => (
                  <tr key={i}>
                    <td style={S.td}><span style={{ color: BRACKET_COLORS[i] || '#F1F5F9', fontWeight: 700 }}>{(b.rate * 100).toFixed(0)}%</span></td>
                    <td style={S.td}>{fmt(b.income)}</td>
                    <td style={S.td}>{fmt(b.amount)}</td>
                  </tr>
                ))}
                <tr>
                  <td style={{ ...S.td, fontWeight: 700, color: '#D4AF37' }}>Total</td>
                  <td style={{ ...S.td, fontWeight: 700 }}>{fmt(results.taxableIncome)}</td>
                  <td style={{ ...S.td, fontWeight: 700, color: '#F87171' }}>{fmt(results.tax)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={S.noteBox}>
            <strong style={{ color: '#94A3B8' }}>Note:</strong> 2026 federal brackets only. Does not include FICA, state/local taxes, AMT, credits, or other adjustments. Standard deductions: Single ${STANDARD_DEDUCTIONS.Single.toLocaleString()}, MFJ ${STANDARD_DEDUCTIONS.MFJ.toLocaleString()}, HOH ${STANDARD_DEDUCTIONS.HOH.toLocaleString()}.
          </div>
        </>
      )}
    </div>
  );
}
