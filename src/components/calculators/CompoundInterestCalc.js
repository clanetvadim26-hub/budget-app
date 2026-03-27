import React, { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const inputStyle = {
  background: '#0A1020',
  border: '1px solid #1E293B',
  color: '#F1F5F9',
  borderRadius: 8,
  padding: '10px 12px',
  width: '100%',
  boxSizing: 'border-box',
  fontSize: 14,
};

const labelStyle = { fontSize: 12, color: '#64748B', marginBottom: 4, display: 'block' };

const cardStyle = {
  background: '#131d35',
  border: '1px solid #1E293B',
  borderRadius: 12,
  padding: 16,
};

const btnGold = {
  background: '#D4AF37',
  color: '#0A0F1E',
  fontWeight: 700,
  borderRadius: 8,
  padding: '10px 24px',
  border: 'none',
  cursor: 'pointer',
  fontSize: 14,
};

const btnGray = {
  background: 'transparent',
  border: '1px solid #334155',
  color: '#94A3B8',
  borderRadius: 8,
  padding: '10px 24px',
  cursor: 'pointer',
  fontSize: 14,
};

const freqMap = {
  Annually: 1,
  'Semi-annually': 2,
  Quarterly: 4,
  Monthly: 12,
  Daily: 365,
};

function fmt(n) {
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CompoundInterestCalc() {
  const [principal, setPrincipal] = useState('10000');
  const [contribution, setContribution] = useState('500');
  const [rate, setRate] = useState('7');
  const [years, setYears] = useState('20');
  const [freq, setFreq] = useState('Monthly');
  const [results, setResults] = useState(null);

  function calculate() {
    const P = parseFloat(principal) || 0;
    const A = parseFloat(contribution) || 0;
    const r = (parseFloat(rate) || 0) / 100;
    const Y = parseInt(years) || 1;
    const n = freqMap[freq];

    const tableData = [];
    let balance = P;
    let totalContribs = P;

    for (let y = 1; y <= Y; y++) {
      const prevBalance = balance;
      // Compound growth for the year with periodic contributions
      const ratePerPeriod = r / n;
      const periods = n;
      // Balance grows with compounding plus contributions each period
      let b = prevBalance;
      for (let p = 0; p < periods; p++) {
        b = b * (1 + ratePerPeriod) + A / (periods / n);
      }
      balance = b;
      // eslint-disable-next-line no-unused-vars
      totalContribs += A * 12; // annual contribution (monthly * 12)
      // Recalc properly: contributions per period = A / (12/n) if A is monthly
      // Simplify: treat A as annual contribution
      tableData.push({
        year: y,
        balance,
        contributions: P + A * y,
        interest: balance - (P + A * y),
      });
    }

    // Redo properly: A is annual contribution, n is compound freq
    const tableDataClean = [];
    let bal = P;
    const rPerPeriod = r / n;
    const annualContribPerPeriod = A / n;

    for (let y = 1; y <= Y; y++) {
      for (let p = 0; p < n; p++) {
        bal = bal * (1 + rPerPeriod) + annualContribPerPeriod;
      }
      const totalC = P + A * y;
      tableDataClean.push({
        year: y,
        balance: bal,
        contributions: totalC,
        interest: bal - totalC,
      });
    }

    const last = tableDataClean[tableDataClean.length - 1];
    const totalContributions = P + A * Y;
    const totalInterest = last.balance - totalContributions;
    const roi = totalContributions > 0 ? (totalInterest / totalContributions) * 100 : 0;

    setResults({
      futureValue: last.balance,
      totalContributions,
      totalInterest,
      roi,
      table: tableDataClean,
    });
  }

  function reset() {
    setPrincipal('10000');
    setContribution('500');
    setRate('7');
    setYears('20');
    setFreq('Monthly');
    setResults(null);
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: '#0D1426', border: '1px solid #1E293B', borderRadius: 8, padding: '10px 14px' }}>
          <p style={{ color: '#CBD5E1', marginBottom: 4, fontWeight: 600 }}>Year {label}</p>
          {payload.map((p, i) => (
            <p key={i} style={{ color: p.color, margin: '2px 0', fontSize: 13 }}>
              {p.name}: {fmt(p.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
      <h2 style={{ color: '#F1F5F9', marginBottom: 4, fontSize: 22 }}>Compound Interest Calculator</h2>
      <p style={{ color: '#64748B', marginBottom: 24, fontSize: 14 }}>Calculate how your investments grow over time with compound interest.</p>

      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          <div>
            <label style={labelStyle}>Principal ($)</label>
            <input style={inputStyle} type="number" value={principal} onChange={e => setPrincipal(e.target.value)} min="0" />
          </div>
          <div>
            <label style={labelStyle}>Annual Contribution ($)</label>
            <input style={inputStyle} type="number" value={contribution} onChange={e => setContribution(e.target.value)} min="0" />
          </div>
          <div>
            <label style={labelStyle}>Annual Interest Rate (%)</label>
            <input style={inputStyle} type="number" value={rate} onChange={e => setRate(e.target.value)} min="0" step="0.1" />
          </div>
          <div>
            <label style={labelStyle}>Years</label>
            <input style={inputStyle} type="number" value={years} onChange={e => setYears(e.target.value)} min="1" max="100" />
          </div>
          <div>
            <label style={labelStyle}>Compounding Frequency</label>
            <select style={inputStyle} value={freq} onChange={e => setFreq(e.target.value)}>
              {Object.keys(freqMap).map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button style={btnGold} onClick={calculate}>Calculate</button>
          <button style={btnGray} onClick={reset}>Reset</button>
        </div>
      </div>

      {results && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
            <div style={cardStyle}>
              <div style={{ color: '#64748B', fontSize: 12, marginBottom: 6 }}>Future Value</div>
              <div style={{ color: '#D4AF37', fontSize: 22, fontWeight: 700 }}>{fmt(results.futureValue)}</div>
            </div>
            <div style={cardStyle}>
              <div style={{ color: '#64748B', fontSize: 12, marginBottom: 6 }}>Total Contributions</div>
              <div style={{ color: '#60A5FA', fontSize: 22, fontWeight: 700 }}>{fmt(results.totalContributions)}</div>
            </div>
            <div style={cardStyle}>
              <div style={{ color: '#64748B', fontSize: 12, marginBottom: 6 }}>Total Interest Earned</div>
              <div style={{ color: '#4ADE80', fontSize: 22, fontWeight: 700 }}>{fmt(results.totalInterest)}</div>
            </div>
            <div style={cardStyle}>
              <div style={{ color: '#64748B', fontSize: 12, marginBottom: 6 }}>Return on Investment</div>
              <div style={{ color: '#4ADE80', fontSize: 22, fontWeight: 700 }}>{results.roi.toFixed(1)}%</div>
            </div>
          </div>

          <div style={{ ...cardStyle, marginBottom: 24 }}>
            <h3 style={{ color: '#CBD5E1', marginBottom: 16, fontSize: 15 }}>Growth Over Time</h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={results.table} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" />
                <XAxis dataKey="year" stroke="#64748B" tick={{ fill: '#64748B', fontSize: 12 }} label={{ value: 'Year', position: 'insideBottom', offset: -2, fill: '#64748B', fontSize: 12 }} />
                <YAxis stroke="#64748B" tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={v => '$' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ color: '#CBD5E1', fontSize: 13 }} />
                <Area type="monotone" dataKey="contributions" name="Contributions" stackId="1" stroke="#60A5FA" fill="#60A5FA" fillOpacity={0.4} />
                <Area type="monotone" dataKey="interest" name="Interest" stackId="1" stroke="#D4AF37" fill="#D4AF37" fillOpacity={0.4} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div style={cardStyle}>
            <h3 style={{ color: '#CBD5E1', marginBottom: 12, fontSize: 15 }}>Year-by-Year Breakdown</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1E293B' }}>
                    {['Year', 'Balance', 'Contributions to Date', 'Interest to Date'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', color: '#64748B', textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.table.map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #1E293B22' }}>
                      <td style={{ padding: '8px 12px', color: '#CBD5E1', textAlign: 'right' }}>{row.year}</td>
                      <td style={{ padding: '8px 12px', color: '#D4AF37', textAlign: 'right', fontWeight: 600 }}>{fmt(row.balance)}</td>
                      <td style={{ padding: '8px 12px', color: '#60A5FA', textAlign: 'right' }}>{fmt(row.contributions)}</td>
                      <td style={{ padding: '8px 12px', color: '#4ADE80', textAlign: 'right' }}>{fmt(row.interest)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
