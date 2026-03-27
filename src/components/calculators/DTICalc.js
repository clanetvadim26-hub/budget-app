import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';

const inp = { background: '#0A1020', border: '1px solid #1E293B', color: '#F1F5F9', borderRadius: 8, padding: '10px 12px', width: '100%', boxSizing: 'border-box', fontSize: 14 };
const lbl = { fontSize: 12, color: '#64748B', display: 'block', marginBottom: 4 };
const card = { background: '#131d35', border: '1px solid #1E293B', borderRadius: 12, padding: 16 };
const calcBtn = { background: '#D4AF37', color: '#0A0F1E', fontWeight: 700, border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, cursor: 'pointer' };
const resetBtn = { background: 'transparent', border: '1px solid #334155', color: '#94A3B8', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontSize: 14 };

const fmt = (v) => '$' + Math.round(v).toLocaleString();

const getRating = (dti) => {
  if (dti < 20) return { label: 'Excellent', color: '#4ADE80' };
  if (dti < 35) return { label: 'Good', color: '#60A5FA' };
  if (dti < 43) return { label: 'Fair', color: '#D4AF37' };
  return { label: 'Poor', color: '#F87171' };
};

export default function DTICalc() {
  const [grossIncome, setGrossIncome] = useState('');
  const [mortgage, setMortgage] = useState('');
  const [carPayment, setCarPayment] = useState('');
  const [studentLoans, setStudentLoans] = useState('');
  const [creditCards, setCreditCards] = useState('');
  const [otherLoans, setOtherLoans] = useState('');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const income = parseFloat(grossIncome) || 0;
    if (income === 0) return;
    const m = parseFloat(mortgage) || 0;
    const c = parseFloat(carPayment) || 0;
    const s = parseFloat(studentLoans) || 0;
    const cc = parseFloat(creditCards) || 0;
    const o = parseFloat(otherLoans) || 0;

    const totalDebt = m + c + s + cc + o;
    const frontDTI = (m / income) * 100;
    const backDTI = (totalDebt / income) * 100;

    const maxDebtAt43 = income * 0.43;
    const additionalAllowed = Math.max(maxDebtAt43 - totalDebt, 0);

    const chartData = [
      { name: 'Mortgage / Rent', value: parseFloat((m / income * 100).toFixed(1)), amount: m, fill: '#60A5FA' },
      { name: 'Car Payment', value: parseFloat((c / income * 100).toFixed(1)), amount: c, fill: '#A78BFA' },
      { name: 'Student Loans', value: parseFloat((s / income * 100).toFixed(1)), amount: s, fill: '#4ADE80' },
      { name: 'Credit Cards', value: parseFloat((cc / income * 100).toFixed(1)), amount: cc, fill: '#F87171' },
      { name: 'Other Loans', value: parseFloat((o / income * 100).toFixed(1)), amount: o, fill: '#D4AF37' },
    ].filter(d => d.amount > 0);

    const frontRating = getRating(frontDTI);
    const backRating = getRating(backDTI);

    let mortgageNote = '';
    if (backDTI <= 28) mortgageNote = 'Excellent. You likely qualify for the best mortgage rates.';
    else if (backDTI <= 36) mortgageNote = 'Good. You meet conventional mortgage guidelines (preferred ≤36%).';
    else if (backDTI <= 43) mortgageNote = 'Caution. You may qualify for FHA loans but not conventional. At the limit.';
    else mortgageNote = 'High DTI. Most lenders will not approve a mortgage. Focus on paying down debt first.';

    setResult({ income, frontDTI, backDTI, totalDebt, additionalAllowed, chartData, frontRating, backRating, mortgageNote });
  };

  const reset = () => {
    setGrossIncome(''); setMortgage(''); setCarPayment('');
    setStudentLoans(''); setCreditCards(''); setOtherLoans(''); setResult(null);
  };

  return (
    <div style={{ color: '#F1F5F9', fontFamily: 'inherit' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Debt-to-Income Ratio Calculator</h2>
        <p style={{ color: '#64748B', fontSize: 14, margin: 0 }}>Understand your DTI and mortgage qualification standing</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 20 }}>
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16 }}>Income</div>
          <div>
            <label style={lbl}>Gross Monthly Income ($)</label>
            <input style={inp} type="number" placeholder="6000" value={grossIncome} onChange={e => setGrossIncome(e.target.value)} />
          </div>
        </div>

        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16 }}>Monthly Debt Payments</div>
          <div style={{ display: 'grid', gap: 12 }}>
            {[
              ['Mortgage / Rent ($)', mortgage, setMortgage, '1500'],
              ['Car Payment ($)', carPayment, setCarPayment, '400'],
              ['Student Loans ($)', studentLoans, setStudentLoans, '300'],
              ['Credit Cards ($)', creditCards, setCreditCards, '150'],
              ['Other Loans ($)', otherLoans, setOtherLoans, '0'],
            ].map(([label, val, setter, ph]) => (
              <div key={label}>
                <label style={lbl}>{label}</label>
                <input style={inp} type="number" placeholder={ph} value={val} onChange={e => setter(e.target.value)} />
              </div>
            ))}
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
            <div style={card}>
              <div style={{ fontSize: 12, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Front-End DTI</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: result.frontRating.color }}>{result.frontDTI.toFixed(1)}%</div>
              <div style={{ fontSize: 12, color: result.frontRating.color, marginTop: 4 }}>{result.frontRating.label}</div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>Housing costs only</div>
            </div>
            <div style={card}>
              <div style={{ fontSize: 12, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Back-End DTI</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: result.backRating.color }}>{result.backDTI.toFixed(1)}%</div>
              <div style={{ fontSize: 12, color: result.backRating.color, marginTop: 4 }}>{result.backRating.label}</div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>All debt payments</div>
            </div>
            <div style={card}>
              <div style={{ fontSize: 12, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Total Monthly Debt</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#F1F5F9' }}>{fmt(result.totalDebt)}</div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>of {fmt(result.income)} income</div>
            </div>
            <div style={card}>
              <div style={{ fontSize: 12, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Max Extra Debt (43%)</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: result.additionalAllowed > 0 ? '#4ADE80' : '#F87171' }}>
                {result.additionalAllowed > 0 ? fmt(result.additionalAllowed) : 'Over Limit'}
              </div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>Before FHA limit</div>
            </div>
          </div>

          <div style={{ ...card, marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#94A3B8', marginBottom: 8 }}>Mortgage Qualification</div>
            <div style={{ fontSize: 14, color: result.backRating.color, lineHeight: 1.6 }}>{result.mortgageNote}</div>
            <div style={{ display: 'flex', gap: 20, marginTop: 12, flexWrap: 'wrap' }}>
              {[['≤28%', 'Conventional ideal', '#4ADE80'], ['≤36%', 'Conventional max', '#60A5FA'], ['≤43%', 'FHA max', '#D4AF37'], ['>43%', 'Likely denied', '#F87171']].map(([pct, label, color]) => (
                <div key={pct} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }}></span>
                  <span style={{ fontSize: 12, color: '#94A3B8' }}><strong style={{ color }}>{pct}</strong> {label}</span>
                </div>
              ))}
            </div>
          </div>

          {result.chartData.length > 0 && (
            <div style={card}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#94A3B8', marginBottom: 16 }}>Debt Breakdown as % of Income</div>
              <ResponsiveContainer width="100%" height={Math.max(result.chartData.length * 55, 160)}>
                <BarChart data={result.chartData} layout="vertical" margin={{ left: 10, right: 60, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" horizontal={false} />
                  <XAxis type="number" domain={[0, Math.max(50, result.backDTI + 5)]} tickFormatter={v => v + '%'} stroke="#334155" tick={{ fill: '#64748B', fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fill: '#94A3B8', fontSize: 12 }} />
                  <Tooltip formatter={(val, _name, props) => [`${val}% (${fmt(props.payload.amount)})`, 'Share of Income']} contentStyle={{ background: '#131d35', border: '1px solid #1E293B', borderRadius: 8 }} />
                  <ReferenceLine x={43} stroke="#F87171" strokeDasharray="4 4" label={{ value: '43% FHA', fill: '#F87171', fontSize: 10, position: 'insideTopRight' }} />
                  <ReferenceLine x={36} stroke="#D4AF37" strokeDasharray="4 4" label={{ value: '36% Conv.', fill: '#D4AF37', fontSize: 10, position: 'insideTopRight' }} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} label={{ position: 'right', fill: '#94A3B8', fontSize: 11, formatter: v => v + '%' }}>
                    {result.chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
