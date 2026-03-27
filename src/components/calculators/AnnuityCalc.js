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

const FREQ_PERIODS = { Monthly: 12, Quarterly: 4, Annually: 1 };

const DEFAULTS = { principal: '', annualRate: '', years: '', frequency: 'Monthly', annuityType: 'fixed', growthRate: '' };

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: '#131d35', border: '1px solid #1E293B', borderRadius: 8, padding: '10px 14px' }}>
      <p style={{ color: '#94A3B8', fontSize: 12, marginBottom: 6 }}>Year {label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.fill || p.color, fontSize: 12, margin: '2px 0' }}>{p.name}: {fmt(p.value)}</p>
      ))}
    </div>
  );
};

export default function AnnuityCalc() {
  const [form, setForm] = useState(DEFAULTS);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const calculate = () => {
    setError('');
    const PV        = parseFloat(form.principal);
    const annRate   = parseFloat(form.annualRate) / 100;
    const years     = parseInt(form.years, 10);
    const periodsPerYear = FREQ_PERIODS[form.frequency] || 12;
    const growthRate = parseFloat(form.growthRate) / 100 || 0;

    if (isNaN(PV) || PV <= 0) { setError('Please enter a valid principal amount.'); return; }
    if (isNaN(annRate) || annRate < 0) { setError('Please enter a valid annual return rate.'); return; }
    if (isNaN(years) || years <= 0 || years > 50) { setError('Years of payout must be between 1 and 50.'); return; }

    const r = annRate / periodsPerYear;  // periodic rate
    const n = years * periodsPerYear;    // total periods

    let periodicPMT = 0;
    if (form.annuityType === 'fixed') {
      // PMT = PV * r / (1 - (1+r)^-n)
      if (r === 0) {
        periodicPMT = PV / n;
      } else {
        periodicPMT = PV * r / (1 - Math.pow(1 + r, -n));
      }
    } else {
      // Growing annuity: first payment PMT1 such that PV = PMT1 / (r - g) * (1 - ((1+g)/(1+r))^n)
      // where g = growthRate/periodsPerYear
      const g = growthRate / periodsPerYear;
      if (Math.abs(r - g) < 1e-10) {
        periodicPMT = PV * r / n;
      } else {
        periodicPMT = PV * (r - g) / (1 - Math.pow((1 + g) / (1 + r), n));
      }
    }

    const totalReceived = periodicPMT * n; // approximate for fixed; for growing it varies
    let actualTotalReceived = 0;
    if (form.annuityType === 'growing') {
      const g = growthRate / periodsPerYear;
      for (let i = 0; i < n; i++) {
        actualTotalReceived += periodicPMT * Math.pow(1 + g, i);
      }
    } else {
      actualTotalReceived = totalReceived;
    }

    // If kept invested: FV = PV * (1+r)^n
    const investedFV = PV * Math.pow(1 + annRate, years);

    // Build yearly chart data
    const chartData = [];
    let cumAnnuity = 0;
    const g = growthRate / periodsPerYear;
    for (let y = 1; y <= years; y++) {
      // Cumulative annuity payments through year y
      const periods = y * periodsPerYear;
      if (form.annuityType === 'fixed') {
        cumAnnuity = periodicPMT * periods;
      } else {
        cumAnnuity = 0;
        for (let i = 0; i < periods; i++) cumAnnuity += periodicPMT * Math.pow(1 + g, i);
      }
      const investValue = PV * Math.pow(1 + annRate, y);
      chartData.push({ year: y, 'Cumulative Annuity': Math.round(cumAnnuity), 'Investment Value': Math.round(investValue) });
    }

    setResults({ periodicPMT, actualTotalReceived, investedFV, periodsPerYear, years, chartData, annuityType: form.annuityType, frequency: form.frequency });
  };

  const reset = () => { setForm(DEFAULTS); setResults(null); setError(''); };

  return (
    <div style={S.wrap}>
      <div style={S.title}>Annuity Calculator</div>
      <div style={S.sub}>Calculate periodic payout amounts and compare annuity vs. staying invested</div>

      <div style={S.grid}>
        <div style={S.card}>
          <label style={S.label}>Principal / Lump Sum ($)</label>
          <input style={S.input} type="number" min="0" placeholder="e.g. 500000" value={form.principal} onChange={e => set('principal', e.target.value)} />
        </div>
        <div style={S.card}>
          <label style={S.label}>Annual Return Rate (%)</label>
          <input style={S.input} type="number" min="0" max="30" step="0.1" placeholder="e.g. 5" value={form.annualRate} onChange={e => set('annualRate', e.target.value)} />
        </div>
        <div style={S.card}>
          <label style={S.label}>Years of Payout</label>
          <input style={S.input} type="number" min="1" max="50" placeholder="e.g. 20" value={form.years} onChange={e => set('years', e.target.value)} />
        </div>
        <div style={S.card}>
          <label style={S.label}>Payout Frequency</label>
          <select style={S.input} value={form.frequency} onChange={e => set('frequency', e.target.value)}>
            <option value="Monthly">Monthly</option>
            <option value="Quarterly">Quarterly</option>
            <option value="Annually">Annually</option>
          </select>
        </div>
        <div style={S.card}>
          <label style={S.label}>Annuity Type</label>
          <div style={S.toggleRow}>
            <button style={toggleBtn(form.annuityType === 'fixed')}   onClick={() => set('annuityType', 'fixed')}>Fixed</button>
            <button style={toggleBtn(form.annuityType === 'growing')} onClick={() => set('annuityType', 'growing')}>Growing</button>
          </div>
        </div>
        {form.annuityType === 'growing' && (
          <div style={S.card}>
            <label style={S.label}>Annual Growth Rate (%)</label>
            <input style={S.input} type="number" min="0" max="20" step="0.1" placeholder="e.g. 2" value={form.growthRate} onChange={e => set('growthRate', e.target.value)} />
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
            <div style={resultCard(true)}>
              <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                {results.frequency} Payout{results.annuityType === 'growing' ? ' (Initial)' : ''}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#D4AF37' }}>{fmt(results.periodicPMT)}</div>
            </div>
            <div style={resultCard(false)}>
              <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Total Received</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#4ADE80' }}>{fmt(results.actualTotalReceived)}</div>
            </div>
            <div style={resultCard(false)}>
              <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>If Kept Invested (FV)</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#94A3B8' }}>{fmt(results.investedFV)}</div>
            </div>
            <div style={resultCard(false)}>
              <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Annuity vs. Invested</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: results.actualTotalReceived >= results.investedFV ? '#4ADE80' : '#F87171' }}>
                {results.actualTotalReceived >= results.investedFV ? '+' : ''}{fmt(results.actualTotalReceived - results.investedFV)}
              </div>
            </div>
          </div>

          <div style={S.chartWrap}>
            <div style={S.chartTitle}>Cumulative Annuity Payments vs. Investment Value Over Time</div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={results.chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="year" tick={{ fill: '#64748B', fontSize: 11 }} label={{ value: 'Year', position: 'insideBottom', offset: -2, fill: '#64748B', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={v => '$' + (v >= 1000000 ? (v / 1000000).toFixed(1) + 'M' : v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)} />
                <Tooltip content={<ChartTip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94A3B8', paddingTop: 8 }} />
                <Bar dataKey="Cumulative Annuity" fill="#D4AF37" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Investment Value" fill="#4ADE80" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={S.noteBox}>
            <strong style={{ color: '#94A3B8' }}>Formula:</strong> Fixed annuity uses PMT = PV × r / (1 − (1+r)^−n) where r is the periodic rate and n is total periods. Growing annuity uses the present value of a growing annuity formula. The "Investment Value" bar shows what the lump sum would grow to if kept invested at the same rate — useful for comparing opportunity cost. Taxes, fees, and surrender charges are not included.
          </div>
        </>
      )}
    </div>
  );
}
