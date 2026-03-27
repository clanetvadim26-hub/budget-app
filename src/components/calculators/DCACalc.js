import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
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
const cardStyle = { background: '#131d35', border: '1px solid #1E293B', borderRadius: 12, padding: 16 };
const btnGold = { background: '#D4AF37', color: '#0A0F1E', fontWeight: 700, borderRadius: 8, padding: '10px 24px', border: 'none', cursor: 'pointer', fontSize: 14 };
const btnGray = { background: 'transparent', border: '1px solid #334155', color: '#94A3B8', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontSize: 14 };

function fmt(n) {
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function DCACalc() {
  const [monthly, setMonthly] = useState('500');
  const [annualReturn, setAnnualReturn] = useState('8');
  const [years, setYears] = useState('20');
  const [lumpSum, setLumpSum] = useState('');
  const [results, setResults] = useState(null);

  function calculate() {
    const M = parseFloat(monthly) || 0;
    const r = (parseFloat(annualReturn) || 0) / 100;
    const Y = parseInt(years) || 1;
    const LS = parseFloat(lumpSum) || 0;
    const monthlyRate = r / 12;

    const tableData = [];
    let dcaBalance = 0;

    for (let y = 1; y <= Y; y++) {
      for (let m = 0; m < 12; m++) {
        dcaBalance = dcaBalance * (1 + monthlyRate) + M;
      }
      const lsBalance = LS > 0 ? LS * Math.pow(1 + r, y) : null;
      const totalInvested = M * 12 * y;
      tableData.push({
        year: y,
        dcaValue: dcaBalance,
        lsValue: lsBalance,
        invested: totalInvested,
        dcaGain: dcaBalance - totalInvested,
      });
    }

    const last = tableData[tableData.length - 1];
    setResults({
      dcaFinalValue: last.dcaValue,
      dcaTotalInvested: M * 12 * Y,
      dcaTotalGain: last.dcaGain,
      lsFinalValue: LS > 0 ? last.lsValue : null,
      lsGain: LS > 0 ? last.lsValue - LS : null,
      hasLumpSum: LS > 0,
      table: tableData,
    });
  }

  function reset() {
    setMonthly('500'); setAnnualReturn('8'); setYears('20'); setLumpSum(''); setResults(null);
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <div style={{ background: '#0D1426', border: '1px solid #1E293B', borderRadius: 8, padding: '10px 14px' }}>
        <p style={{ color: '#CBD5E1', marginBottom: 4, fontWeight: 600 }}>Year {label}</p>
        {payload.map((p, i) => p.value != null && (
          <p key={i} style={{ color: p.color, margin: '2px 0', fontSize: 13 }}>{p.name}: {fmt(p.value)}</p>
        ))}
      </div>
    );
  };

  return (
    <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
      <h2 style={{ color: '#F1F5F9', marginBottom: 4, fontSize: 22 }}>Dollar Cost Averaging Calculator</h2>
      <p style={{ color: '#64748B', marginBottom: 24, fontSize: 14 }}>Compare a steady DCA strategy against investing a lump sum all at once.</p>

      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          <div>
            <label style={labelStyle}>Monthly Investment ($)</label>
            <input style={inputStyle} type="number" value={monthly} onChange={e => setMonthly(e.target.value)} min="0" />
          </div>
          <div>
            <label style={labelStyle}>Annual Return Rate (%)</label>
            <input style={inputStyle} type="number" value={annualReturn} onChange={e => setAnnualReturn(e.target.value)} min="0" step="0.1" />
          </div>
          <div>
            <label style={labelStyle}>Investment Period (Years)</label>
            <input style={inputStyle} type="number" value={years} onChange={e => setYears(e.target.value)} min="1" max="50" />
          </div>
          <div>
            <label style={labelStyle}>Lump Sum Alternative ($, optional)</label>
            <input style={inputStyle} type="number" value={lumpSum} onChange={e => setLumpSum(e.target.value)} min="0" placeholder="e.g. 120000" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button style={btnGold} onClick={calculate}>Calculate</button>
          <button style={btnGray} onClick={reset}>Reset</button>
        </div>
      </div>

      {results && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: 16, marginBottom: 24 }}>
            <div style={cardStyle}>
              <div style={{ color: '#64748B', fontSize: 12, marginBottom: 6 }}>DCA Final Value</div>
              <div style={{ color: '#D4AF37', fontSize: 22, fontWeight: 700 }}>{fmt(results.dcaFinalValue)}</div>
            </div>
            <div style={cardStyle}>
              <div style={{ color: '#64748B', fontSize: 12, marginBottom: 6 }}>Total Invested (DCA)</div>
              <div style={{ color: '#60A5FA', fontSize: 22, fontWeight: 700 }}>{fmt(results.dcaTotalInvested)}</div>
            </div>
            <div style={cardStyle}>
              <div style={{ color: '#64748B', fontSize: 12, marginBottom: 6 }}>Total Gain (DCA)</div>
              <div style={{ color: '#4ADE80', fontSize: 22, fontWeight: 700 }}>{fmt(results.dcaTotalGain)}</div>
            </div>
            {results.hasLumpSum && (
              <>
                <div style={cardStyle}>
                  <div style={{ color: '#64748B', fontSize: 12, marginBottom: 6 }}>Lump Sum Final Value</div>
                  <div style={{ color: '#D4AF37', fontSize: 22, fontWeight: 700 }}>{fmt(results.lsFinalValue)}</div>
                </div>
                <div style={cardStyle}>
                  <div style={{ color: '#64748B', fontSize: 12, marginBottom: 6 }}>Lump Sum Total Gain</div>
                  <div style={{ color: '#4ADE80', fontSize: 22, fontWeight: 700 }}>{fmt(results.lsGain)}</div>
                </div>
                <div style={cardStyle}>
                  <div style={{ color: '#64748B', fontSize: 12, marginBottom: 6 }}>DCA vs Lump Sum</div>
                  <div style={{ color: results.dcaFinalValue >= results.lsFinalValue ? '#4ADE80' : '#F87171', fontSize: 18, fontWeight: 700 }}>
                    {results.dcaFinalValue >= results.lsFinalValue ? '+' : ''}{fmt(results.dcaFinalValue - results.lsFinalValue)}
                  </div>
                  <div style={{ color: '#64748B', fontSize: 11, marginTop: 2 }}>
                    DCA {results.dcaFinalValue >= results.lsFinalValue ? 'outperforms' : 'underperforms'}
                  </div>
                </div>
              </>
            )}
          </div>

          <div style={{ ...cardStyle, marginBottom: 24 }}>
            <h3 style={{ color: '#CBD5E1', marginBottom: 16, fontSize: 15 }}>Portfolio Value Over Time</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={results.table} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" />
                <XAxis dataKey="year" stroke="#64748B" tick={{ fill: '#64748B', fontSize: 12 }} label={{ value: 'Year', position: 'insideBottom', offset: -2, fill: '#64748B', fontSize: 12 }} />
                <YAxis stroke="#64748B" tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={v => '$' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ color: '#CBD5E1', fontSize: 13 }} />
                <Line type="monotone" dataKey="dcaValue" name="DCA Value" stroke="#D4AF37" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="invested" name="Amount Invested" stroke="#60A5FA" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                {results.hasLumpSum && (
                  <Line type="monotone" dataKey="lsValue" name="Lump Sum Value" stroke="#4ADE80" strokeWidth={2} dot={false} />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={cardStyle}>
            <h3 style={{ color: '#CBD5E1', marginBottom: 12, fontSize: 15 }}>Year-by-Year DCA Growth</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1E293B' }}>
                    {['Year', 'DCA Portfolio Value', 'Total Invested', 'Total Gain', ...(results.hasLumpSum ? ['Lump Sum Value'] : [])].map(h => (
                      <th key={h} style={{ padding: '8px 12px', color: '#64748B', textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.table.map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #1E293B22' }}>
                      <td style={{ padding: '8px 12px', color: '#CBD5E1', textAlign: 'right' }}>{row.year}</td>
                      <td style={{ padding: '8px 12px', color: '#D4AF37', textAlign: 'right', fontWeight: 600 }}>{fmt(row.dcaValue)}</td>
                      <td style={{ padding: '8px 12px', color: '#60A5FA', textAlign: 'right' }}>{fmt(row.invested)}</td>
                      <td style={{ padding: '8px 12px', color: '#4ADE80', textAlign: 'right' }}>{fmt(row.dcaGain)}</td>
                      {results.hasLumpSum && (
                        <td style={{ padding: '8px 12px', color: '#4ADE80', textAlign: 'right' }}>{row.lsValue != null ? fmt(row.lsValue) : '—'}</td>
                      )}
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
