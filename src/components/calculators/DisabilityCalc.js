import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const inp = { background: '#0A1020', border: '1px solid #1E293B', color: '#F1F5F9', borderRadius: 8, padding: '10px 12px', width: '100%', boxSizing: 'border-box', fontSize: 14 };
const lbl = { fontSize: 12, color: '#64748B', display: 'block', marginBottom: 4 };
const card = { background: '#131d35', border: '1px solid #1E293B', borderRadius: 12, padding: 16 };
const calcBtn = { background: '#D4AF37', color: '#0A0F1E', fontWeight: 700, border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, cursor: 'pointer' };
const resetBtn = { background: 'transparent', border: '1px solid #334155', color: '#94A3B8', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontSize: 14 };

const fmt = (v) => '$' + Math.round(v).toLocaleString();

export default function DisabilityCalc() {
  const [monthlyGrossIncome, setMonthlyGrossIncome] = useState('');
  const [employerCoverage, setEmployerCoverage] = useState('');
  const [ssdEstimate, setSsdEstimate] = useState('');
  const [monthlyExpenses, setMonthlyExpenses] = useState('');
  const [taxRate, setTaxRate] = useState('22');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const gross = parseFloat(monthlyGrossIncome) || 0;
    const employer = parseFloat(employerCoverage) || 0;
    const ssd = parseFloat(ssdEstimate) || 0;
    const expenses = parseFloat(monthlyExpenses) || 0;
    const tax = (parseFloat(taxRate) || 0) / 100;

    // Net current income
    const netCurrentIncome = gross * (1 - tax);

    // Disability income: employer coverage + SSD (SSD is typically tax-free or low-taxed, simplified here)
    const disabilityIncome = employer + ssd;

    // Gap
    const monthlyGap = Math.max(expenses - disabilityIncome, 0);
    const incomeGap = Math.max(netCurrentIncome - disabilityIncome, 0);

    // Recommended additional coverage = gap between expenses and existing disability income
    const recommendedCoverage = monthlyGap;

    // Annual premium estimate: 1-3% of annual covered amount
    const annualCovered = recommendedCoverage * 12;
    const premiumLow = annualCovered * 0.01;
    const premiumHigh = annualCovered * 0.03;

    const chartData = [
      { name: 'Current Income (Net)', value: Math.round(netCurrentIncome), fill: '#4ADE80' },
      { name: 'Disability Income', value: Math.round(disabilityIncome), fill: '#60A5FA' },
      { name: 'Monthly Expenses', value: Math.round(expenses), fill: '#F87171' },
    ];

    setResult({ gross, netCurrentIncome, disabilityIncome, employer, ssd, expenses, monthlyGap, incomeGap, recommendedCoverage, premiumLow, premiumHigh, annualCovered, chartData });
  };

  const reset = () => {
    setMonthlyGrossIncome(''); setEmployerCoverage(''); setSsdEstimate('');
    setMonthlyExpenses(''); setTaxRate('22'); setResult(null);
  };

  return (
    <div style={{ color: '#F1F5F9', fontFamily: 'inherit' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Disability Income Gap Calculator</h2>
        <p style={{ color: '#64748B', fontSize: 14, margin: 0 }}>Find out how much disability coverage you'd need if you couldn't work</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 20 }}>
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16 }}>Your Income</div>
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label style={lbl}>Monthly Gross Income ($)</label>
              <input style={inp} type="number" placeholder="6000" value={monthlyGrossIncome} onChange={e => setMonthlyGrossIncome(e.target.value)} />
            </div>
            <div>
              <label style={lbl}>Tax Rate (%, federal + state combined)</label>
              <input style={inp} type="number" placeholder="22" value={taxRate} onChange={e => setTaxRate(e.target.value)} />
            </div>
            <div>
              <label style={lbl}>Monthly Essential Expenses ($)</label>
              <input style={inp} type="number" placeholder="4000" value={monthlyExpenses} onChange={e => setMonthlyExpenses(e.target.value)} />
            </div>
          </div>
        </div>

        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16 }}>Existing Disability Coverage</div>
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label style={lbl}>Employer Disability Coverage ($/mo)</label>
              <input style={inp} type="number" placeholder="2400" value={employerCoverage} onChange={e => setEmployerCoverage(e.target.value)} />
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>Typically 60% of gross income</div>
            </div>
            <div>
              <label style={lbl}>Social Security Disability Estimate ($/mo)</label>
              <input style={inp} type="number" placeholder="1500" value={ssdEstimate} onChange={e => setSsdEstimate(e.target.value)} />
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>Average SSDI benefit ~$1,483/mo (2024)</div>
            </div>
          </div>

          <div style={{ marginTop: 16, padding: 12, background: '#0A0F1E', borderRadius: 8, border: '1px solid #334155' }}>
            <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.6 }}>
              Most employer policies cover 60% of gross income. SSDI takes months to years to approve and averages $1,000–$1,800/mo.
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
              { label: 'Net Current Income', value: fmt(result.netCurrentIncome) + '/mo', color: '#4ADE80' },
              { label: 'Total Disability Income', value: fmt(result.disabilityIncome) + '/mo', color: '#60A5FA' },
              { label: 'Monthly Expenses Gap', value: result.monthlyGap > 0 ? fmt(result.monthlyGap) + '/mo' : 'Covered!', color: result.monthlyGap > 0 ? '#F87171' : '#4ADE80' },
              { label: 'Income Shortfall', value: result.incomeGap > 0 ? fmt(result.incomeGap) + '/mo' : 'No Gap', color: result.incomeGap > 0 ? '#F87171' : '#4ADE80' },
              { label: 'Recommended Add\'l Coverage', value: fmt(result.recommendedCoverage) + '/mo', color: '#D4AF37' },
            ].map((s, i) => (
              <div key={i} style={card}>
                <div style={{ fontSize: 12, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>{s.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {result.recommendedCoverage > 0 && (
            <div style={{ ...card, marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#94A3B8', marginBottom: 8 }}>Estimated Annual Premium for Additional Coverage</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#D4AF37' }}>
                {fmt(result.premiumLow)} – {fmt(result.premiumHigh)}<span style={{ fontSize: 16, color: '#64748B' }}>/year</span>
              </div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 6 }}>
                1–3% of annual covered benefit ({fmt(result.annualCovered)}/yr). Actual rates depend on occupation, age, elimination period, and benefit period.
              </div>
            </div>
          )}

          <div style={card}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#94A3B8', marginBottom: 16 }}>Income vs Expenses if Disabled</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={result.chartData} margin={{ left: 10, right: 20, top: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="name" stroke="#334155" tick={{ fill: '#94A3B8', fontSize: 12 }} />
                <YAxis tickFormatter={v => '$' + (v / 1000).toFixed(0) + 'K'} stroke="#334155" tick={{ fill: '#64748B', fontSize: 11 }} width={60} />
                <Tooltip formatter={(val) => [fmt(val), 'Monthly Amount']} contentStyle={{ background: '#131d35', border: '1px solid #1E293B', borderRadius: 8 }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {result.chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
