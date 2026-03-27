import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

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

const projectNW = (nw0, monthly, r, years) => {
  if (r === 0) return nw0 + monthly * 12 * years;
  return nw0 * Math.pow(1 + r, years) + monthly * 12 * ((Math.pow(1 + r, years) - 1) / r);
};

const findMilestoneYear = (nw0, monthly, r, target) => {
  if (nw0 >= target) return 0;
  for (let y = 1; y <= 100; y++) {
    if (projectNW(nw0, monthly, r, y) >= target) return y;
  }
  return null;
};

export default function NetWorthCalc() {
  const [currentNW, setCurrentNW] = useState('');
  const [monthlySavings, setMonthlySavings] = useState('');
  const [annualReturn, setAnnualReturn] = useState('7');
  const [yearsProject, setYearsProject] = useState('30');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const nw0 = parseFloat(currentNW) || 0;
    const monthly = parseFloat(monthlySavings) || 0;
    const r = (parseFloat(annualReturn) || 0) / 100;
    const years = parseInt(yearsProject) || 30;

    const snapshots = [1, 5, 10, 20, 30].filter(y => y <= years || y === 1);
    const projections = snapshots.map(y => ({ year: y, value: projectNW(nw0, monthly, r, y) }));

    const chartData = [];
    for (let y = 0; y <= years; y++) {
      chartData.push({ year: `Yr ${y}`, value: Math.round(projectNW(nw0, monthly, r, y)) });
    }

    const milestones = [100000, 250000, 500000, 1000000].map(target => ({
      label: fmt(target),
      year: findMilestoneYear(nw0, monthly, r, target),
    })).filter(m => m.year !== null && m.year <= years);

    setResult({ projections, chartData, milestones, nw0 });
  };

  const reset = () => {
    setCurrentNW(''); setMonthlySavings(''); setAnnualReturn('7'); setYearsProject('30'); setResult(null);
  };

  return (
    <div style={{ color: '#F1F5F9', fontFamily: 'inherit' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Net Worth Projector</h2>
        <p style={{ color: '#64748B', fontSize: 14, margin: 0 }}>Project your wealth growth over time with compound interest</p>
      </div>

      <div style={{ ...card, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16 }}>Inputs</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div>
            <label style={lbl}>Current Net Worth ($)</label>
            <input style={inp} type="number" placeholder="50000" value={currentNW} onChange={e => setCurrentNW(e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Monthly Savings Rate ($)</label>
            <input style={inp} type="number" placeholder="1500" value={monthlySavings} onChange={e => setMonthlySavings(e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Expected Annual Return (%)</label>
            <input style={inp} type="number" placeholder="7" value={annualReturn} onChange={e => setAnnualReturn(e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Years to Project</label>
            <input style={inp} type="number" placeholder="30" value={yearsProject} onChange={e => setYearsProject(e.target.value)} />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <button onClick={calculate} style={calcBtn}>Calculate</button>
        <button onClick={reset} style={resetBtn}>Reset</button>
      </div>

      {result && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
            {result.projections.map((p, i) => (
              <div key={i} style={card}>
                <div style={{ fontSize: 12, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Year {p.year}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#4ADE80' }}>{fmt(p.value)}</div>
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                  +{fmt(p.value - result.nw0)} growth
                </div>
              </div>
            ))}
          </div>

          {result.milestones.length > 0 && (
            <div style={{ ...card, marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#94A3B8', marginBottom: 12 }}>Milestone Years</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {result.milestones.map((m, i) => (
                  <div key={i} style={{ background: '#0A0F1E', border: '1px solid #334155', borderRadius: 8, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: '#D4AF37', fontWeight: 700 }}>{m.label}</span>
                    <span style={{ color: '#64748B', fontSize: 13 }}>in {m.year} year{m.year !== 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={card}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#94A3B8', marginBottom: 16 }}>Net Worth Growth Over Time</div>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={result.chartData} margin={{ left: 10, right: 20, top: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="year" stroke="#334155" tick={{ fill: '#64748B', fontSize: 10 }} interval={Math.floor(result.chartData.length / 6)} />
                <YAxis tickFormatter={fmtShort} stroke="#334155" tick={{ fill: '#64748B', fontSize: 11 }} width={70} />
                <Tooltip formatter={(val) => [fmt(val), 'Net Worth']} contentStyle={{ background: '#131d35', border: '1px solid #1E293B', borderRadius: 8 }} labelStyle={{ color: '#F1F5F9' }} />
                <Line type="monotone" dataKey="value" stroke="#4ADE80" strokeWidth={2.5} dot={false} />
                {[100000, 250000, 500000, 1000000].map((target, i) => (
                  result.chartData[result.chartData.length - 1]?.value >= target
                    ? <ReferenceLine key={i} y={target} stroke="#D4AF37" strokeDasharray="4 4" label={{ value: fmtShort(target), fill: '#D4AF37', fontSize: 10 }} />
                    : null
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
