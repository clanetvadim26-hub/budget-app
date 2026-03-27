import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
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

function fmt(n, decimals = 2) {
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function calcYTM(faceValue, coupon, price, periods, freqPerYear) {
  // Newton-Raphson YTM approximation (per period rate -> annualized)
  // Initial guess using approximation formula
  const annualCoupon = coupon;
  const years = periods / freqPerYear;
  const ytmApprox = (annualCoupon + (faceValue - price) / years) / ((faceValue + price) / 2);

  // Newton-Raphson refinement on periodic rate
  let r = ytmApprox / freqPerYear;
  for (let iter = 0; iter < 100; iter++) {
    let pv = 0;
    let dpv = 0;
    for (let t = 1; t <= periods; t++) {
      const cf = t === periods ? coupon / freqPerYear + faceValue : coupon / freqPerYear;
      const disc = Math.pow(1 + r, t);
      pv += cf / disc;
      dpv -= t * cf / (disc * (1 + r));
    }
    const diff = pv - price;
    if (Math.abs(diff) < 0.0001) break;
    r = r - diff / dpv;
  }
  return r * freqPerYear; // annualized YTM
}

function calcMacaulayDuration(faceValue, annualCoupon, ytm, periods, freqPerYear, price) {
  const periodicRate = ytm / freqPerYear;
  let weightedSum = 0;
  let pvSum = 0;
  for (let t = 1; t <= periods; t++) {
    const cf = t === periods ? annualCoupon / freqPerYear + faceValue : annualCoupon / freqPerYear;
    const pv = cf / Math.pow(1 + periodicRate, t);
    const timeInYears = t / freqPerYear;
    weightedSum += timeInYears * pv;
    pvSum += pv;
  }
  return weightedSum / pvSum;
}

export default function BondCalc() {
  const [faceValue, setFaceValue] = useState('1000');
  const [couponRate, setCouponRate] = useState('5');
  const [maturity, setMaturity] = useState('10');
  const [currentPrice, setCurrentPrice] = useState('950');
  const [couponFreq, setCouponFreq] = useState('Semi-annual');
  const [results, setResults] = useState(null);

  const freqMap = { Annual: 1, 'Semi-annual': 2 };

  function calculate() {
    const FV = parseFloat(faceValue) || 1000;
    const couponRatePct = (parseFloat(couponRate) || 0) / 100;
    const Y = parseInt(maturity) || 1;
    const price = parseFloat(currentPrice) || FV;
    const n = freqMap[couponFreq];
    const periods = Y * n;
    const annualCoupon = FV * couponRatePct;

    const currentYield = (annualCoupon / price) * 100;

    const ytm = calcYTM(FV, annualCoupon, price, periods, n);
    const ytmPct = ytm * 100;

    const macDuration = calcMacaulayDuration(FV, annualCoupon, ytm, periods, n, price);
    const modDuration = macDuration / (1 + ytm / n);

    // Price sensitivity per 1% rate change (dollar value of a basis point * 100)
    const priceSensitivity = -modDuration * price * 0.01;

    // Cash flow chart data
    const cashFlows = [];
    for (let t = 1; t <= periods; t++) {
      const label = couponFreq === 'Annual' ? `Y${t}` : `P${t}`;
      const cf = t === periods ? annualCoupon / n + FV : annualCoupon / n;
      cashFlows.push({ period: label, cashFlow: parseFloat(cf.toFixed(2)), isFinal: t === periods });
    }

    const premium = price > FV ? 'Premium' : price < FV ? 'Discount' : 'Par';
    const premiumColor = price > FV ? '#F87171' : price < FV ? '#4ADE80' : '#64748B';

    setResults({ currentYield, ytmPct, macDuration, modDuration, priceSensitivity, cashFlows, FV, annualCoupon, price, premium, premiumColor });
  }

  function reset() {
    setFaceValue('1000'); setCouponRate('5'); setMaturity('10'); setCurrentPrice('950'); setCouponFreq('Semi-annual'); setResults(null);
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <div style={{ background: '#0D1426', border: '1px solid #1E293B', borderRadius: 8, padding: '10px 14px' }}>
        <p style={{ color: '#CBD5E1', marginBottom: 4, fontWeight: 600 }}>Period: {label}</p>
        <p style={{ color: '#D4AF37', margin: 0, fontSize: 13 }}>Cash Flow: {fmt(payload[0].value)}</p>
      </div>
    );
  };

  return (
    <div style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <h2 style={{ color: '#F1F5F9', marginBottom: 4, fontSize: 22 }}>Bond Duration & Yield Calculator</h2>
      <p style={{ color: '#64748B', marginBottom: 24, fontSize: 14 }}>Calculate YTM, Macaulay/Modified duration, and price sensitivity for bonds.</p>

      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))', gap: 16 }}>
          <div>
            <label style={labelStyle}>Face Value ($)</label>
            <input style={inputStyle} type="number" value={faceValue} onChange={e => setFaceValue(e.target.value)} min="0" step="100" />
          </div>
          <div>
            <label style={labelStyle}>Coupon Rate (%)</label>
            <input style={inputStyle} type="number" value={couponRate} onChange={e => setCouponRate(e.target.value)} min="0" step="0.1" />
          </div>
          <div>
            <label style={labelStyle}>Years to Maturity</label>
            <input style={inputStyle} type="number" value={maturity} onChange={e => setMaturity(e.target.value)} min="1" max="50" />
          </div>
          <div>
            <label style={labelStyle}>Current Price ($)</label>
            <input style={inputStyle} type="number" value={currentPrice} onChange={e => setCurrentPrice(e.target.value)} min="0" step="1" />
          </div>
          <div>
            <label style={labelStyle}>Coupon Frequency</label>
            <select style={inputStyle} value={couponFreq} onChange={e => setCouponFreq(e.target.value)}>
              <option value="Annual">Annual</option>
              <option value="Semi-annual">Semi-annual</option>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: 16, marginBottom: 24 }}>
            <div style={cardStyle}>
              <div style={{ color: '#64748B', fontSize: 12, marginBottom: 6 }}>Current Yield</div>
              <div style={{ color: '#D4AF37', fontSize: 22, fontWeight: 700 }}>{results.currentYield.toFixed(3)}%</div>
            </div>
            <div style={cardStyle}>
              <div style={{ color: '#64748B', fontSize: 12, marginBottom: 6 }}>Yield to Maturity (YTM)</div>
              <div style={{ color: '#D4AF37', fontSize: 22, fontWeight: 700 }}>{results.ytmPct.toFixed(3)}%</div>
            </div>
            <div style={cardStyle}>
              <div style={{ color: '#64748B', fontSize: 12, marginBottom: 6 }}>Macaulay Duration</div>
              <div style={{ color: '#60A5FA', fontSize: 22, fontWeight: 700 }}>{results.macDuration.toFixed(3)}</div>
              <div style={{ color: '#64748B', fontSize: 11 }}>years</div>
            </div>
            <div style={cardStyle}>
              <div style={{ color: '#64748B', fontSize: 12, marginBottom: 6 }}>Modified Duration</div>
              <div style={{ color: '#60A5FA', fontSize: 22, fontWeight: 700 }}>{results.modDuration.toFixed(3)}</div>
              <div style={{ color: '#64748B', fontSize: 11 }}>years</div>
            </div>
            <div style={cardStyle}>
              <div style={{ color: '#64748B', fontSize: 12, marginBottom: 6 }}>Price Sensitivity (per 1%)</div>
              <div style={{ color: '#F87171', fontSize: 20, fontWeight: 700 }}>{results.priceSensitivity >= 0 ? '+' : ''}{fmt(results.priceSensitivity)}</div>
              <div style={{ color: '#64748B', fontSize: 11 }}>rate change</div>
            </div>
            <div style={cardStyle}>
              <div style={{ color: '#64748B', fontSize: 12, marginBottom: 6 }}>Trading At</div>
              <div style={{ color: results.premiumColor, fontSize: 20, fontWeight: 700 }}>{results.premium}</div>
              <div style={{ color: '#64748B', fontSize: 11 }}>
                {results.price > results.FV ? `${fmt(results.price - results.FV)} above par` :
                  results.price < results.FV ? `${fmt(results.FV - results.price)} below par` : 'at par'}
              </div>
            </div>
          </div>

          <div style={{ ...cardStyle, marginBottom: 24 }}>
            <h3 style={{ color: '#CBD5E1', marginBottom: 16, fontSize: 15 }}>Cash Flows by Period</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={results.cashFlows} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" />
                <XAxis
                  dataKey="period"
                  stroke="#64748B"
                  tick={{ fill: '#64748B', fontSize: results.cashFlows.length > 20 ? 9 : 11 }}
                  interval={results.cashFlows.length > 20 ? Math.floor(results.cashFlows.length / 10) : 0}
                  label={{ value: 'Period', position: 'insideBottom', offset: -2, fill: '#64748B', fontSize: 12 }}
                />
                <YAxis stroke="#64748B" tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={v => '$' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="cashFlow" name="Cash Flow" radius={[3, 3, 0, 0]}>
                  {results.cashFlows.map((entry, i) => (
                    <Cell key={i} fill={entry.isFinal ? '#D4AF37' : '#60A5FA'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: 20, marginTop: 8, fontSize: 12, color: '#64748B' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ display: 'inline-block', width: 12, height: 12, background: '#60A5FA', borderRadius: 2 }}></span> Coupon Payment
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ display: 'inline-block', width: 12, height: 12, background: '#D4AF37', borderRadius: 2 }}></span> Final Payment (Coupon + Principal)
              </span>
            </div>
          </div>

          <div style={cardStyle}>
            <h3 style={{ color: '#CBD5E1', marginBottom: 12, fontSize: 15 }}>Bond Summary</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, fontSize: 13 }}>
              {[
                { label: 'Annual Coupon Payment', value: fmt(results.annualCoupon), color: '#CBD5E1' },
                { label: 'Annual Coupon Rate', value: couponRate + '%', color: '#CBD5E1' },
                { label: 'YTM vs Coupon Rate', value: results.ytmPct > parseFloat(couponRate) ? `YTM higher by ${(results.ytmPct - parseFloat(couponRate)).toFixed(3)}%` : results.ytmPct < parseFloat(couponRate) ? `Coupon higher by ${(parseFloat(couponRate) - results.ytmPct).toFixed(3)}%` : 'Equal', color: results.ytmPct > parseFloat(couponRate) ? '#4ADE80' : results.ytmPct < parseFloat(couponRate) ? '#F87171' : '#64748B' },
                { label: 'Dollar Duration (DV01)', value: fmt(results.modDuration * results.price * 0.0001), color: '#CBD5E1' },
              ].map(item => (
                <div key={item.label} style={{ background: '#0D1426', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ color: '#64748B', fontSize: 11, marginBottom: 4 }}>{item.label}</div>
                  <div style={{ color: item.color, fontWeight: 600 }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
