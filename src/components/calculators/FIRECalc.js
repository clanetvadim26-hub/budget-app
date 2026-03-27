import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine} from 'recharts';

const inp = { background: '#0A1020', border: '1px solid #1E293B', color: '#F1F5F9', borderRadius: 8, padding: '10px 12px', width: '100%', boxSizing: 'border-box', fontSize: 14 };
const lbl = { fontSize: 12, color: '#64748B', display: 'block', marginBottom: 4 };
const card = { background: '#131d35', border: '1px solid #1E293B', borderRadius: 12, padding: 16 };
const calcBtn = { background: '#D4AF37', color: '#0A0F1E', fontWeight: 700, border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, cursor: 'pointer' };
const resetBtn = { background: 'transparent', border: '1px solid #334155', color: '#94A3B8', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontSize: 14 };

const fmt = (v) => {
  if (v >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B';
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
  if (v >= 1000) return '$' + (v / 1000).toFixed(1) + 'K';
  return '$' + Math.round(v).toLocaleString();
};

const fmtShort = (v) => {
  if (v >= 1e9) return '$' + (v / 1e9).toFixed(1) + 'B';
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(1) + 'M';
  if (v >= 1000) return '$' + (v / 1000).toFixed(0) + 'K';
  return '$' + Math.round(v);
};

export default function FIRECalc() {
  const [annualExpenses, setAnnualExpenses] = useState('');
  const [currentSavings, setCurrentSavings] = useState('');
  const [monthlySavings, setMonthlySavings] = useState('');
  const [annualReturn, setAnnualReturn] = useState('7');
  const [swr, setSwr] = useState('4');
  const [currentAge, setCurrentAge] = useState('');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const expenses = parseFloat(annualExpenses) || 0;
    const savings0 = parseFloat(currentSavings) || 0;
    const monthly = parseFloat(monthlySavings) || 0;
    const r = (parseFloat(annualReturn) || 7) / 100;
    const swrPct = (parseFloat(swr) || 4) / 100;
    const age = parseFloat(currentAge) || 30;

    const fireNumber = swrPct > 0 ? expenses / swrPct : 0;

    const growPortfolio = (years) => {
      if (r === 0) return savings0 + monthly * 12 * years;
      return savings0 * Math.pow(1 + r, years) + monthly * 12 * ((Math.pow(1 + r, years) - 1) / r);
    };

    let yearsToFire = null;
    const chartData = [];
    for (let y = 0; y <= 60; y++) {
      const val = growPortfolio(y);
      chartData.push({ year: y, portfolio: Math.round(val), age: age + y });
      if (yearsToFire === null && val >= fireNumber) yearsToFire = y;
    }

    const fireAge = yearsToFire !== null ? age + yearsToFire : null;
    const portfolioAtFire = yearsToFire !== null ? growPortfolio(yearsToFire) : null;

    const swrScenarios = [3, 3.5, 4, 4.5].map(rate => ({
      rate,
      number: expenses / (rate / 100),
    }));

    setResult({ fireNumber, yearsToFire, fireAge, portfolioAtFire, chartData, swrScenarios, expenses });
  };

  const reset = () => {
    setAnnualExpenses(''); setCurrentSavings(''); setMonthlySavings('');
    setAnnualReturn('7'); setSwr('4'); setCurrentAge(''); setResult(null);
  };

  return (
    <div style={{ color: '#F1F5F9', fontFamily: 'inherit' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>FIRE Calculator</h2>
        <p style={{ color: '#64748B', fontSize: 14, margin: 0 }}>Financial Independence, Retire Early — find your number and timeline</p>
      </div>

      <div style={{ ...card, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16 }}>Inputs</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div>
            <label style={lbl}>Annual Expenses in Retirement ($)</label>
            <input style={inp} type="number" placeholder="60000" value={annualExpenses} onChange={e => setAnnualExpenses(e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Current Savings / Investments ($)</label>
            <input style={inp} type="number" placeholder="100000" value={currentSavings} onChange={e => setCurrentSavings(e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Monthly Savings ($)</label>
            <input style={inp} type="number" placeholder="2000" value={monthlySavings} onChange={e => setMonthlySavings(e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Expected Annual Return (%)</label>
            <input style={inp} type="number" placeholder="7" value={annualReturn} onChange={e => setAnnualReturn(e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Safe Withdrawal Rate (%, default 4%)</label>
            <input style={inp} type="number" placeholder="4" value={swr} onChange={e => setSwr(e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Current Age</label>
            <input style={inp} type="number" placeholder="30" value={currentAge} onChange={e => setCurrentAge(e.target.value)} />
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
              { label: 'FIRE Number', value: fmt(result.fireNumber), color: '#D4AF37' },
              { label: 'Years to FIRE', value: result.yearsToFire !== null ? result.yearsToFire + ' years' : 'Unreachable (60yr)', color: result.yearsToFire !== null ? '#4ADE80' : '#F87171' },
              { label: 'FIRE Age', value: result.fireAge !== null ? result.fireAge : 'N/A', color: '#60A5FA' },
              { label: 'Portfolio at FIRE', value: result.portfolioAtFire !== null ? fmt(result.portfolioAtFire) : '—', color: '#A78BFA' },
            ].map((s, i) => (
              <div key={i} style={card}>
                <div style={{ fontSize: 12, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>{s.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div style={{ ...card, marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#94A3B8', marginBottom: 12 }}>FIRE Number by Withdrawal Rate</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {result.swrScenarios.map((s, i) => {
                const isSelected = Math.abs(s.rate - parseFloat(swr)) < 0.01;
                return (
                  <div key={i} style={{ ...card, border: isSelected ? '1px solid #D4AF37' : '1px solid #1E293B', flex: '1 1 120px', minWidth: 120 }}>
                    <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>{s.rate}% SWR</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: isSelected ? '#D4AF37' : '#F1F5F9' }}>{fmt(s.number)}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={card}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#94A3B8', marginBottom: 16 }}>Portfolio Growth vs FIRE Number</div>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={result.chartData} margin={{ left: 10, right: 20, top: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="year" stroke="#334155" tick={{ fill: '#64748B', fontSize: 11 }} label={{ value: 'Years', fill: '#64748B', fontSize: 11, position: 'insideBottom', offset: -4 }} />
                <YAxis tickFormatter={fmtShort} stroke="#334155" tick={{ fill: '#64748B', fontSize: 11 }} width={70} />
                <Tooltip
                  formatter={(val, name) => [fmt(val), name]}
                  labelFormatter={(label, payload) => payload && payload[0] ? `Year ${label} (Age ${payload[0].payload.age})` : `Year ${label}`}
                  contentStyle={{ background: '#131d35', border: '1px solid #1E293B', borderRadius: 8 }}
                  labelStyle={{ color: '#F1F5F9' }}
                />
                <ReferenceLine y={result.fireNumber} stroke="#D4AF37" strokeDasharray="6 3" strokeWidth={2} label={{ value: 'FIRE Number', fill: '#D4AF37', fontSize: 11, position: 'insideTopRight' }} />
                <Line type="monotone" dataKey="portfolio" stroke="#4ADE80" strokeWidth={2.5} dot={false} name="Portfolio Value" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
