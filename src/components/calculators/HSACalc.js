import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

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

const fmtShort = (v) => {
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(1) + 'M';
  if (v >= 1000) return '$' + (v / 1000).toFixed(0) + 'K';
  return '$' + Math.round(v);
};

export default function HSACalc() {
  const [currentBalance, setCurrentBalance] = useState('');
  const [annualContribution, setAnnualContribution] = useState('');
  const [yearsToRetirement, setYearsToRetirement] = useState('');
  const [annualReturn, setAnnualReturn] = useState('7');
  const [annualMedical, setAnnualMedical] = useState('');
  const [marginalRate, setMarginalRate] = useState('22');
  const [coverageType, setCoverageType] = useState('single');
  const [result, setResult] = useState(null);

  const LIMITS = { single: 4150, family: 8300 };

  const calculate = () => {
    const balance0 = parseFloat(currentBalance) || 0;
    const contribution = parseFloat(annualContribution) || 0;
    const years = parseInt(yearsToRetirement) || 20;
    const r = (parseFloat(annualReturn) || 7) / 100;
    const medical = parseFloat(annualMedical) || 0;
    const taxRate = (parseFloat(marginalRate) || 22) / 100;

    const limit = LIMITS[coverageType];
    const effectiveContrib = Math.min(contribution, limit);
    const netContrib = Math.max(effectiveContrib - medical, 0); // amount actually invested

    const chartData = [];
    let hsaBalance = balance0;
    let taxableBalance = balance0; // equivalent if invested in taxable account (after-tax contributions)

    for (let y = 1; y <= years; y++) {
      // HSA: grows tax-free, contributions pre-tax, no tax on withdrawal for medical
      hsaBalance = (hsaBalance + netContrib) * (1 + r);

      // Taxable equivalent: after-tax contributions, returns taxed at capital gains ~15%
      const afterTaxContrib = effectiveContrib * (1 - taxRate);
      const afterMedical = Math.max(afterTaxContrib - medical * (1 - taxRate), 0);
      taxableBalance = (taxableBalance + afterMedical) * (1 + r * (1 - 0.15)); // simplified

      chartData.push({
        year: `Yr ${y}`,
        'HSA (Tax-Free)': Math.round(hsaBalance),
        'Taxable Account': Math.round(taxableBalance),
      });
    }

    const totalContributions = effectiveContrib * years;
    const taxSavingsOnContribs = totalContributions * taxRate;
    const finalHSA = chartData[chartData.length - 1]?.['HSA (Tax-Free)'] || 0;
    const finalTaxable = chartData[chartData.length - 1]?.['Taxable Account'] || 0;
    const hsaAdvantage = finalHSA - finalTaxable;

    const annualTaxSavings = effectiveContrib * taxRate;

    setResult({ chartData, finalHSA, finalTaxable, hsaAdvantage, taxSavingsOnContribs, annualTaxSavings, effectiveContrib, limit, medical, netContrib });
  };

  const reset = () => {
    setCurrentBalance(''); setAnnualContribution(''); setYearsToRetirement('');
    setAnnualReturn('7'); setAnnualMedical(''); setMarginalRate('22');
    setCoverageType('single'); setResult(null);
  };

  return (
    <div style={{ color: '#F1F5F9', fontFamily: 'inherit' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>HSA Growth Projector</h2>
        <p style={{ color: '#64748B', fontSize: 14, margin: 0 }}>See how your Health Savings Account can grow tax-free over time</p>
      </div>

      <div style={{ ...card, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16 }}>Inputs</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div>
            <label style={lbl}>Coverage Type</label>
            <select style={inp} value={coverageType} onChange={e => setCoverageType(e.target.value)}>
              <option value="single">Individual — 2024 limit: $4,150</option>
              <option value="family">Family — 2024 limit: $8,300</option>
            </select>
          </div>
          <div>
            <label style={lbl}>Current HSA Balance ($)</label>
            <input style={inp} type="number" placeholder="5000" value={currentBalance} onChange={e => setCurrentBalance(e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Annual Contribution ($)</label>
            <input style={inp} type="number" placeholder="4150" value={annualContribution} onChange={e => setAnnualContribution(e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Years Until Retirement</label>
            <input style={inp} type="number" placeholder="20" value={yearsToRetirement} onChange={e => setYearsToRetirement(e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Expected Annual Return (%)</label>
            <input style={inp} type="number" placeholder="7" value={annualReturn} onChange={e => setAnnualReturn(e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Annual Medical Expenses Paid from HSA ($)</label>
            <input style={inp} type="number" placeholder="0" value={annualMedical} onChange={e => setAnnualMedical(e.target.value)} />
            <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>Enter 0 to invest everything</div>
          </div>
          <div>
            <label style={lbl}>Marginal Tax Rate (%, for tax savings calc)</label>
            <input style={inp} type="number" placeholder="22" value={marginalRate} onChange={e => setMarginalRate(e.target.value)} />
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
              { label: 'Projected HSA Balance', value: fmt(result.finalHSA), color: '#4ADE80' },
              { label: 'Taxable Account Equiv.', value: fmt(result.finalTaxable), color: '#60A5FA' },
              { label: 'HSA Tax Advantage', value: fmt(result.hsaAdvantage), color: '#D4AF37' },
              { label: 'Annual Tax Savings', value: fmt(result.annualTaxSavings), color: '#A78BFA' },
              { label: 'Total Tax Savings (all yrs)', value: fmt(result.taxSavingsOnContribs), color: '#A78BFA' },
              { label: 'Net Annual Investment', value: fmt(result.netContrib) + '/yr', color: '#F1F5F9' },
            ].map((s, i) => (
              <div key={i} style={card}>
                <div style={{ fontSize: 12, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>{s.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {result.effectiveContrib > LIMITS[coverageType] && (
            <div style={{ ...card, marginBottom: 16, border: '1px solid #F87171', background: '#1a0a0a' }}>
              <div style={{ color: '#F87171', fontSize: 13 }}>
                Your contribution exceeds the {coverageType} limit of ${LIMITS[coverageType].toLocaleString()}. Calculation uses the IRS maximum.
              </div>
            </div>
          )}

          <div style={card}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#94A3B8', marginBottom: 16 }}>HSA vs Taxable Account Growth</div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={result.chartData} margin={{ left: 10, right: 20, top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="hsaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4ADE80" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4ADE80" stopOpacity={0.03} />
                  </linearGradient>
                  <linearGradient id="taxGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#60A5FA" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="year" stroke="#334155" tick={{ fill: '#64748B', fontSize: 10 }} interval={Math.floor(result.chartData.length / 6)} />
                <YAxis tickFormatter={fmtShort} stroke="#334155" tick={{ fill: '#64748B', fontSize: 11 }} width={70} />
                <Tooltip formatter={(val) => [fmt(val)]} contentStyle={{ background: '#131d35', border: '1px solid #1E293B', borderRadius: 8 }} labelStyle={{ color: '#F1F5F9' }} />
                <Legend />
                <Area type="monotone" dataKey="HSA (Tax-Free)" stroke="#4ADE80" strokeWidth={2} fill="url(#hsaGrad)" />
                <Area type="monotone" dataKey="Taxable Account" stroke="#60A5FA" strokeWidth={2} fill="url(#taxGrad)" />
              </AreaChart>
            </ResponsiveContainer>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 8 }}>
              HSA triple tax advantage: pre-tax contributions, tax-free growth, and tax-free withdrawals for qualified medical expenses.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
