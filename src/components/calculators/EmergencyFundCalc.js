import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const inp = { background: '#0A1020', border: '1px solid #1E293B', color: '#F1F5F9', borderRadius: 8, padding: '10px 12px', width: '100%', boxSizing: 'border-box', fontSize: 14 };
const lbl = { fontSize: 12, color: '#64748B', display: 'block', marginBottom: 4 };
const card = { background: '#131d35', border: '1px solid #1E293B', borderRadius: 12, padding: 16 };
const calcBtn = { background: '#D4AF37', color: '#0A0F1E', fontWeight: 700, border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, cursor: 'pointer' };
const resetBtn = { background: 'transparent', border: '1px solid #334155', color: '#94A3B8', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontSize: 14 };

const fmt = (v) => v >= 1e6 ? '$' + (v / 1e6).toFixed(2) + 'M' : v >= 1000 ? '$' + (v / 1000).toFixed(1) + 'K' : '$' + Math.round(v).toLocaleString();

export default function EmergencyFundCalc() {
  const [monthlyExpenses, setMonthlyExpenses] = useState('');
  const [jobSecurity, setJobSecurity] = useState('stable');
  const [earners, setEarners] = useState('2');
  const [dependents, setDependents] = useState('no');
  const [healthIns, setHealthIns] = useState('good');
  const [currentSavings, setCurrentSavings] = useState('');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const expenses = parseFloat(monthlyExpenses) || 0;
    const savings = parseFloat(currentSavings) || 0;
    let baseLow = 3, baseHigh = 6;
    if (jobSecurity === 'unstable') { baseLow += 3; baseHigh += 3; }
    else if (jobSecurity === 'moderate') { baseLow += 1; baseHigh += 1; }
    if (earners === '1') { baseLow += 1; baseHigh += 1; }
    if (dependents === 'yes') { baseLow += 1; baseHigh += 1; }
    if (healthIns === 'poor') { baseLow += 1; baseHigh += 1; }
    baseLow = Math.min(baseLow, 12);
    baseHigh = Math.min(baseHigh, 12);
    const target = expenses * baseHigh;
    const gap = target - savings;
    setResult({ baseLow, baseHigh, targetLow: expenses * baseLow, target, savings, gap, monthly6: gap > 0 ? gap / 6 : 0, monthly12: gap > 0 ? gap / 12 : 0 });
  };

  const reset = () => {
    setMonthlyExpenses(''); setJobSecurity('stable'); setEarners('2');
    setDependents('no'); setHealthIns('good'); setCurrentSavings(''); setResult(null);
  };

  const chartData = result
    ? [{ name: 'Fund', Saved: Math.min(result.savings, result.target), Needed: Math.max(result.gap, 0) }]
    : [];

  return (
    <div style={{ color: '#F1F5F9', fontFamily: 'inherit' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Emergency Fund Calculator</h2>
        <p style={{ color: '#64748B', fontSize: 14, margin: 0 }}>Find out how much you should have saved based on your personal risk profile</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 20 }}>
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16 }}>Your Expenses</div>
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Monthly Essential Expenses ($)</label>
            <input style={inp} type="number" placeholder="3000" value={monthlyExpenses} onChange={e => setMonthlyExpenses(e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Current Savings ($, optional)</label>
            <input style={inp} type="number" placeholder="5000" value={currentSavings} onChange={e => setCurrentSavings(e.target.value)} />
          </div>
        </div>

        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16 }}>Risk Factors</div>
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Job Security</label>
            <select style={inp} value={jobSecurity} onChange={e => setJobSecurity(e.target.value)}>
              <option value="stable">Stable (government, tenured)</option>
              <option value="moderate">Moderate (steady private sector)</option>
              <option value="unstable">Unstable (freelance, startup, sales)</option>
            </select>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Number of Income Earners</label>
            <select style={inp} value={earners} onChange={e => setEarners(e.target.value)}>
              <option value="2">2 — Dual income household</option>
              <option value="1">1 — Single income household</option>
            </select>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Have Dependents?</label>
            <select style={inp} value={dependents} onChange={e => setDependents(e.target.value)}>
              <option value="no">No dependents</option>
              <option value="yes">Yes, have dependents</option>
            </select>
          </div>
          <div>
            <label style={lbl}>Health Insurance Quality</label>
            <select style={inp} value={healthIns} onChange={e => setHealthIns(e.target.value)}>
              <option value="good">Good (low deductible)</option>
              <option value="poor">Poor (high deductible plan)</option>
            </select>
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
              { label: 'Recommended Months', value: `${result.baseLow}–${result.baseHigh} months`, color: '#60A5FA' },
              { label: 'Target Fund Size', value: fmt(result.target), color: '#D4AF37' },
              { label: 'Current Savings', value: fmt(result.savings), color: '#A78BFA' },
              { label: result.gap > 0 ? 'Savings Gap' : 'Surplus', value: fmt(Math.abs(result.gap)), color: result.gap > 0 ? '#F87171' : '#4ADE80' },
              { label: 'Monthly to fund in 6mo', value: result.gap > 0 ? fmt(result.monthly6) + '/mo' : 'Fully Funded!', color: '#4ADE80' },
              { label: 'Monthly to fund in 12mo', value: result.gap > 0 ? fmt(result.monthly12) + '/mo' : 'Fully Funded!', color: '#4ADE80' },
            ].map((s, i) => (
              <div key={i} style={card}>
                <div style={{ fontSize: 12, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>{s.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div style={card}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#94A3B8', marginBottom: 16 }}>Progress Toward Goal</div>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 30, top: 0, bottom: 0 }}>
                <XAxis type="number" tickFormatter={v => '$' + (v / 1000).toFixed(0) + 'K'} stroke="#334155" tick={{ fill: '#64748B', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" hide />
                <Tooltip formatter={(val, name) => [fmt(val), name]} contentStyle={{ background: '#131d35', border: '1px solid #1E293B', borderRadius: 8 }} labelStyle={{ color: '#F1F5F9' }} />
                <Bar dataKey="Saved" stackId="a" fill="#4ADE80" radius={[6, 0, 0, 6]} />
                <Bar dataKey="Needed" stackId="a" fill="#F87171" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: 20, marginTop: 10 }}>
              <span style={{ fontSize: 12, color: '#4ADE80' }}>&#9632; Saved</span>
              <span style={{ fontSize: 12, color: '#F87171' }}>&#9632; Still Needed</span>
            </div>
          </div>

          <div style={{ ...card, marginTop: 16, background: '#0A0F1E', border: '1px solid #334155' }}>
            <div style={{ fontSize: 13, color: '#64748B' }}>
              <strong style={{ color: '#D4AF37' }}>How your recommendation was calculated:</strong> Base 3–6 months
              {jobSecurity === 'unstable' && ' + 3mo (unstable job)'}
              {jobSecurity === 'moderate' && ' + 1mo (moderate stability)'}
              {earners === '1' && ' + 1mo (single income)'}
              {dependents === 'yes' && ' + 1mo (dependents)'}
              {healthIns === 'poor' && ' + 1mo (high deductible insurance)'}
              . Maximum cap: 12 months.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
