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
};

const resultCard = (highlight, borderColor) => ({
  background: '#131d35',
  border: `1px solid ${borderColor || (highlight ? '#D4AF37' : '#1E293B')}`,
  borderRadius: 12, padding: 16, textAlign: 'center',
});

const fmt = (n) => '$' + Math.round(n).toLocaleString();

const DEFAULTS = { childAge: '', collegeAge: '18', currentSavings: '', monthlyContrib: '', returnRate: '6', annualCost: '', costInflation: '5' };

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: '#131d35', border: '1px solid #1E293B', borderRadius: 8, padding: '10px 14px' }}>
      <p style={{ color: '#94A3B8', fontSize: 12, marginBottom: 6 }}>Year {label} (Age {label})</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontSize: 12, margin: '2px 0' }}>{p.name}: {fmt(p.value)}</p>
      ))}
    </div>
  );
};

export default function CollegeSavingsCalc() {
  const [form, setForm] = useState(DEFAULTS);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const calculate = () => {
    setError('');
    const childAge     = parseInt(form.childAge, 10);
    const collegeAge   = parseInt(form.collegeAge, 10);
    const currentSav   = parseFloat(form.currentSavings) || 0;
    const monthlyC     = parseFloat(form.monthlyContrib) || 0;
    const returnRate   = parseFloat(form.returnRate) / 100;
    const annualCost   = parseFloat(form.annualCost);
    const costInflation = parseFloat(form.costInflation) / 100;

    if (isNaN(childAge) || childAge < 0 || childAge > 17) { setError('Child age must be 0–17.'); return; }
    if (isNaN(collegeAge) || collegeAge <= childAge) { setError('College start age must be greater than current age.'); return; }
    if (isNaN(annualCost) || annualCost <= 0) { setError('Please enter a valid annual college cost.'); return; }

    const yearsToCollege = collegeAge - childAge;
    const monthlyReturn  = returnRate / 12;
    const monthlyContrib = monthlyC;

    // Project savings month by month
    const data = [];
    // eslint-disable-next-line no-unused-vars
    let savings = currentSav;

    // Also track projected cost curve (starting at collegeAge)
    // We'll build yearly snapshots for the chart
    for (let y = 0; y <= yearsToCollege; y++) {
      const age = childAge + y;
      // Savings at this point in time (we'll compute yearly)
      let sav = currentSav;
      for (let m = 0; m < y * 12; m++) {
        sav = (sav + monthlyContrib) * (1 + monthlyReturn);
      }
      // Projected cost at college start (inflated from now, lump-sum 4-year total if at collegeAge)
      // eslint-disable-next-line no-unused-vars
      const yearsUntilCollege = collegeAge - age;
      // eslint-disable-next-line no-unused-vars
      const firstYrCostAtStart = annualCost * Math.pow(1 + costInflation, yearsToCollege);
      const totalCostAtStart   = [0, 1, 2, 3].reduce((acc, i) => acc + annualCost * Math.pow(1 + costInflation, yearsToCollege + i), 0);

      data.push({
        age,
        'Projected Savings': Math.round(sav),
        'Projected Cost (4yr)': age === collegeAge ? Math.round(totalCostAtStart) : null,
      });
    }

    // Final savings at college
    let finalSavings = currentSav;
    for (let m = 0; m < yearsToCollege * 12; m++) {
      finalSavings = (finalSavings + monthlyContrib) * (1 + monthlyReturn);
    }

    // Total 4-year cost inflated
    const totalCost4Yr = [0, 1, 2, 3].reduce((acc, i) => acc + annualCost * Math.pow(1 + costInflation, yearsToCollege + i), 0);
    const gap = finalSavings - totalCost4Yr;

    // Monthly contribution needed to fully fund
    // FV = PV*(1+r)^n + PMT * [((1+r)^n - 1)/r]  (monthly)
    const n = yearsToCollege * 12;
    const r = monthlyReturn;
    let neededMonthly = 0;
    if (n > 0 && r > 0) {
      const fvFromCurrent = currentSav * Math.pow(1 + r, n);
      const remaining = totalCost4Yr - fvFromCurrent;
      neededMonthly = remaining > 0 ? remaining / ((Math.pow(1 + r, n) - 1) / r) : 0;
    } else if (n > 0) {
      neededMonthly = Math.max(0, (totalCost4Yr - currentSav)) / n;
    }

    // Build chart data with savings curve and cost milestone
    const chartData = data.map(d => ({ ...d }));

    setResults({ finalSavings, totalCost4Yr, gap, neededMonthly, yearsToCollege, annualCost, costInflation: costInflation * 100, chartData });
  };

  const reset = () => { setForm(DEFAULTS); setResults(null); setError(''); };

  const surplus = results && results.gap >= 0;

  return (
    <div style={S.wrap}>
      <div style={S.title}>College Savings Calculator (529)</div>
      <div style={S.sub}>Project your 529 savings against future college costs to find your funding gap</div>

      <div style={S.grid}>
        <div style={S.card}>
          <label style={S.label}>Child's Current Age</label>
          <input style={S.input} type="number" min="0" max="17" placeholder="e.g. 5" value={form.childAge} onChange={e => set('childAge', e.target.value)} />
        </div>
        <div style={S.card}>
          <label style={S.label}>College Start Age</label>
          <input style={S.input} type="number" min="14" max="25" placeholder="e.g. 18" value={form.collegeAge} onChange={e => set('collegeAge', e.target.value)} />
        </div>
        <div style={S.card}>
          <label style={S.label}>Current Savings ($)</label>
          <input style={S.input} type="number" min="0" placeholder="e.g. 10000" value={form.currentSavings} onChange={e => set('currentSavings', e.target.value)} />
        </div>
        <div style={S.card}>
          <label style={S.label}>Monthly Contribution ($)</label>
          <input style={S.input} type="number" min="0" placeholder="e.g. 300" value={form.monthlyContrib} onChange={e => set('monthlyContrib', e.target.value)} />
        </div>
        <div style={S.card}>
          <label style={S.label}>Expected Annual Return (%)</label>
          <input style={S.input} type="number" min="0" max="20" step="0.1" placeholder="e.g. 6" value={form.returnRate} onChange={e => set('returnRate', e.target.value)} />
        </div>
        <div style={S.card}>
          <label style={S.label}>Expected Annual College Cost ($)</label>
          <input style={S.input} type="number" min="0" placeholder="e.g. 30000" value={form.annualCost} onChange={e => set('annualCost', e.target.value)} />
        </div>
        <div style={S.card}>
          <label style={S.label}>Annual Cost Inflation Rate (%)</label>
          <input style={S.input} type="number" min="0" max="15" step="0.1" placeholder="e.g. 5" value={form.costInflation} onChange={e => set('costInflation', e.target.value)} />
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
              <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Projected Savings</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#4ADE80' }}>{fmt(results.finalSavings)}</div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>at college start</div>
            </div>
            <div style={resultCard(false)}>
              <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Total Projected Cost</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#F87171' }}>{fmt(results.totalCost4Yr)}</div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>4 years, inflation-adjusted</div>
            </div>
            <div style={resultCard(surplus, surplus ? '#4ADE80' : '#F87171')}>
              <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{surplus ? 'Surplus' : 'Funding Gap'}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: surplus ? '#4ADE80' : '#F87171' }}>{surplus ? '+' : ''}{fmt(results.gap)}</div>
            </div>
            <div style={resultCard(true)}>
              <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Monthly Needed to Fully Fund</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#D4AF37' }}>{fmt(results.neededMonthly)}</div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>per month</div>
            </div>
          </div>

          <div style={S.chartWrap}>
            <div style={S.chartTitle}>Projected Savings Growth ({results.yearsToCollege} years)</div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={results.chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="age" tick={{ fill: '#64748B', fontSize: 11 }} label={{ value: "Child's Age", position: 'insideBottom', offset: -2, fill: '#64748B', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={v => '$' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)} />
                <Tooltip content={<ChartTip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94A3B8', paddingTop: 8 }} />
                <Line type="monotone" dataKey="Projected Savings" stroke="#4ADE80" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <div style={{ marginTop: 12, background: '#0A1020', borderRadius: 8, padding: '10px 14px', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 12 }}>
                <span style={{ color: '#64748B' }}>4-Year Cost at College Start: </span>
                <span style={{ color: '#F87171', fontWeight: 700 }}>{fmt(results.totalCost4Yr)}</span>
                <span style={{ color: '#64748B' }}> ({results.costInflation.toFixed(1)}% annual inflation)</span>
              </div>
            </div>
          </div>

          <div style={S.noteBox}>
            <strong style={{ color: '#94A3B8' }}>Note:</strong> Projections assume constant monthly contributions and a fixed annual return. 529 withdrawals are tax-free for qualified education expenses. Actual costs vary by institution. Financial aid, scholarships, and other savings sources are not included. Consult a financial advisor for personalized college planning.
          </div>
        </>
      )}
    </div>
  );
}
