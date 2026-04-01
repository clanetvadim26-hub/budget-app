import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { InflationAdjuster, fmt, calcMonthlyPayment } from './shared';

const s = {
  wrap: { padding: '24px', color: '#F1F5F9', fontFamily: 'Inter, sans-serif' },
  h1: { fontSize: '22px', fontWeight: '700', color: '#F1F5F9', margin: '0 0 4px' },
  sub: { fontSize: '14px', color: '#64748B', margin: '0 0 24px' },
  card: { background: '#131d35', border: '1px solid #1E293B', borderRadius: '14px', padding: '20px', marginBottom: '20px' },
  secTitle: { fontSize: '15px', fontWeight: '600', color: '#CBD5E1', marginBottom: '14px' },
  grid: { display: 'flex', flexWrap: 'wrap', gap: '14px' },
  group: { display: 'flex', flexDirection: 'column', gap: '6px', flex: '1 1 170px' },
  label: { fontSize: '12px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 },
  input: { background: '#131d35', border: '1px solid #1E293B', color: '#E2E8F0', borderRadius: 10, fontSize: 16, padding: '11px 14px', outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' },
  btnRow: { display: 'flex', gap: '10px', marginTop: '18px', flexWrap: 'wrap' },
  calcBtn: { flex: 1, padding: 13, background: 'linear-gradient(135deg, #D4AF37, #B8962A)', border: 'none', borderRadius: 10, color: '#0A0F1E', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
  resetBtn: { padding: '13px 20px', background: 'transparent', border: '1px solid #1E293B', borderRadius: 10, color: '#64748B', fontSize: 14, cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
  statsGrid: { display: 'flex', flexWrap: 'wrap', gap: '14px' },
  statCard: { background: '#131d35', border: '1px solid #1E293B', borderRadius: 12, padding: 16, flex: '1 1 150px' },
  statLabel: { fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6, fontWeight: 600 },
  statVal: { fontSize: 22, fontWeight: 800 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: { textAlign: 'left', padding: '10px 12px', color: '#64748B', fontWeight: '600', borderBottom: '1px solid #1E293B', fontSize: '12px', textTransform: 'uppercase' },
  td: { padding: '9px 12px', color: '#CBD5E1', borderBottom: '1px solid #1E293B' },
};

const DEFAULTS = {
  homePrice: '450000',
  downPct: '20',
  mortgageRate: '7.0',
  termYears: '30',
  propertyTaxRate: '1.2',
  maintenancePct: '1.0',
  annualInsurance: '2000',
  hoa: '0',
  monthlyRent: '2200',
  rentIncrease: '3',
  appreciation: '3.5',
  investReturn: '7',
};

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 8, padding: '10px 14px' }}>
      <p style={{ color: '#94A3B8', fontSize: '12px', margin: '0 0 6px' }}>Year {label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color, fontSize: '13px', fontWeight: '600', margin: '2px 0' }}>
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  );
};

export default function RentVsBuyCalc() {
  const [form, setForm] = useState(DEFAULTS);
  const [results, setResults] = useState(null);
  const [inflEnabled, setInflEnabled] = useState(false);
  const [inflRate, setInflRate] = useState(3);

  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const calculate = () => {
    const homePrice = parseFloat(form.homePrice) || 0;
    const downPct = (parseFloat(form.downPct) || 20) / 100;
    const mortgageRate = parseFloat(form.mortgageRate) || 0;
    const termYears = parseInt(form.termYears) || 30;
    const propTaxRate = (parseFloat(form.propertyTaxRate) || 0) / 100;
    const maintPct = (parseFloat(form.maintenancePct) || 0) / 100;
    const annInsurance = parseFloat(form.annualInsurance) || 0;
    const hoa = parseFloat(form.hoa) || 0;
    const monthlyRent0 = parseFloat(form.monthlyRent) || 0;
    const rentIncrease = (parseFloat(form.rentIncrease) || 0) / 100;
    const appreciation = (parseFloat(form.appreciation) || 0) / 100;
    const invReturn = (parseFloat(form.investReturn) || 0) / 100;

    const downPayment = homePrice * downPct;
    const loanAmount = homePrice - downPayment;
    const closingCosts = homePrice * 0.025; // ~2.5% buyer closing costs
    const piPayment = calcMonthlyPayment(loanAmount, mortgageRate, termYears * 12);
    const r = mortgageRate / 100 / 12;
    const n = termYears * 12;

    const chartData = [];
    let breakEvenYear = null;

    // Renter starting portfolio = down payment + closing costs (invested)
    let rentPortfolio = downPayment + closingCosts;

    for (let y = 1; y <= 30; y++) {
      // --- BUY scenario ---
      // Home value at year y
      const homeValue = homePrice * Math.pow(1 + appreciation, y);

      // Remaining mortgage balance after y years
      const monthsPaid = Math.min(y * 12, n);
      const mortgageBalance = monthsPaid >= n ? 0 :
        loanAmount * (Math.pow(1 + r, n) - Math.pow(1 + r, monthsPaid)) / (Math.pow(1 + r, n) - 1);

      // Selling costs (6% realtor + 1% closing)
      const sellingCosts = homeValue * 0.07;
      const buyNetEquity = homeValue - mortgageBalance - sellingCosts;

      // Buy monthly costs for this year
      const homeValueMidYear = homePrice * Math.pow(1 + appreciation, y - 0.5);
      const annualTax = homeValueMidYear * propTaxRate;
      const annualMaint = homeValueMidYear * maintPct;
      const annualBuyCost = piPayment * 12 + annualTax + annualMaint + annInsurance + hoa * 12;

      // --- RENT scenario ---
      const annualRent = monthlyRent0 * 12 * Math.pow(1 + rentIncrease, y - 1);

      // Renter invests the down payment + annual cost difference
      const annualDiff = annualBuyCost - annualRent; // positive = buyer pays more
      rentPortfolio = rentPortfolio * (1 + invReturn) + annualDiff;
      // If buying is cheaper (annualDiff < 0), the renter's portfolio grows less

      let buyNW = buyNetEquity;
      let rentNW = rentPortfolio;

      if (inflEnabled) {
        const deflate = Math.pow(1 + inflRate / 100, y);
        buyNW = buyNW / deflate;
        rentNW = rentNW / deflate;
      }

      if (breakEvenYear === null && buyNW > rentNW) {
        breakEvenYear = y;
      }

      chartData.push({
        year: y,
        'Buy Net Wealth': Math.round(buyNW),
        'Rent Net Wealth': Math.round(rentNW),
      });
    }

    const finalBuy = chartData[chartData.length - 1]['Buy Net Wealth'];
    const finalRent = chartData[chartData.length - 1]['Rent Net Wealth'];

    setResults({
      piPayment,
      downPayment,
      closingCosts,
      monthlyBuyTotal: piPayment + (homePrice * propTaxRate) / 12 + annInsurance / 12 + (homePrice * maintPct) / 12 + hoa,
      breakEvenYear,
      finalBuy,
      finalRent,
      chartData,
    });
  };

  const reset = () => { setForm(DEFAULTS); setResults(null); };

  return (
    <div style={s.wrap}>
      <div style={s.h1}>Rent vs. Buy Calculator</div>
      <div style={s.sub}>Compare the long-term financial impact of renting versus buying a home</div>

      <div style={s.card}>
        <div style={s.secTitle}>Home Purchase</div>
        <div style={s.grid}>
          {[
            { label: 'Home Price ($)', name: 'homePrice', placeholder: '450000' },
            { label: 'Down Payment (%)', name: 'downPct', placeholder: '20' },
            { label: 'Mortgage Rate (%)', name: 'mortgageRate', placeholder: '7.0' },
            { label: 'Loan Term (years)', name: 'termYears', placeholder: '30' },
            { label: 'Property Tax Rate (% annual)', name: 'propertyTaxRate', placeholder: '1.2' },
            { label: 'Annual Maintenance (% home value)', name: 'maintenancePct', placeholder: '1.0' },
            { label: 'Annual Insurance ($)', name: 'annualInsurance', placeholder: '2000' },
            { label: 'Monthly HOA ($)', name: 'hoa', placeholder: '0' },
          ].map(({ label, name, placeholder }) => (
            <div key={name} style={s.group}>
              <label style={s.label}>{label}</label>
              <input style={s.input} name={name} value={form[name]} onChange={set} placeholder={placeholder} type="number" min="0" step="any" />
            </div>
          ))}
        </div>
      </div>

      <div style={s.card}>
        <div style={s.secTitle}>Renting & Returns</div>
        <div style={s.grid}>
          {[
            { label: 'Monthly Rent ($)', name: 'monthlyRent', placeholder: '2200' },
            { label: 'Annual Rent Increase (%)', name: 'rentIncrease', placeholder: '3' },
            { label: 'Home Appreciation (% annual)', name: 'appreciation', placeholder: '3.5' },
            { label: 'Investment Return (% annual)', name: 'investReturn', placeholder: '7' },
          ].map(({ label, name, placeholder }) => (
            <div key={name} style={s.group}>
              <label style={s.label}>{label}</label>
              <input style={s.input} name={name} value={form[name]} onChange={set} placeholder={placeholder} type="number" min="0" step="any" />
            </div>
          ))}
        </div>
        <InflationAdjuster enabled={inflEnabled} rate={inflRate} onToggle={setInflEnabled} onRateChange={setInflRate} />
        <div style={s.btnRow}>
          <button style={s.calcBtn} onClick={calculate}>Calculate</button>
          <button style={s.resetBtn} onClick={reset}>Reset</button>
        </div>
      </div>

      {results && (
        <>
          <div style={s.card}>
            <div style={s.secTitle}>Summary</div>
            <div style={s.statsGrid}>
              <div style={s.statCard}>
                <div style={s.statLabel}>Monthly Mortgage (P&I)</div>
                <div style={{ ...s.statVal, color: '#60A5FA' }}>{fmt(results.piPayment)}</div>
              </div>
              <div style={s.statCard}>
                <div style={s.statLabel}>Est. Total Buy / Month</div>
                <div style={{ ...s.statVal, color: '#D4AF37' }}>{fmt(results.monthlyBuyTotal)}</div>
              </div>
              <div style={s.statCard}>
                <div style={s.statLabel}>Down Payment + Closing</div>
                <div style={{ ...s.statVal, color: '#F87171' }}>{fmt(results.downPayment + results.closingCosts)}</div>
              </div>
              <div style={s.statCard}>
                <div style={s.statLabel}>Break-Even Year</div>
                <div style={{ ...s.statVal, color: results.breakEvenYear ? '#4ADE80' : '#F87171' }}>
                  {results.breakEvenYear ? `Year ${results.breakEvenYear}` : 'Beyond 30 yrs'}
                </div>
              </div>
              <div style={s.statCard}>
                <div style={s.statLabel}>Buy Net Wealth (30yr)</div>
                <div style={{ ...s.statVal, color: '#4ADE80' }}>{fmt(results.finalBuy)}</div>
              </div>
              <div style={s.statCard}>
                <div style={s.statLabel}>Rent Net Wealth (30yr)</div>
                <div style={{ ...s.statVal, color: '#94A3B8' }}>{fmt(results.finalRent)}</div>
              </div>
            </div>
          </div>

          <div style={s.card}>
            <div style={s.secTitle}>Net Wealth Over Time — Buying vs Renting</div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={results.chartData} margin={{ top: 8, right: 20, left: 10, bottom: 20 }}>
                <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" />
                <XAxis dataKey="year" stroke="#334155" tick={{ fill: '#64748B', fontSize: 11 }}
                  label={{ value: 'Year', position: 'insideBottom', offset: -10, fill: '#64748B', fontSize: 12 }} />
                <YAxis stroke="#334155" tick={{ fill: '#64748B', fontSize: 11 }}
                  tickFormatter={(v) => v >= 1000000 ? '$' + (v / 1000000).toFixed(1) + 'M' : '$' + (v / 1000).toFixed(0) + 'k'} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ color: '#94A3B8', fontSize: '13px', paddingTop: '8px' }} />
                {results.breakEvenYear && (
                  <ReferenceLine x={results.breakEvenYear} stroke="#D4AF37" strokeDasharray="4 4"
                    label={{ value: 'Break-even', position: 'top', fill: '#D4AF37', fontSize: 11 }} />
                )}
                <Line type="monotone" dataKey="Buy Net Wealth" stroke="#4ADE80" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="Rent Net Wealth" stroke="#60A5FA" strokeWidth={2.5} dot={false} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={s.card}>
            <div style={s.secTitle}>Year-by-Year Comparison</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={s.table}>
                <thead>
                  <tr>
                    {['Year', 'Buy Net Wealth', 'Rent Net Wealth', 'Advantage'].map(h => <th key={h} style={s.th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {results.chartData.filter((_, i) => [0, 4, 9, 14, 19, 24, 29].includes(i)).map((row) => {
                    const adv = row['Buy Net Wealth'] - row['Rent Net Wealth'];
                    return (
                      <tr key={row.year}>
                        <td style={s.td}>{row.year}</td>
                        <td style={{ ...s.td, color: '#4ADE80' }}>{fmt(row['Buy Net Wealth'])}</td>
                        <td style={{ ...s.td, color: '#60A5FA' }}>{fmt(row['Rent Net Wealth'])}</td>
                        <td style={{ ...s.td, color: adv > 0 ? '#4ADE80' : '#F87171', fontWeight: 600 }}>
                          {adv > 0 ? 'Buy +' : 'Rent +'}{fmt(Math.abs(adv))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ ...s.card, fontSize: 12, color: '#64748B' }}>
            <strong style={{ color: '#94A3B8' }}>Methodology:</strong> Buyer net wealth = home equity after 7% selling costs. Renter net wealth = down payment invested at the specified investment return, plus the annual difference between buy and rent costs. A positive annualBuyCost minus annualRent amount is invested by the renter each year. Closing costs assumed at 2.5% for buyer.
          </div>
        </>
      )}
    </div>
  );
}
