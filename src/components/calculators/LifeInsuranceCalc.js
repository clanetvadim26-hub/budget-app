import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const inp = { background: '#0A1020', border: '1px solid #1E293B', color: '#F1F5F9', borderRadius: 8, padding: '10px 12px', width: '100%', boxSizing: 'border-box', fontSize: 14 };
const lbl = { fontSize: 12, color: '#64748B', display: 'block', marginBottom: 4 };
const card = { background: '#131d35', border: '1px solid #1E293B', borderRadius: 12, padding: 16 };
const calcBtn = { background: '#D4AF37', color: '#0A0F1E', fontWeight: 700, border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, cursor: 'pointer' };
const resetBtn = { background: 'transparent', border: '1px solid #334155', color: '#94A3B8', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontSize: 14 };

const fmt = (v) => {
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
  if (v >= 1000) return '$' + (v / 1000).toFixed(1) + 'K';
  return '$' + Math.round(v).toLocaleString();
};

export default function LifeInsuranceCalc() {
  const [annualIncome, setAnnualIncome] = useState('');
  const [yearsReplacement, setYearsReplacement] = useState('10');
  const [outstandingDebts, setOutstandingDebts] = useState('');
  const [mortgageBalance, setMortgageBalance] = useState('');
  const [educationPerChild, setEducationPerChild] = useState('');
  const [numChildren, setNumChildren] = useState('');
  const [existingInsurance, setExistingInsurance] = useState('');
  const [liquidAssets, setLiquidAssets] = useState('');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const income = parseFloat(annualIncome) || 0;
    const years = parseFloat(yearsReplacement) || 10;
    const debt = parseFloat(outstandingDebts) || 0;
    const mortgage = parseFloat(mortgageBalance) || 0;
    const eduPerChild = parseFloat(educationPerChild) || 0;
    const children = parseFloat(numChildren) || 0;
    const existing = parseFloat(existingInsurance) || 0;
    const liquid = parseFloat(liquidAssets) || 0;

    // DIME formula
    const D = debt;
    const I = income * years;
    const M = mortgage;
    const E = eduPerChild * children;

    const dimeTotal = D + I + M + E;
    const netCoverage = Math.max(dimeTotal - existing - liquid, 0);
    const premiumLow = netCoverage * 0.001;   // 0.1%
    const premiumHigh = netCoverage * 0.002;  // 0.2%

    const chartData = [
      { name: 'Debt (D)', value: D, fill: '#F87171' },
      { name: 'Income (I)', value: I, fill: '#60A5FA' },
      { name: 'Mortgage (M)', value: M, fill: '#A78BFA' },
      { name: 'Education (E)', value: E, fill: '#4ADE80' },
    ].filter(d => d.value > 0);

    setResult({ D, I, M, E, dimeTotal, netCoverage, premiumLow, premiumHigh, existing, liquid, chartData });
  };

  const reset = () => {
    setAnnualIncome(''); setYearsReplacement('10'); setOutstandingDebts('');
    setMortgageBalance(''); setEducationPerChild(''); setNumChildren('');
    setExistingInsurance(''); setLiquidAssets(''); setResult(null);
  };

  return (
    <div style={{ color: '#F1F5F9', fontFamily: 'inherit' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Life Insurance Calculator</h2>
        <p style={{ color: '#64748B', fontSize: 14, margin: 0 }}>DIME method — Debt + Income + Mortgage + Education</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 20 }}>
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16 }}>Coverage Needs</div>
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label style={lbl}>Annual Income ($)</label>
              <input style={inp} type="number" placeholder="80000" value={annualIncome} onChange={e => setAnnualIncome(e.target.value)} />
            </div>
            <div>
              <label style={lbl}>Years of Income to Replace</label>
              <input style={inp} type="number" placeholder="10" value={yearsReplacement} onChange={e => setYearsReplacement(e.target.value)} />
            </div>
            <div>
              <label style={lbl}>Outstanding Debts (excl. mortgage) ($)</label>
              <input style={inp} type="number" placeholder="25000" value={outstandingDebts} onChange={e => setOutstandingDebts(e.target.value)} />
            </div>
            <div>
              <label style={lbl}>Mortgage Balance ($)</label>
              <input style={inp} type="number" placeholder="300000" value={mortgageBalance} onChange={e => setMortgageBalance(e.target.value)} />
            </div>
            <div>
              <label style={lbl}>Education Fund per Child ($)</label>
              <input style={inp} type="number" placeholder="50000" value={educationPerChild} onChange={e => setEducationPerChild(e.target.value)} />
            </div>
            <div>
              <label style={lbl}>Number of Children</label>
              <input style={inp} type="number" placeholder="2" value={numChildren} onChange={e => setNumChildren(e.target.value)} />
            </div>
          </div>
        </div>

        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16 }}>Existing Resources</div>
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label style={lbl}>Existing Life Insurance ($)</label>
              <input style={inp} type="number" placeholder="100000" value={existingInsurance} onChange={e => setExistingInsurance(e.target.value)} />
            </div>
            <div>
              <label style={lbl}>Liquid Assets / Savings ($)</label>
              <input style={inp} type="number" placeholder="50000" value={liquidAssets} onChange={e => setLiquidAssets(e.target.value)} />
            </div>
          </div>

          <div style={{ marginTop: 20, padding: 14, background: '#0A0F1E', borderRadius: 8, border: '1px solid #334155' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#D4AF37', marginBottom: 8 }}>DIME Formula</div>
            <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.7 }}>
              <span style={{ color: '#F87171' }}>D</span>ebt + <span style={{ color: '#60A5FA' }}>I</span>ncome × Years + <span style={{ color: '#A78BFA' }}>M</span>ortgage + <span style={{ color: '#4ADE80' }}>E</span>ducation<br />
              Then subtract existing coverage and liquid assets.
            </div>
          </div>
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
              { label: 'Debt (D)', value: fmt(result.D), color: '#F87171' },
              { label: 'Income Replacement (I)', value: fmt(result.I), color: '#60A5FA' },
              { label: 'Mortgage (M)', value: fmt(result.M), color: '#A78BFA' },
              { label: 'Education (E)', value: fmt(result.E), color: '#4ADE80' },
              { label: 'DIME Total Coverage', value: fmt(result.dimeTotal), color: '#D4AF37' },
              { label: 'Net Coverage Needed', value: fmt(result.netCoverage), color: '#F1F5F9' },
            ].map((s, i) => (
              <div key={i} style={card}>
                <div style={{ fontSize: 12, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>{s.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div style={{ ...card, marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#94A3B8', marginBottom: 8 }}>Estimated Annual Premium (Term Life)</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#D4AF37' }}>{fmt(result.premiumLow)} – {fmt(result.premiumHigh)}<span style={{ fontSize: 16, color: '#64748B' }}>/year</span></div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 6 }}>Rough estimate of 0.1%–0.2% of net coverage. Actual rates depend on age, health, and term length.</div>
          </div>

          {result.chartData.length > 0 && (
            <div style={card}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#94A3B8', marginBottom: 16 }}>Coverage Breakdown (DIME Components)</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={[{ name: 'Coverage Needed', ...Object.fromEntries(result.chartData.map(d => [d.name, d.value])) }]} margin={{ left: 10, right: 20, top: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis dataKey="name" hide />
                  <YAxis tickFormatter={v => fmt(v)} stroke="#334155" tick={{ fill: '#64748B', fontSize: 11 }} width={80} />
                  <Tooltip formatter={(val) => [fmt(val)]} contentStyle={{ background: '#131d35', border: '1px solid #1E293B', borderRadius: 8 }} />
                  <Legend />
                  {result.chartData.map((d, i) => (
                    <Bar key={i} dataKey={d.name} stackId="a" fill={d.fill} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
