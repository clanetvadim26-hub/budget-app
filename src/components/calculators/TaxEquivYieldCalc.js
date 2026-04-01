import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';

const S = {
  wrap: { padding: 24, color: '#F1F5F9', maxWidth: 860, margin: '0 auto' },
  title: { fontSize: 22, fontWeight: 700, color: '#F1F5F9', marginBottom: 4 },
  sub: { fontSize: 13, color: '#64748B', marginBottom: 24 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 },
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
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #1E293B', color: '#64748B', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' },
  td: { padding: '8px 12px', borderBottom: '1px solid #1E293B', color: '#F1F5F9' },
};

const resultCard = (highlight) => ({
  background: '#131d35', border: `1px solid ${highlight ? '#D4AF37' : '#1E293B'}`,
  borderRadius: 12, padding: 16, textAlign: 'center',
});

const pct = (n) => n.toFixed(2) + '%';

// 2026 federal tax brackets (marginal rates for bracket selection)
const FEDERAL_BRACKETS = [
  { label: '10% — $0–$12,075 (Single)', rate: 10 },
  { label: '12% — $12,075–$49,050 (Single)', rate: 12 },
  { label: '22% — $49,050–$99,575 (Single)', rate: 22 },
  { label: '24% — $99,575–$195,250 (Single)', rate: 24 },
  { label: '32% — $195,250–$276,850 (Single)', rate: 32 },
  { label: '35% — $276,850–$346,875 (Single)', rate: 35 },
  { label: '37% — Over $346,875 (Single)', rate: 37 },
];

const ALL_BRACKETS = [10, 12, 22, 24, 32, 35, 37];
const BRACKET_COLORS = ['#4ADE80', '#86EFAC', '#FDE68A', '#FBBF24', '#F97316', '#EF4444', '#DC2626'];

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: '#131d35', border: '1px solid #1E293B', borderRadius: 8, padding: '10px 14px' }}>
      <p style={{ color: '#94A3B8', fontSize: 12, marginBottom: 4 }}>{label}% bracket</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.fill || p.color, fontSize: 12, margin: '2px 0' }}>
          {p.name}: {pct(p.value)}
        </p>
      ))}
    </div>
  );
};

const DEFAULTS = { taxExemptYield: '', federalRate: '22', stateRate: '5' };

export default function TaxEquivYieldCalc() {
  const [form, setForm] = useState(DEFAULTS);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const calcTEY = (yieldPct, fedRate, stateRate) => {
    const combinedRate = fedRate + stateRate * (1 - fedRate / 100); // state deductible at fed level
    return yieldPct / (1 - combinedRate / 100);
  };

  const calculate = () => {
    setError('');
    const yld = parseFloat(form.taxExemptYield);
    const fedRate = parseFloat(form.federalRate);
    const stateRate = parseFloat(form.stateRate) || 0;

    if (isNaN(yld) || yld < 0 || yld > 100) {
      setError('Please enter a valid tax-exempt yield between 0 and 100%.');
      return;
    }

    const combinedRate = fedRate + stateRate * (1 - fedRate / 100);
    const tey = calcTEY(yld, fedRate, stateRate);
    const taxSavingsPer10k = (tey - yld) / 100 * 10000;

    // Table across all brackets
    const bracketTable = ALL_BRACKETS.map((br) => ({
      bracket: br,
      tey: calcTEY(yld, br, stateRate),
      combinedRate: br + stateRate * (1 - br / 100),
    }));

    // Chart data — TEY vs yield at each bracket
    const chartData = ALL_BRACKETS.map((br, i) => ({
      bracket: br,
      'Tax-Exempt Yield': parseFloat(yld.toFixed(2)),
      'Tax-Equiv. Yield': parseFloat(calcTEY(yld, br, stateRate).toFixed(2)),
      color: BRACKET_COLORS[i],
    }));

    setResults({ yld, fedRate, stateRate, combinedRate, tey, taxSavingsPer10k, bracketTable, chartData });
  };

  const reset = () => { setForm(DEFAULTS); setResults(null); setError(''); };

  return (
    <div style={S.wrap}>
      <div style={S.title}>Tax-Equivalent Yield Calculator</div>
      <div style={S.sub}>Find the taxable yield needed to match a tax-exempt bond's return — based on 2026 federal brackets</div>

      <div style={S.grid}>
        <div style={S.card}>
          <label style={S.label}>Tax-Exempt Yield (%)</label>
          <input style={S.input} type="number" min="0" max="100" step="0.01" placeholder="e.g. 3.5" value={form.taxExemptYield} onChange={e => set('taxExemptYield', e.target.value)} />
          <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>Enter the yield on a muni bond or other tax-exempt instrument</div>
        </div>
        <div style={S.card}>
          <label style={S.label}>Federal Tax Bracket (2026)</label>
          <select style={S.input} value={form.federalRate} onChange={e => set('federalRate', e.target.value)}>
            {FEDERAL_BRACKETS.map(b => (
              <option key={b.rate} value={b.rate}>{b.label}</option>
            ))}
          </select>
        </div>
        <div style={S.card}>
          <label style={S.label}>State Income Tax Rate (%)</label>
          <input style={S.input} type="number" min="0" max="20" step="0.1" placeholder="e.g. 5" value={form.stateRate} onChange={e => set('stateRate', e.target.value)} />
          <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>Enter 0 if your state has no income tax</div>
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
              <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Tax-Exempt Yield</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#60A5FA' }}>{pct(results.yld)}</div>
            </div>
            <div style={resultCard(true)}>
              <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Tax-Equiv. Yield</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#D4AF37' }}>{pct(results.tey)}</div>
            </div>
            <div style={resultCard(false)}>
              <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Combined Tax Rate</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#F87171' }}>{pct(results.combinedRate)}</div>
            </div>
            <div style={resultCard(false)}>
              <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Tax Savings per $10k</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#4ADE80' }}>
                ${Math.round(results.taxSavingsPer10k).toLocaleString()}/yr
              </div>
            </div>
          </div>

          <div style={S.chartWrap}>
            <div style={S.chartTitle}>Tax-Equivalent Yield Across All 2026 Brackets</div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={results.chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="bracket" tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={v => v + '%'} />
                <YAxis tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={v => v + '%'} domain={[0, 'auto']} />
                <Tooltip content={<ChartTip />} />
                <ReferenceLine y={results.yld} stroke="#60A5FA" strokeDasharray="4 4"
                  label={{ value: 'Tax-Exempt', position: 'right', fill: '#60A5FA', fontSize: 10 }} />
                <Bar dataKey="Tax-Equiv. Yield" radius={[4, 4, 0, 0]}>
                  {results.chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.bracket === results.fedRate ? '#D4AF37' : BRACKET_COLORS[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>Gold bar = your selected bracket. Blue dashed line = tax-exempt yield.</div>
          </div>

          <div style={{ ...S.chartWrap, padding: '0 0 16px 0', overflow: 'hidden' }}>
            <div style={{ ...S.chartTitle, padding: '20px 20px 0 20px' }}>TEY at Each Federal Bracket (State: {pct(results.stateRate)})</div>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Federal Bracket</th>
                  <th style={S.th}>Combined Rate</th>
                  <th style={S.th}>Tax-Equiv. Yield</th>
                  <th style={S.th}>vs Tax-Exempt</th>
                </tr>
              </thead>
              <tbody>
                {results.bracketTable.map((row, i) => {
                  const isSelected = row.bracket === results.fedRate;
                  const diff = row.tey - results.yld;
                  return (
                    <tr key={row.bracket} style={isSelected ? { background: '#1a1a0a' } : {}}>
                      <td style={{ ...S.td }}>
                        <span style={{ color: BRACKET_COLORS[i], fontWeight: isSelected ? 700 : 400 }}>
                          {row.bracket}%{isSelected ? ' ← your bracket' : ''}
                        </span>
                      </td>
                      <td style={S.td}>{pct(row.combinedRate)}</td>
                      <td style={{ ...S.td, color: '#D4AF37', fontWeight: isSelected ? 700 : 400 }}>{pct(row.tey)}</td>
                      <td style={{ ...S.td, color: '#4ADE80' }}>+{pct(diff)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={S.noteBox}>
            <strong style={{ color: '#94A3B8' }}>Formula:</strong> TEY = Tax-Exempt Yield ÷ (1 − Combined Rate)
            &nbsp;|&nbsp; Combined Rate = Federal Rate + State Rate × (1 − Federal Rate) &nbsp;
            (state tax is deductible for federal purposes if you itemize).
            <br /><br />
            A {pct(results.yld)} muni bond is equivalent to a {pct(results.tey)} taxable bond in the {results.fedRate}% federal bracket.
            If you can find a high-quality taxable bond above {pct(results.tey)}, it may be more tax-efficient in a tax-advantaged account.
          </div>
        </>
      )}
    </div>
  );
}
