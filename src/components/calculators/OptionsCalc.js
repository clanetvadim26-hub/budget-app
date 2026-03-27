import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
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

function fmtPnl(n) {
  const abs = '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (n >= 0 ? '+' : '-') + abs;
}

function calcPnl(type, position, strike, premium, contracts, spot) {
  const mult = 100 * contracts;
  let pnl;
  if (type === 'Call') {
    const intrinsic = Math.max(0, spot - strike);
    if (position === 'Long') {
      pnl = (intrinsic - premium) * mult;
    } else {
      pnl = (premium - intrinsic) * mult;
    }
  } else {
    // Put
    const intrinsic = Math.max(0, strike - spot);
    if (position === 'Long') {
      pnl = (intrinsic - premium) * mult;
    } else {
      pnl = (premium - intrinsic) * mult;
    }
  }
  return pnl;
}

export default function OptionsCalc() {
  const [optType, setOptType] = useState('Call');
  const [position, setPosition] = useState('Long');
  const [strike, setStrike] = useState('150');
  const [premium, setPremium] = useState('5');
  const [contracts, setContracts] = useState('1');
  const [priceMin, setPriceMin] = useState('100');
  const [priceMax, setPriceMax] = useState('200');
  const [spotPrice, setSpotPrice] = useState('155');
  const [results, setResults] = useState(null);

  function calculate() {
    const K = parseFloat(strike) || 0;
    const P = parseFloat(premium) || 0;
    const C = parseInt(contracts) || 1;
    const min = parseFloat(priceMin) || 0;
    const max = parseFloat(priceMax) || 200;
    const spot = parseFloat(spotPrice) || K;
    const mult = 100 * C;

    // Break-even
    let breakEven;
    if (optType === 'Call') {
      breakEven = position === 'Long' ? K + P : K + P;
    } else {
      breakEven = position === 'Long' ? K - P : K - P;
    }

    // Max profit / loss
    let maxProfit, maxLoss;
    if (optType === 'Call' && position === 'Long') {
      maxProfit = Infinity;
      maxLoss = -P * mult;
    } else if (optType === 'Call' && position === 'Short') {
      maxProfit = P * mult;
      maxLoss = -Infinity;
    } else if (optType === 'Put' && position === 'Long') {
      maxProfit = (K - P) * mult;
      maxLoss = -P * mult;
    } else {
      // Short Put
      maxProfit = P * mult;
      maxLoss = -(K - P) * mult;
    }

    const currentPnl = calcPnl(optType, position, K, P, C, spot);

    // Build chart data
    const steps = 60;
    const step = (max - min) / steps;
    const chartData = [];
    for (let i = 0; i <= steps; i++) {
      const s = min + i * step;
      const pnl = calcPnl(optType, position, K, P, C, s);
      chartData.push({ price: parseFloat(s.toFixed(2)), pnl: parseFloat(pnl.toFixed(2)) });
    }

    setResults({ breakEven, maxProfit, maxLoss, currentPnl, chartData, spot, breakEvenInRange: breakEven >= min && breakEven <= max });
  }

  function reset() {
    setOptType('Call'); setPosition('Long'); setStrike('150'); setPremium('5');
    setContracts('1'); setPriceMin('100'); setPriceMax('200'); setSpotPrice('155'); setResults(null);
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const val = payload[0].value;
    return (
      <div style={{ background: '#0D1426', border: '1px solid #1E293B', borderRadius: 8, padding: '10px 14px' }}>
        <p style={{ color: '#CBD5E1', marginBottom: 4, fontWeight: 600 }}>Price: ${Number(label).toFixed(2)}</p>
        <p style={{ color: val >= 0 ? '#4ADE80' : '#F87171', margin: 0, fontSize: 13, fontWeight: 700 }}>P&L: {fmtPnl(val)}</p>
      </div>
    );
  };

  const selectStyle = { ...inputStyle };

  return (
    <div style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <h2 style={{ color: '#F1F5F9', marginBottom: 4, fontSize: 22 }}>Options P&L Calculator</h2>
      <p style={{ color: '#64748B', marginBottom: 24, fontSize: 14 }}>Calculate profit and loss for call and put options across a range of underlying prices.</p>

      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: 16 }}>
          <div>
            <label style={labelStyle}>Option Type</label>
            <select style={selectStyle} value={optType} onChange={e => setOptType(e.target.value)}>
              <option value="Call">Call</option>
              <option value="Put">Put</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Position</label>
            <select style={selectStyle} value={position} onChange={e => setPosition(e.target.value)}>
              <option value="Long">Long (Buy)</option>
              <option value="Short">Short (Sell/Write)</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Strike Price ($)</label>
            <input style={inputStyle} type="number" value={strike} onChange={e => setStrike(e.target.value)} min="0" step="0.5" />
          </div>
          <div>
            <label style={labelStyle}>Premium per Share ($)</label>
            <input style={inputStyle} type="number" value={premium} onChange={e => setPremium(e.target.value)} min="0" step="0.01" />
          </div>
          <div>
            <label style={labelStyle}>Number of Contracts</label>
            <input style={inputStyle} type="number" value={contracts} onChange={e => setContracts(e.target.value)} min="1" />
          </div>
          <div>
            <label style={labelStyle}>Current Spot Price ($)</label>
            <input style={inputStyle} type="number" value={spotPrice} onChange={e => setSpotPrice(e.target.value)} min="0" step="0.5" />
          </div>
          <div>
            <label style={labelStyle}>Price Range Min ($)</label>
            <input style={inputStyle} type="number" value={priceMin} onChange={e => setPriceMin(e.target.value)} min="0" step="1" />
          </div>
          <div>
            <label style={labelStyle}>Price Range Max ($)</label>
            <input style={inputStyle} type="number" value={priceMax} onChange={e => setPriceMax(e.target.value)} min="0" step="1" />
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
              <div style={{ color: '#64748B', fontSize: 12, marginBottom: 6 }}>Break-Even Price</div>
              <div style={{ color: '#D4AF37', fontSize: 22, fontWeight: 700 }}>${results.breakEven.toFixed(2)}</div>
            </div>
            <div style={cardStyle}>
              <div style={{ color: '#64748B', fontSize: 12, marginBottom: 6 }}>Max Profit</div>
              <div style={{ color: '#4ADE80', fontSize: 20, fontWeight: 700 }}>
                {results.maxProfit === Infinity ? 'Unlimited' : results.maxProfit === -Infinity ? 'Unlimited Loss' : fmtPnl(results.maxProfit)}
              </div>
            </div>
            <div style={cardStyle}>
              <div style={{ color: '#64748B', fontSize: 12, marginBottom: 6 }}>Max Loss</div>
              <div style={{ color: '#F87171', fontSize: 20, fontWeight: 700 }}>
                {results.maxLoss === -Infinity ? 'Unlimited' : fmtPnl(results.maxLoss)}
              </div>
            </div>
            <div style={cardStyle}>
              <div style={{ color: '#64748B', fontSize: 12, marginBottom: 6 }}>Current P&L @ ${results.spot.toFixed(2)}</div>
              <div style={{ color: results.currentPnl >= 0 ? '#4ADE80' : '#F87171', fontSize: 22, fontWeight: 700 }}>
                {fmtPnl(results.currentPnl)}
              </div>
            </div>
          </div>

          <div style={cardStyle}>
            <h3 style={{ color: '#CBD5E1', marginBottom: 16, fontSize: 15 }}>P&L vs Underlying Price</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={results.chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" />
                <XAxis
                  dataKey="price"
                  stroke="#64748B"
                  tick={{ fill: '#64748B', fontSize: 11 }}
                  tickFormatter={v => '$' + v}
                  label={{ value: 'Underlying Price', position: 'insideBottom', offset: -2, fill: '#64748B', fontSize: 12 }}
                />
                <YAxis
                  stroke="#64748B"
                  tick={{ fill: '#64748B', fontSize: 11 }}
                  tickFormatter={v => (v >= 0 ? '+$' : '-$') + Math.abs(v).toLocaleString()}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke="#334155" strokeWidth={1.5} />
                {results.breakEvenInRange && (
                  <ReferenceLine x={results.breakEven} stroke="#D4AF37" strokeDasharray="4 4" label={{ value: 'B/E', position: 'top', fill: '#D4AF37', fontSize: 11 }} />
                )}
                <ReferenceLine x={results.spot} stroke="#60A5FA" strokeDasharray="4 4" label={{ value: 'Spot', position: 'top', fill: '#60A5FA', fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="pnl"
                  name="P&L"
                  stroke="#D4AF37"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5, fill: '#D4AF37' }}
                />
              </LineChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: 20, marginTop: 12, fontSize: 12, color: '#64748B' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ display: 'inline-block', width: 24, height: 2, background: '#D4AF37', verticalAlign: 'middle' }}></span> P&L
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ display: 'inline-block', width: 24, height: 2, background: '#D4AF37', borderTop: '2px dashed #D4AF37', verticalAlign: 'middle' }}></span> Break-Even
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ display: 'inline-block', width: 24, height: 2, background: '#60A5FA', borderTop: '2px dashed #60A5FA', verticalAlign: 'middle' }}></span> Spot Price
              </span>
            </div>
          </div>

          <div style={{ ...cardStyle, marginTop: 16, fontSize: 13, color: '#94A3B8' }}>
            <strong style={{ color: '#CBD5E1' }}>Strategy Summary: </strong>
            {position} {optType} — 1 contract = 100 shares. Premium total cost: ${(parseFloat(premium) * 100 * parseInt(contracts)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            {' '}(${premium}/share × 100 × {contracts} contract{parseInt(contracts) > 1 ? 's' : ''}).
          </div>
        </>
      )}
    </div>
  );
}
