import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const inp = { background: '#0A1020', border: '1px solid #1E293B', color: '#F1F5F9', borderRadius: 8, padding: '10px 12px', width: '100%', boxSizing: 'border-box', fontSize: 14 };
const lbl = { fontSize: 12, color: '#64748B', display: 'block', marginBottom: 4 };
const card = { background: '#131d35', border: '1px solid #1E293B', borderRadius: 12, padding: 16 };
const calcBtn = { background: '#D4AF37', color: '#0A0F1E', fontWeight: 700, border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, cursor: 'pointer' };
const resetBtn = { background: 'transparent', border: '1px solid #334155', color: '#94A3B8', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontSize: 14 };

const fmt = (v) => {
  if (v >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B';
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
  if (v >= 1000) return '$' + (v / 1000).toFixed(1) + 'K';
  return '$' + Math.round(Math.abs(v)).toLocaleString();
};

const FEDERAL_EXEMPTION = 13610000; // 2024

const calcFederalTax = (taxableEstate) => {
  if (taxableEstate <= 0) return 0;
  // Progressive federal estate tax rates (2024)
  const brackets = [
    [10000, 0.18], [20000, 0.20], [40000, 0.22], [60000, 0.24],
    [80000, 0.26], [100000, 0.28], [150000, 0.30], [250000, 0.32],
    [500000, 0.34], [750000, 0.37], [1000000, 0.39], [Infinity, 0.40],
  ];
  let tax = 0, remaining = taxableEstate;
  let prev = 0;
  for (const [limit, rate] of brackets) {
    if (remaining <= 0) break;
    const chunk = Math.min(remaining, limit - prev);
    tax += chunk * rate;
    remaining -= chunk;
    prev = limit;
    if (limit === Infinity) tax += remaining * rate;
  }
  return Math.max(tax, 0);
};

const STATE_CONFIG = {
  none: { label: 'No State Estate Tax', exemption: Infinity, rate: 0 },
  low: { label: 'Low Threshold State (~$1M exempt, ~10%)', exemption: 1000000, rate: 0.10 },
  high: { label: 'High Threshold State (~$2M exempt, ~16%)', exemption: 2000000, rate: 0.16 },
};

export default function EstateCalc() {
  const [grossEstate, setGrossEstate] = useState('');
  const [debts, setDebts] = useState('');
  const [charitable, setCharitable] = useState('');
  const [maritalDeduction, setMaritalDeduction] = useState('');
  const [stateType, setStateType] = useState('none');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const gross = parseFloat(grossEstate) || 0;
    const debtVal = parseFloat(debts) || 0;
    const charity = parseFloat(charitable) || 0;
    const marital = parseFloat(maritalDeduction) || 0;

    const totalDeductions = debtVal + charity + marital;
    const adjustedEstate = Math.max(gross - totalDeductions, 0);

    // Federal
    const federalTaxableEstate = Math.max(adjustedEstate - FEDERAL_EXEMPTION, 0);
    const federalTax = calcFederalTax(federalTaxableEstate);

    // State
    const stateCfg = STATE_CONFIG[stateType];
    const stateTaxableEstate = Math.max(adjustedEstate - stateCfg.exemption, 0);
    const stateTax = stateTaxableEstate > 0 ? stateTaxableEstate * stateCfg.rate : 0;

    const totalTax = federalTax + stateTax;
    const netEstate = gross - totalTax;
    const effectiveRate = gross > 0 ? (totalTax / gross) * 100 : 0;

    const chartData = [
      { name: 'Gross Estate', value: Math.round(gross), fill: '#60A5FA' },
      { name: 'Total Deductions', value: Math.round(totalDeductions), fill: '#A78BFA' },
      { name: 'Taxable Estate', value: Math.round(adjustedEstate), fill: '#D4AF37' },
      { name: 'Federal Tax', value: Math.round(federalTax), fill: '#F87171' },
      { name: 'State Tax', value: Math.round(stateTax), fill: '#FB923C' },
      { name: 'Net Estate', value: Math.round(netEstate), fill: '#4ADE80' },
    ].filter(d => d.value > 0);

    setResult({ gross, totalDeductions, adjustedEstate, federalTaxableEstate, federalTax, stateTaxableEstate, stateTax, totalTax, netEstate, effectiveRate, chartData, stateCfg });
  };

  const reset = () => {
    setGrossEstate(''); setDebts(''); setCharitable('');
    setMaritalDeduction(''); setStateType('none'); setResult(null);
  };

  return (
    <div style={{ color: '#F1F5F9', fontFamily: 'inherit' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Estate Tax Estimator</h2>
        <p style={{ color: '#64748B', fontSize: 14, margin: 0 }}>Estimate federal and state estate tax liability (2024 exemptions)</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 20 }}>
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16 }}>Estate Value</div>
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label style={lbl}>Gross Estate Value ($)</label>
              <input style={inp} type="number" placeholder="5000000" value={grossEstate} onChange={e => setGrossEstate(e.target.value)} />
            </div>
            <div>
              <label style={lbl}>Debts & Liabilities ($)</label>
              <input style={inp} type="number" placeholder="200000" value={debts} onChange={e => setDebts(e.target.value)} />
            </div>
          </div>
        </div>

        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16 }}>Deductions</div>
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label style={lbl}>Charitable Bequests ($)</label>
              <input style={inp} type="number" placeholder="0" value={charitable} onChange={e => setCharitable(e.target.value)} />
            </div>
            <div>
              <label style={lbl}>Marital Deduction — Assets to Spouse ($)</label>
              <input style={inp} type="number" placeholder="0" value={maritalDeduction} onChange={e => setMaritalDeduction(e.target.value)} />
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>Unlimited marital deduction for U.S. citizen spouses</div>
            </div>
            <div>
              <label style={lbl}>State of Residence</label>
              <select style={inp} value={stateType} onChange={e => setStateType(e.target.value)}>
                <option value="none">No State Estate Tax (FL, TX, CA, etc.)</option>
                <option value="low">Low Threshold State (~$1M exempt, ~10%)</option>
                <option value="high">High Threshold State (~$2M exempt, ~16%)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div style={{ ...card, marginBottom: 20, background: '#0A0F1E', border: '1px solid #334155' }}>
        <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.7 }}>
          <strong style={{ color: '#D4AF37' }}>2024 Federal Exemption:</strong> $13.61M per person ($27.22M per married couple with portability).
          Estates below the exemption owe <strong style={{ color: '#4ADE80' }}>zero federal estate tax</strong>.
          The exemption is scheduled to sunset after 2025 without Congressional action.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <button onClick={calculate} style={calcBtn}>Calculate</button>
        <button onClick={reset} style={resetBtn}>Reset</button>
      </div>

      {result && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Gross Estate', value: fmt(result.gross), color: '#60A5FA' },
              { label: 'Total Deductions', value: fmt(result.totalDeductions), color: '#A78BFA' },
              { label: 'Taxable Estate (Federal)', value: fmt(result.federalTaxableEstate), color: '#D4AF37' },
              { label: 'Federal Estate Tax', value: fmt(result.federalTax), color: result.federalTax > 0 ? '#F87171' : '#4ADE80' },
              { label: 'State Estate Tax', value: fmt(result.stateTax), color: result.stateTax > 0 ? '#FB923C' : '#4ADE80' },
              { label: 'Net Estate After Tax', value: fmt(result.netEstate), color: '#4ADE80' },
              { label: 'Effective Tax Rate', value: result.effectiveRate.toFixed(2) + '%', color: result.effectiveRate > 20 ? '#F87171' : result.effectiveRate > 5 ? '#D4AF37' : '#4ADE80' },
            ].map((s, i) => (
              <div key={i} style={card}>
                <div style={{ fontSize: 12, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>{s.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {result.federalTax === 0 && result.stateTax === 0 && (
            <div style={{ ...card, marginBottom: 16, border: '1px solid #4ADE80', background: '#0a1a0a' }}>
              <div style={{ color: '#4ADE80', fontSize: 14, fontWeight: 600 }}>
                No estate tax owed! Your taxable estate is below the federal exemption{result.stateCfg.exemption !== Infinity ? ' and state threshold' : ''}.
              </div>
            </div>
          )}

          <div style={card}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#94A3B8', marginBottom: 16 }}>Estate Breakdown</div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={result.chartData} margin={{ left: 10, right: 20, top: 10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="name" stroke="#334155" tick={{ fill: '#94A3B8', fontSize: 11 }} angle={-20} textAnchor="end" interval={0} height={50} />
                <YAxis tickFormatter={v => fmt(v)} stroke="#334155" tick={{ fill: '#64748B', fontSize: 11 }} width={80} />
                <Tooltip formatter={(val) => [fmt(val)]} contentStyle={{ background: '#131d35', border: '1px solid #1E293B', borderRadius: 8 }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {result.chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ ...card, marginTop: 16, background: '#0A0F1E', border: '1px solid #334155' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#D4AF37', marginBottom: 8 }}>Planning Note</div>
            <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.7 }}>
              This is a simplified estimate. Consult an estate planning attorney for complex situations involving trusts, business interests, or life insurance policies.
              Consider irrevocable life insurance trusts (ILITs), charitable remainder trusts, and annual gifting ($18,000/recipient in 2024) to reduce taxable estate.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
