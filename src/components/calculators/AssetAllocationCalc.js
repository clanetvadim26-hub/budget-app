import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const inputStyle = {
  background: '#0A1020',
  border: '1px solid #1E293B',
  color: '#F1F5F9',
  borderRadius: 8,
  padding: '8px 10px',
  width: '100%',
  boxSizing: 'border-box',
  fontSize: 13,
};
const cardStyle = { background: '#131d35', border: '1px solid #1E293B', borderRadius: 12, padding: 16 };
const btnGold = { background: '#D4AF37', color: '#0A0F1E', fontWeight: 700, borderRadius: 8, padding: '10px 24px', border: 'none', cursor: 'pointer', fontSize: 14 };
const btnGray = { background: 'transparent', border: '1px solid #334155', color: '#94A3B8', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontSize: 14 };

const defaultHoldings = [
  { name: 'US Stocks', value: '60000', target: '50' },
  { name: 'International', value: '20000', target: '20' },
  { name: 'Bonds', value: '15000', target: '20' },
  { name: 'Real Estate', value: '5000', target: '10' },
  { name: '', value: '', target: '' },
  { name: '', value: '', target: '' },
];

function fmt(n) {
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AssetAllocationCalc() {
  const [holdings, setHoldings] = useState(defaultHoldings);
  const [results, setResults] = useState(null);

  function updateHolding(idx, field, val) {
    setHoldings(prev => prev.map((h, i) => i === idx ? { ...h, [field]: val } : h));
  }

  function calculate() {
    const active = holdings.filter(h => h.name.trim() && h.value.trim());
    if (active.length === 0) return;

    const totalValue = active.reduce((sum, h) => sum + (parseFloat(h.value) || 0), 0);
    const totalTarget = active.reduce((sum, h) => sum + (parseFloat(h.target) || 0), 0);

    const rows = active.map(h => {
      const val = parseFloat(h.value) || 0;
      const target = parseFloat(h.target) || 0;
      const currentPct = totalValue > 0 ? (val / totalValue) * 100 : 0;
      const targetPct = target;
      const diffPct = targetPct - currentPct;
      const diffDollar = (diffPct / 100) * totalValue;
      let action;
      if (Math.abs(diffDollar) < 1) action = 'In balance';
      else if (diffDollar > 0) action = `Buy ${fmt(diffDollar)}`;
      else action = `Sell ${fmt(Math.abs(diffDollar))}`;

      return { name: h.name, value: val, currentPct, targetPct, diffPct, diffDollar, action };
    });

    const chartData = rows.map(r => ({
      name: r.name,
      'Current %': parseFloat(r.currentPct.toFixed(2)),
      'Target %': parseFloat(r.targetPct.toFixed(2)),
    }));

    setResults({ totalValue, totalTarget, rows, chartData });
  }

  function reset() {
    setHoldings(defaultHoldings);
    setResults(null);
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <div style={{ background: '#0D1426', border: '1px solid #1E293B', borderRadius: 8, padding: '10px 14px' }}>
        <p style={{ color: '#CBD5E1', marginBottom: 4, fontWeight: 600 }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color, margin: '2px 0', fontSize: 13 }}>{p.name}: {p.value.toFixed(1)}%</p>
        ))}
      </div>
    );
  };

  const totalCurrentValue = holdings.reduce((sum, h) => sum + (parseFloat(h.value) || 0), 0);
  const totalTargetPct = holdings.reduce((sum, h) => sum + (parseFloat(h.target) || 0), 0);

  return (
    <div style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <h2 style={{ color: '#F1F5F9', marginBottom: 4, fontSize: 22 }}>Asset Allocation Calculator</h2>
      <p style={{ color: '#64748B', marginBottom: 24, fontSize: 14 }}>Enter your holdings and target allocations to see rebalancing actions.</p>

      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ color: '#CBD5E1', fontSize: 14, fontWeight: 600 }}>Holdings</span>
          <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
            <span style={{ color: '#64748B' }}>
              Total Value: <span style={{ color: '#D4AF37', fontWeight: 700 }}>{fmt(totalCurrentValue)}</span>
            </span>
            <span style={{ color: totalTargetPct === 100 ? '#4ADE80' : '#F87171', fontSize: 13 }}>
              Target Sum: {totalTargetPct.toFixed(1)}% {totalTargetPct !== 100 && '(should be 100%)'}
            </span>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1E293B' }}>
                {['Asset Name', 'Current Value ($)', 'Target Allocation (%)'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', color: '#64748B', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {holdings.map((h, i) => (
                <tr key={i}>
                  <td style={{ padding: '6px 8px' }}>
                    <input style={inputStyle} type="text" value={h.name} onChange={e => updateHolding(i, 'name', e.target.value)} placeholder={`Asset ${i + 1}`} />
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    <input style={inputStyle} type="number" value={h.value} onChange={e => updateHolding(i, 'value', e.target.value)} min="0" placeholder="0" />
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    <input style={inputStyle} type="number" value={h.target} onChange={e => updateHolding(i, 'target', e.target.value)} min="0" max="100" step="0.1" placeholder="0" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <button style={btnGold} onClick={calculate}>Calculate</button>
          <button style={btnGray} onClick={reset}>Reset</button>
        </div>
      </div>

      {results && (
        <>
          <div style={{ ...cardStyle, marginBottom: 24 }}>
            <h3 style={{ color: '#CBD5E1', marginBottom: 16, fontSize: 15 }}>Current vs Target Allocation</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={results.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="#64748B" tick={{ fill: '#64748B', fontSize: 12 }} />
                <YAxis stroke="#64748B" tick={{ fill: '#64748B', fontSize: 11 }} unit="%" />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ color: '#CBD5E1', fontSize: 13 }} />
                <Bar dataKey="Current %" fill="#60A5FA" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Target %" fill="#D4AF37" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={cardStyle}>
            <h3 style={{ color: '#CBD5E1', marginBottom: 12, fontSize: 15 }}>Rebalancing Actions</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1E293B' }}>
                    {['Asset', 'Current Value', 'Current %', 'Target %', 'Difference', 'Action'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', color: '#64748B', textAlign: h === 'Asset' ? 'left' : 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.rows.map((row, i) => {
                    const actionColor = row.action === 'In balance' ? '#64748B' : row.diffDollar > 0 ? '#4ADE80' : '#F87171';
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #1E293B22' }}>
                        <td style={{ padding: '10px 12px', color: '#F1F5F9', fontWeight: 600 }}>{row.name}</td>
                        <td style={{ padding: '10px 12px', color: '#CBD5E1', textAlign: 'right' }}>{fmt(row.value)}</td>
                        <td style={{ padding: '10px 12px', color: '#60A5FA', textAlign: 'right' }}>{row.currentPct.toFixed(1)}%</td>
                        <td style={{ padding: '10px 12px', color: '#D4AF37', textAlign: 'right' }}>{row.targetPct.toFixed(1)}%</td>
                        <td style={{ padding: '10px 12px', color: Math.abs(row.diffPct) < 0.1 ? '#64748B' : row.diffPct > 0 ? '#4ADE80' : '#F87171', textAlign: 'right' }}>
                          {row.diffPct > 0 ? '+' : ''}{row.diffPct.toFixed(1)}%
                        </td>
                        <td style={{ padding: '10px 12px', color: actionColor, textAlign: 'right', fontWeight: 600 }}>{row.action}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '1px solid #1E293B' }}>
                    <td style={{ padding: '10px 12px', color: '#CBD5E1', fontWeight: 700 }}>Total</td>
                    <td style={{ padding: '10px 12px', color: '#D4AF37', textAlign: 'right', fontWeight: 700 }}>{fmt(results.totalValue)}</td>
                    <td style={{ padding: '10px 12px', color: '#60A5FA', textAlign: 'right', fontWeight: 700 }}>100.0%</td>
                    <td style={{ padding: '10px 12px', color: '#D4AF37', textAlign: 'right', fontWeight: 700 }}>{results.totalTarget.toFixed(1)}%</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
