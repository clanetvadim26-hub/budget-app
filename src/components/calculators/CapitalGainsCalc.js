import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const S = {
  wrap: { padding: 24, color: '#F1F5F9', maxWidth: 860, margin: '0 auto' },
  title: { fontSize: 22, fontWeight: 700, color: '#F1F5F9', marginBottom: 4 },
  sub: { fontSize: 13, color: '#64748B', marginBottom: 24 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 },
  card: { background: '#131d35', border: '1px solid #1E293B', borderRadius: 12, padding: 16 },
  label: { fontSize: 12, color: '#64748B', marginBottom: 6, display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },
  input: { background: '#0A1020', border: '1px solid #1E293B', color: '#F1F5F9', borderRadius: 8, padding: '10px 12px', width: '100%', boxSizing: 'border-box', fontSize: 14 },
  toggleRow: { display: 'flex', gap: 8 },
  btnRow: { display: 'flex', gap: 12, marginBottom: 24 },
  calcBtn: { background: '#D4AF37', color: '#0A0F1E', fontWeight: 700, border: 'none', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontSize: 14 },
  resetBtn: { background: 'transparent', border: '1px solid #334155', color: '#94A3B8', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontSize: 14 },
  resultsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 },
  chartWrap: { background: '#131d35', border: '1px solid #1E293B', borderRadius: 12, padding: 20, marginBottom: 16 },
  chartTitle: { fontSize: 14, fontWeight: 600, color: '#94A3B8', marginBottom: 16 },
  errorBox: { background: '#1a0a0a', border: '1px solid #F87171', borderRadius: 8, padding: '12px 16px', color: '#F87171', marginBottom: 16, fontSize: 13 },
  noteBox: { background: '#131d35', border: '1px solid #1E293B', borderRadius: 12, padding: 16, fontSize: 12, color: '#64748B' },
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
const pct = (n) => n.toFixed(2) + '%';

function getOrdinaryTax(income, status) {
  const brackets = {
    Single: [[11600, 0.10], [47150, 0.12], [100525, 0.22], [191950, 0.24], [243725, 0.32], [609350, 0.35], [Infinity, 0.37]],
    MFJ:    [[23200, 0.10], [94300, 0.12], [201050, 0.22], [383900, 0.24], [487450, 0.32], [731200, 0.35], [Infinity, 0.37]],
  };
  const b = brackets[status] || brackets.Single;
  let tax = 0, prev = 0;
  for (const [top, rate] of b) {
    if (income <= prev) break;
    tax += (Math.min(income, top) - prev) * rate;
    prev = top;
  }
  return tax;
}

function getLTCGRate(income, status) {
  if (status === 'Single') { return income <= 47025 ? 0 : income <= 518900 ? 0.15 : 0.20; }
  return income <= 94050 ? 0 : income <= 583750 ? 0.15 : 0.20;
}

const DEFAULTS = { purchasePrice: '', salePrice: '', holdPeriod: 'long', filingStatus: 'Single', annualIncome: '' };

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: '#131d35', border: '1px solid #1E293B', borderRadius: 8, padding: '10px 14px' }}>
      <p style={{ color: '#94A3B8', fontSize: 12, marginBottom: 4 }}>{label}</p>
      <p style={{ color: '#F1F5F9', fontWeight: 700 }}>{fmt(payload[0].value)}</p>
    </div>
  );
};

export default function CapitalGainsCalc() {
  const [form, setForm] = useState(DEFAULTS);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const calculate = () => {
    setError('');
    const pp = parseFloat(form.purchasePrice);
    const sp = parseFloat(form.salePrice);
    const inc = parseFloat(form.annualIncome);
    if ([pp, sp, inc].some(isNaN) || [pp, sp, inc].some(v => v < 0)) {
      setError('Please enter valid positive numbers for all fields.');
      return;
    }
    const gain = sp - pp;
    let tax = 0;
    if (gain > 0) {
      if (form.holdPeriod === 'short') {
        tax = getOrdinaryTax(inc + gain, form.filingStatus) - getOrdinaryTax(inc, form.filingStatus);
      } else {
        tax = gain * getLTCGRate(inc + gain, form.filingStatus);
      }
    }
    setResults({ gain, tax, effectiveRate: gain > 0 ? (tax / gain) * 100 : 0, netProceeds: sp - tax, purchasePrice: pp, salePrice: sp });
  };

  const reset = () => { setForm(DEFAULTS); setResults(null); setError(''); };

  const chartData = results ? [
    { name: 'Purchase Price', value: Math.round(results.purchasePrice), color: '#64748B' },
    { name: 'Capital Gain',   value: Math.round(Math.max(0, results.gain)), color: results.gain >= 0 ? '#4ADE80' : '#F87171' },
    { name: 'Tax Owed',       value: Math.round(results.tax), color: '#F87171' },
    { name: 'Net Proceeds',   value: Math.round(results.netProceeds), color: '#D4AF37' },
  ] : [];

  return (
    <div style={S.wrap}>
      <div style={S.title}>Capital Gains Tax Calculator</div>
      <div style={S.sub}>Estimate your federal capital gains tax based on 2024 rates</div>

      <div style={S.grid}>
        <div style={S.card}>
          <label style={S.label}>Purchase Price ($)</label>
          <input style={S.input} type="number" min="0" placeholder="e.g. 50000" value={form.purchasePrice} onChange={e => set('purchasePrice', e.target.value)} />
        </div>
        <div style={S.card}>
          <label style={S.label}>Sale Price ($)</label>
          <input style={S.input} type="number" min="0" placeholder="e.g. 80000" value={form.salePrice} onChange={e => set('salePrice', e.target.value)} />
        </div>
        <div style={S.card}>
          <label style={S.label}>Annual Income ($)</label>
          <input style={S.input} type="number" min="0" placeholder="e.g. 75000" value={form.annualIncome} onChange={e => set('annualIncome', e.target.value)} />
        </div>
        <div style={S.card}>
          <label style={S.label}>Filing Status</label>
          <select style={S.input} value={form.filingStatus} onChange={e => set('filingStatus', e.target.value)}>
            <option value="Single">Single</option>
            <option value="MFJ">Married Filing Jointly</option>
          </select>
        </div>
        <div style={S.card}>
          <label style={S.label}>Hold Period</label>
          <div style={S.toggleRow}>
            <button style={toggleBtn(form.holdPeriod === 'short')} onClick={() => set('holdPeriod', 'short')}>Short-term (&lt;1yr)</button>
            <button style={toggleBtn(form.holdPeriod === 'long')}  onClick={() => set('holdPeriod', 'long')}>Long-term (≥1yr)</button>
          </div>
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
            <div style={resultCard(false)}>
              <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Capital Gain / Loss</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: results.gain >= 0 ? '#4ADE80' : '#F87171' }}>{results.gain >= 0 ? '+' : ''}{fmt(results.gain)}</div>
            </div>
            <div style={resultCard(false)}>
              <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Federal Tax Owed</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#F87171' }}>{fmt(results.tax)}</div>
            </div>
            <div style={resultCard(false)}>
              <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Effective Rate</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#D4AF37' }}>{pct(results.effectiveRate)}</div>
            </div>
            <div style={resultCard(true)}>
              <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Net Proceeds</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#F1F5F9' }}>{fmt(results.netProceeds)}</div>
            </div>
          </div>

          <div style={S.chartWrap}>
            <div style={S.chartTitle}>Breakdown</div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={v => '$' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={S.noteBox}>
            <strong style={{ color: '#94A3B8' }}>Note:</strong> Uses 2024 federal rates only. State taxes, the 3.8% Net Investment Income Tax (NIIT), and AMT are not included. Consult a tax professional for personalized advice.
          </div>
        </>
      )}
    </div>
  );
}
