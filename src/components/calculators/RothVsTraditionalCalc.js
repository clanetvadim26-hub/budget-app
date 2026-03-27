import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

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
  winnerBanner: (win) => ({
    background: win === 'roth' ? 'rgba(74,222,128,0.1)' : 'rgba(212,175,55,0.1)',
    border: `1px solid ${win === 'roth' ? '#4ADE80' : '#D4AF37'}`,
    borderRadius: 12, padding: '16px 20px', marginBottom: 16,
    display: 'flex', alignItems: 'center', gap: 12,
  }),
};

const resultCard = (highlight) => ({
  background: '#131d35', border: `1px solid ${highlight ? '#D4AF37' : '#1E293B'}`,
  borderRadius: 12, padding: 16, textAlign: 'center',
});

const fmt = (n) => '$' + Math.round(n).toLocaleString();
const pct = (n) => n.toFixed(1) + '%';

const DEFAULTS = { contribution: '', years: '', currentTaxRate: '', retirementTaxRate: '', returnRate: '7' };

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: '#131d35', border: '1px solid #1E293B', borderRadius: 8, padding: '10px 14px' }}>
      <p style={{ color: '#94A3B8', fontSize: 12, marginBottom: 6 }}>Year {label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontSize: 12, margin: '2px 0' }}>{p.name}: {fmt(p.value)}</p>
      ))}
    </div>
  );
};

export default function RothVsTraditionalCalc() {
  const [form, setForm] = useState(DEFAULTS);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const calculate = () => {
    setError('');
    const contrib      = parseFloat(form.contribution);
    const years        = parseInt(form.years, 10);
    const currentTax   = parseFloat(form.currentTaxRate) / 100;
    const retireTax    = parseFloat(form.retirementTaxRate) / 100;
    const returnRate   = parseFloat(form.returnRate) / 100;

    if ([contrib, years, currentTax, retireTax, returnRate].some(isNaN) || contrib <= 0 || years <= 0) {
      setError('Please fill in all fields with valid positive values.');
      return;
    }
    if (currentTax < 0 || currentTax > 1 || retireTax < 0 || retireTax > 1) {
      setError('Tax rates must be between 0% and 100%.');
      return;
    }

    // Roth: contribute after-tax dollars, grow tax-free
    // After-tax cost each year = contrib (since you need to pay tax on it)
    // Traditional: contribute pre-tax, pay tax on withdrawal
    // Traditional pre-tax contribution equivalent = contrib / (1 - currentTax) ... but standard comparison uses same dollar amount out-of-pocket
    // Standard fair comparison: same out-of-pocket, Roth contributes `contrib`, Traditional contributes `contrib / (1-currentTax)` pre-tax (or invest tax savings)

    const data = [];
    let rothFV = 0;
    let tradFV = 0;
    // Traditional pre-tax equivalent (same after-tax cost)
    const tradContrib = contrib / (1 - currentTax);

    for (let y = 1; y <= years; y++) {
      rothFV = (rothFV + contrib) * (1 + returnRate);
      tradFV = (tradFV + tradContrib) * (1 + returnRate);
      if (y % Math.max(1, Math.floor(years / 30)) === 0 || y === years) {
        data.push({
          year: y,
          'Roth (After-tax)': Math.round(rothFV),
          'Traditional (After-tax)': Math.round(tradFV * (1 - retireTax)),
        });
      }
    }

    const rothAfterTax = rothFV;
    const tradAfterTax = tradFV * (1 - retireTax);
    const difference   = rothAfterTax - tradAfterTax;
    // Break-even tax rate: rothFV = tradFV * (1 - r) => r = 1 - (rothFV/tradFV) => with tradFV = rothFV/(1-currentTax)
    // break-even retirement rate = currentTax (if same bracket, they're equal)
    // More precisely: Roth wins if retireTax > currentTax
    const breakEvenTaxRate = (1 - rothFV / tradFV) * 100;

    setResults({ rothAfterTax, tradAfterTax, difference, breakEvenTaxRate, data, currentTax: currentTax * 100, retireTax: retireTax * 100 });
  };

  const reset = () => { setForm(DEFAULTS); setResults(null); setError(''); };

  const winner = results ? (results.rothAfterTax >= results.tradAfterTax ? 'roth' : 'trad') : null;

  return (
    <div style={S.wrap}>
      <div style={S.title}>Roth vs. Traditional IRA / 401(k) Calculator</div>
      <div style={S.sub}>Compare after-tax retirement wealth based on your current and expected future tax rates</div>

      <div style={S.grid}>
        <div style={S.card}>
          <label style={S.label}>Annual Contribution ($)</label>
          <input style={S.input} type="number" min="0" placeholder="e.g. 7000" value={form.contribution} onChange={e => set('contribution', e.target.value)} />
        </div>
        <div style={S.card}>
          <label style={S.label}>Years Until Retirement</label>
          <input style={S.input} type="number" min="1" max="60" placeholder="e.g. 25" value={form.years} onChange={e => set('years', e.target.value)} />
        </div>
        <div style={S.card}>
          <label style={S.label}>Current Tax Rate (%)</label>
          <input style={S.input} type="number" min="0" max="60" step="0.1" placeholder="e.g. 22" value={form.currentTaxRate} onChange={e => set('currentTaxRate', e.target.value)} />
        </div>
        <div style={S.card}>
          <label style={S.label}>Retirement Tax Rate (%)</label>
          <input style={S.input} type="number" min="0" max="60" step="0.1" placeholder="e.g. 18" value={form.retirementTaxRate} onChange={e => set('retirementTaxRate', e.target.value)} />
        </div>
        <div style={S.card}>
          <label style={S.label}>Expected Annual Return (%)</label>
          <input style={S.input} type="number" min="0" max="30" step="0.1" placeholder="e.g. 7" value={form.returnRate} onChange={e => set('returnRate', e.target.value)} />
        </div>
      </div>

      {error && <div style={S.errorBox}>{error}</div>}
      <div style={S.btnRow}>
        <button style={S.calcBtn} onClick={calculate}>Calculate</button>
        <button style={S.resetBtn} onClick={reset}>Reset</button>
      </div>

      {results && (
        <>
          <div style={S.winnerBanner(winner)}>
            <div style={{ fontSize: 20 }}>{winner === 'roth' ? '★' : '★'}</div>
            <div>
              <div style={{ fontWeight: 700, color: winner === 'roth' ? '#4ADE80' : '#D4AF37', fontSize: 15 }}>
                {winner === 'roth' ? 'Roth wins' : 'Traditional wins'} by {fmt(Math.abs(results.difference))}
              </div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                {winner === 'roth'
                  ? `Your retirement tax rate (${pct(results.retireTax)}) is higher than your current rate (${pct(results.currentTax)}), making Roth more advantageous.`
                  : `Your retirement tax rate (${pct(results.retireTax)}) is lower than your current rate (${pct(results.currentTax)}), making Traditional more advantageous.`}
              </div>
            </div>
          </div>

          <div style={S.resultsGrid}>
            {[
              { label: 'Roth After-tax Value', value: fmt(results.rothAfterTax), color: '#4ADE80', hi: winner === 'roth' },
              { label: 'Traditional After-tax Value', value: fmt(results.tradAfterTax), color: '#D4AF37', hi: winner === 'trad' },
              { label: 'Difference', value: (results.difference >= 0 ? '+' : '') + fmt(results.difference), color: Math.abs(results.difference) > 0 ? '#F1F5F9' : '#64748B', hi: false },
              { label: 'Break-even Ret. Tax Rate', value: pct(Math.max(0, results.breakEvenTaxRate)), color: '#94A3B8', hi: false },
            ].map(({ label, value, color, hi }) => (
              <div key={label} style={resultCard(hi)}>
                <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={S.chartWrap}>
            <div style={S.chartTitle}>After-tax Value Over Time</div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={results.data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="year" tick={{ fill: '#64748B', fontSize: 11 }} label={{ value: 'Year', position: 'insideBottom', offset: -2, fill: '#64748B', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={v => '$' + (v >= 1000000 ? (v / 1000000).toFixed(1) + 'M' : v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)} />
                <Tooltip content={<ChartTip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94A3B8', paddingTop: 8 }} />
                <Line type="monotone" dataKey="Roth (After-tax)" stroke="#4ADE80" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="Traditional (After-tax)" stroke="#D4AF37" strokeWidth={2.5} dot={false} strokeDasharray="5 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={S.noteBox}>
            <strong style={{ color: '#94A3B8' }}>Methodology:</strong> For a fair comparison, the Traditional contribution is grossed up to the pre-tax equivalent of the same out-of-pocket Roth contribution (Roth contrib / (1 - current tax rate)). Roth grows and withdraws tax-free. Traditional value is shown after applying the retirement tax rate. Assumes contributions made at end of each year. Does not account for income limits, 10% early withdrawal penalties, required minimum distributions, or state taxes.
          </div>
        </>
      )}
    </div>
  );
}
