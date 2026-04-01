import React from 'react';

export function InflationAdjuster({ enabled, rate, onToggle, onRateChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px solid #1E293B', marginTop: 12 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#94A3B8', cursor: 'pointer' }}>
        <input type="checkbox" checked={enabled} onChange={e => onToggle(e.target.checked)} style={{ accentColor: '#D4AF37' }} />
        Adjust for inflation
      </label>
      {enabled && (
        <>
          <input type="range" min="0" max="10" step="0.5" value={rate} onChange={e => onRateChange(Number(e.target.value))} style={{ flex: 1, accentColor: '#D4AF37' }} />
          <span style={{ fontSize: 13, color: '#D4AF37', fontWeight: 600, minWidth: 40 }}>{rate}%</span>
        </>
      )}
    </div>
  );
}

export const fmt = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
export const fmtFull = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
export const fmtPct = (v) => `${Number(v).toFixed(1)}%`;

export const inputStyle = { background: '#131d35', border: '1px solid #1E293B', borderRadius: 10, color: '#E2E8F0', fontSize: 16, padding: '11px 14px', outline: 'none', width: '100%', fontFamily: 'Inter, sans-serif' };
export const labelStyle = { fontSize: 12, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6, display: 'block' };
export const statCardStyle = { background: '#131d35', border: '1px solid #1E293B', borderRadius: 12, padding: 16 };
export const statLabelStyle = { fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6, fontWeight: 600 };
export const calcBtnStyle = { flex: 1, padding: 13, background: 'linear-gradient(135deg, #D4AF37, #B8962A)', border: 'none', borderRadius: 10, color: '#0A0F1E', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' };
export const resetBtnStyle = { padding: '13px 20px', background: 'transparent', border: '1px solid #1E293B', borderRadius: 10, color: '#64748B', fontSize: 14, cursor: 'pointer', fontFamily: 'Inter, sans-serif' };
export const tooltipStyle = { background: '#1E293B', border: '1px solid #334155', borderRadius: 8, fontSize: 13, color: '#E2E8F0' };

// 2026 Federal Tax Brackets (MFJ)
export const TAX_BRACKETS_MFJ_2026 = [
  { min: 0, max: 24150, rate: 0.10 },
  { min: 24150, max: 98100, rate: 0.12 },
  { min: 98100, max: 199150, rate: 0.22 },
  { min: 199150, max: 390500, rate: 0.24 },
  { min: 390500, max: 553700, rate: 0.32 },
  { min: 553700, max: 693750, rate: 0.35 },
  { min: 693750, max: Infinity, rate: 0.37 },
];

// 2026 Federal Tax Brackets (Single)
export const TAX_BRACKETS_SINGLE_2026 = [
  { min: 0, max: 12075, rate: 0.10 },
  { min: 12075, max: 49050, rate: 0.12 },
  { min: 49050, max: 99575, rate: 0.22 },
  { min: 99575, max: 195250, rate: 0.24 },
  { min: 195250, max: 276850, rate: 0.32 },
  { min: 276850, max: 346875, rate: 0.35 },
  { min: 346875, max: Infinity, rate: 0.37 },
];

export const STANDARD_DEDUCTION_2026 = { mfj: 30000, single: 15000, hoh: 22500 };

export const LTCG_BRACKETS_MFJ_2026 = [
  { min: 0, max: 96700, rate: 0 },
  { min: 96700, max: 600050, rate: 0.15 },
  { min: 600050, max: Infinity, rate: 0.20 },
];

export function calcFederalTax(taxableIncome, brackets) {
  let tax = 0;
  for (const b of brackets) {
    if (taxableIncome <= b.min) break;
    const taxable = Math.min(taxableIncome, b.max) - b.min;
    tax += taxable * b.rate;
  }
  return tax;
}

export function adjustForInflation(futureValue, years, inflationRate) {
  return futureValue / Math.pow(1 + inflationRate / 100, years);
}

// Standard amortization payment formula
export function calcMonthlyPayment(principal, annualRate, months) {
  if (!principal || principal <= 0 || !months) return 0;
  const r = (annualRate || 0) / 100 / 12;
  if (r === 0) return principal / months;
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}
