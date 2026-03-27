import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const S = {
  wrap: { padding: 24, color: '#F1F5F9', maxWidth: 900, margin: '0 auto' },
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
  infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginBottom: 16 },
};

const resultCard = (highlight) => ({
  background: '#131d35', border: `1px solid ${highlight ? '#D4AF37' : '#1E293B'}`,
  borderRadius: 12, padding: 16, textAlign: 'center',
});

const fmt = (n) => '$' + Math.round(n).toLocaleString();

// Calculates the adjusted monthly benefit given FRA benefit, FRA age, and claiming age
function calcAdjustedBenefit(fraMonthly, fraAge, claimAge) {
  const monthsEarly = Math.max(0, (fraAge - claimAge) * 12);
  const monthsLate  = Math.max(0, (claimAge - fraAge) * 12);

  if (monthsEarly > 0) {
    const first36 = Math.min(monthsEarly, 36);
    const beyond  = Math.max(0, monthsEarly - 36);
    const reduction = (first36 * (5 / 9) + beyond * (5 / 12)) / 100;
    return fraMonthly * (1 - reduction);
  }
  if (monthsLate > 0) {
    const increase = (monthsLate / 12) * 0.08;
    return fraMonthly * (1 + increase);
  }
  return fraMonthly;
}

const DEFAULTS = { currentAge: '', fra: '67', fraMonthly: '', claimAge: '67' };

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: '#131d35', border: '1px solid #1E293B', borderRadius: 8, padding: '10px 14px' }}>
      <p style={{ color: '#94A3B8', fontSize: 12, marginBottom: 6 }}>Age {label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontSize: 12, margin: '2px 0' }}>{p.name}: {fmt(p.value)}</p>
      ))}
    </div>
  );
};

export default function SocialSecurityCalc() {
  const [form, setForm] = useState(DEFAULTS);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const calculate = () => {
    setError('');
    const currentAge = parseFloat(form.currentAge);
    const fra        = parseFloat(form.fra);
    const fraMonthly = parseFloat(form.fraMonthly);
    const claimAge   = parseFloat(form.claimAge);

    if (isNaN(currentAge) || currentAge < 40 || currentAge > 85) { setError('Current age must be between 40 and 85.'); return; }
    if (isNaN(fraMonthly) || fraMonthly <= 0) { setError('Please enter a valid monthly benefit at FRA.'); return; }
    if (claimAge < 62 || claimAge > 70) { setError('Claiming age must be between 62 and 70.'); return; }

    const benefit62  = calcAdjustedBenefit(fraMonthly, fra, 62);
    const benefitFRA = fraMonthly;
    const benefit70  = calcAdjustedBenefit(fraMonthly, fra, 70);
    const adjustedBenefit = calcAdjustedBenefit(fraMonthly, fra, claimAge);

    // Cumulative lifetime benefits from each claiming age up to age 90
    const cumulativeData = [];
    for (let age = 55; age <= 90; age++) {
      const cum62  = age >= 62 ? (age - 62) * 12 * benefit62 : 0;
      const cumFRA = age >= fra ? (age - fra) * 12 * benefitFRA : 0;
      const cum70  = age >= 70 ? (age - 70) * 12 * benefit70 : 0;
      cumulativeData.push({ age, 'Claim at 62': Math.round(cum62), [`Claim at ${fra}`]: Math.round(cumFRA), 'Claim at 70': Math.round(cum70) });
    }

    // Break-even vs FRA
    let breakEvenFRA = null;
    for (let age = claimAge; age <= 100; age += 0.1) {
      const cumClaim = (age - claimAge) * 12 * adjustedBenefit;
      const cumFRA   = age >= fra ? (age - fra) * 12 * benefitFRA : 0;
      if (claimAge < fra && cumClaim >= cumFRA) { breakEvenFRA = Math.round(age * 10) / 10; break; }
      if (claimAge > fra && cumFRA >= cumClaim) { breakEvenFRA = null; break; }
    }

    let breakEven70 = null;
    if (claimAge < 70) {
      for (let age = 70; age <= 100; age += 0.1) {
        const cumClaim = (age - claimAge) * 12 * adjustedBenefit;
        const cum70    = age >= 70 ? (age - 70) * 12 * benefit70 : 0;
        if (cumClaim <= cum70 && age >= 70) { breakEven70 = Math.round(age * 10) / 10; break; }
      }
    }

    setResults({ adjustedBenefit, annualBenefit: adjustedBenefit * 12, benefit62, benefitFRA, benefit70, breakEvenFRA, breakEven70, cumulativeData, fra, claimAge });
  };

  const reset = () => { setForm(DEFAULTS); setResults(null); setError(''); };

  const chartKeys = results ? ['Claim at 62', `Claim at ${results.fra}`, 'Claim at 70'] : [];
  const lineColors = ['#F87171', '#D4AF37', '#4ADE80'];

  return (
    <div style={S.wrap}>
      <div style={S.title}>Social Security Claiming Strategy Calculator</div>
      <div style={S.sub}>Compare early, on-time, and delayed claiming to find your optimal strategy</div>

      <div style={S.grid}>
        <div style={S.card}>
          <label style={S.label}>Current Age</label>
          <input style={S.input} type="number" min="40" max="85" placeholder="e.g. 58" value={form.currentAge} onChange={e => set('currentAge', e.target.value)} />
        </div>
        <div style={S.card}>
          <label style={S.label}>Full Retirement Age (FRA)</label>
          <select style={S.input} value={form.fra} onChange={e => set('fra', e.target.value)}>
            <option value="66">66</option>
            <option value="66.5">66 &amp; 6 months</option>
            <option value="67">67 (born 1960+)</option>
          </select>
        </div>
        <div style={S.card}>
          <label style={S.label}>Monthly Benefit at FRA ($)</label>
          <input style={S.input} type="number" min="0" placeholder="e.g. 2000" value={form.fraMonthly} onChange={e => set('fraMonthly', e.target.value)} />
        </div>
        <div style={S.card}>
          <label style={S.label}>Planned Claiming Age</label>
          <input style={S.input} type="number" min="62" max="70" step="1" placeholder="62–70" value={form.claimAge} onChange={e => set('claimAge', e.target.value)} />
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
            {[
              { label: `Adjusted Monthly Benefit (Age ${results.claimAge})`, value: fmt(results.adjustedBenefit), color: '#D4AF37', hi: true },
              { label: 'Annual Benefit', value: fmt(results.annualBenefit), color: '#4ADE80', hi: false },
              { label: 'Benefit at 62', value: fmt(results.benefit62), color: '#F87171', hi: false },
              { label: 'Benefit at 70', value: fmt(results.benefit70), color: '#4ADE80', hi: false },
            ].map(({ label, value, color, hi }) => (
              <div key={label} style={resultCard(hi)}>
                <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={S.infoGrid}>
            <div style={{ background: '#131d35', border: '1px solid #1E293B', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Break-even vs FRA</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#F1F5F9' }}>
                {results.claimAge < parseFloat(form.fra)
                  ? results.breakEvenFRA ? `Age ${results.breakEvenFRA}` : 'After age 90'
                  : 'N/A (claiming after FRA)'}
              </div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>Age when cumulative benefits equal FRA claiming</div>
            </div>
            <div style={{ background: '#131d35', border: '1px solid #1E293B', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Break-even vs Age 70</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#F1F5F9' }}>
                {results.claimAge < 70
                  ? results.breakEven70 ? `Age ${results.breakEven70}` : 'After age 90'
                  : 'N/A (claiming at 70)'}
              </div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>Age when claiming at 70 overtakes your strategy</div>
            </div>
          </div>

          <div style={S.chartWrap}>
            <div style={S.chartTitle}>Cumulative Lifetime Benefits by Claiming Age</div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={results.cumulativeData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="age" tick={{ fill: '#64748B', fontSize: 11 }} label={{ value: 'Age', position: 'insideBottom', offset: -2, fill: '#64748B', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={v => '$' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)} />
                <Tooltip content={<ChartTip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94A3B8', paddingTop: 8 }} />
                {chartKeys.map((k, i) => (
                  <Line key={k} type="monotone" dataKey={k} stroke={lineColors[i]} strokeWidth={2} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={S.noteBox}>
            <strong style={{ color: '#94A3B8' }}>Note:</strong> Early claiming reduces benefits 5/9% per month for first 36 months and 5/12% beyond. Delayed claiming increases benefits 8%/year from FRA up to age 70. This does not account for COLAs, taxes on benefits, spousal benefits, or earnings test. Consult SSA.gov or a financial planner for personalized advice.
          </div>
        </>
      )}
    </div>
  );
}
