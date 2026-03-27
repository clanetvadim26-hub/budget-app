import React, { useMemo } from 'react';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { formatCurrency } from '../../utils/calculations';
import { DEFAULT_RECURRING_EXPENSES } from '../../data/defaultRecurring';

const VADIM_SAVINGS_DEFAULT = [
  { key: 'vadim_savings_cap1_monthly' },
  { key: 'vadim_savings_roth_monthly' },
  { key: 'vadim_savings_brokerage_monthly' },
  { key: 'vadim_savings_ameriprise_monthly' },
  { key: 'vadim_savings_401k_monthly' },
];

function SummaryBar({ income, fixed, variable, savings, discretionary }) {
  if (!income) return null;
  const fixedPct    = Math.min((fixed    / income) * 100, 100);
  const varPct      = Math.min((variable / income) * 100, 100);
  const savingsPct  = Math.min((savings  / income) * 100, 100);
  const discPct     = Math.max(0, Math.min((discretionary / income) * 100, 100));
  return (
    <div className="obs-bar">
      {fixedPct   > 0 && <div className="obs-bar-seg obs-fixed"    style={{ width: `${fixedPct}%` }}   title={`Fixed: ${formatCurrency(fixed)}`} />}
      {varPct     > 0 && <div className="obs-bar-seg obs-variable"  style={{ width: `${varPct}%` }}    title={`Variable: ${formatCurrency(variable)}`} />}
      {savingsPct > 0 && <div className="obs-bar-seg obs-savings"   style={{ width: `${savingsPct}%` }} title={`Savings: ${formatCurrency(savings)}`} />}
      {discPct    > 0 && <div className="obs-bar-seg obs-disc"      style={{ width: `${discPct}%` }}    title={`Discretionary: ${formatCurrency(discretionary)}`} />}
    </div>
  );
}

function tryParseJson(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

export default function OverviewBudgetSummary({ onNavigateToBudgetPlan }) {
  const [settings]           = useLocalStorage('budget_settings', {});
  const [recurringExpenses]  = useLocalStorage('budget_recurring_expenses', DEFAULT_RECURRING_EXPENSES);

  // ── Vadim ────────────────────────────────────────────────────────────
  const vadimIncome = useMemo(() => {
    const paycheck = Number(settings['vadim_paycheck'] || 0);
    return Math.round((paycheck * 26) / 12 * 100) / 100;
  }, [settings]);

  const vadimFixedTotal = useMemo(() => {
    return (recurringExpenses || [])
      .filter((e) => { const m = e.metadata || {}; return !m.isBudget && m.owner !== 'jessica' && e.active; })
      .reduce((s, e) => s + (e.amount || 0), 0);
  }, [recurringExpenses]);

  const vadimVariableTotal = useMemo(() => {
    return (recurringExpenses || [])
      .filter((e) => { const m = e.metadata || {}; return !!m.isBudget && e.active; })
      .reduce((s, e) => s + (e.amount || 0), 0);
  }, [recurringExpenses]);

  const vadimSavingsTotal = useMemo(() => {
    const list = tryParseJson(settings['vadim_savings_list'], null) || VADIM_SAVINGS_DEFAULT;
    return list.reduce((s, sv) => s + Number(settings[sv.key] || 0), 0);
  }, [settings]);

  const vadimDiscretionary = vadimIncome - vadimFixedTotal - vadimVariableTotal - vadimSavingsTotal;

  // ── Jessica ──────────────────────────────────────────────────────────
  const jessicaIncome = Number(settings['jessica_estimated_monthly'] || 0);

  const jessicaFixedTotal = useMemo(() => {
    return (recurringExpenses || [])
      .filter((e) => { const m = e.metadata || {}; return m.owner === 'jessica' && e.active; })
      .reduce((s, e) => s + (e.amount || 0), 0);
  }, [recurringExpenses]);

  const jessicaSavingsTotal = useMemo(() => {
    const allocKeys = Object.keys(settings).filter((k) => k.startsWith('jessica_alloc_') && (k.includes('savings') || k.includes('roth')));
    return allocKeys.reduce((s, k) => {
      const pct = Number(settings[k] || 0);
      return s + (jessicaIncome * pct / 100);
    }, 0);
  }, [settings, jessicaIncome]);

  // ── Totals ───────────────────────────────────────────────────────────
  const totalIncome   = vadimIncome + jessicaIncome;
  const totalExpenses = vadimFixedTotal + vadimVariableTotal + jessicaFixedTotal;
  const totalSavings  = vadimSavingsTotal + jessicaSavingsTotal;

  const hasData = vadimIncome > 0 || jessicaIncome > 0;

  return (
    <div className="panel obs-panel">
      <div className="panel-header">
        <h2>Budget Overview</h2>
        <button className="obs-edit-btn" onClick={() => onNavigateToBudgetPlan?.()}>
          View Full Plan →
        </button>
      </div>

      {!hasData ? (
        <div className="obs-empty">
          <span>Budget plan not set up yet.</span>
          <button className="obs-setup-btn" onClick={() => onNavigateToBudgetPlan?.()}>
            Set Up Budget Plan →
          </button>
        </div>
      ) : (
        <div className="obs-grid">
          {vadimIncome > 0 && (
            <div className="obs-person-card vadim-card">
              <div className="obs-person-header">
                <span className="obs-person-icon">👨</span>
                <span className="obs-person-name">Vadim</span>
                <span className="obs-person-income">{formatCurrency(vadimIncome)}/mo</span>
              </div>
              <SummaryBar
                income={vadimIncome}
                fixed={vadimFixedTotal}
                variable={vadimVariableTotal}
                savings={vadimSavingsTotal}
                discretionary={vadimDiscretionary}
              />
              <div className="obs-legend">
                {vadimFixedTotal > 0 && <span className="obs-legend-item obs-fixed-dot">Fixed {formatCurrency(vadimFixedTotal)}</span>}
                {vadimVariableTotal > 0 && <span className="obs-legend-item obs-variable-dot">Variable {formatCurrency(vadimVariableTotal)}</span>}
                {vadimSavingsTotal > 0 && <span className="obs-legend-item obs-savings-dot">Savings {formatCurrency(vadimSavingsTotal)}</span>}
                {vadimDiscretionary > 0 && (
                  <span className="obs-legend-item obs-disc-dot">Discretionary {formatCurrency(vadimDiscretionary)}</span>
                )}
              </div>
            </div>
          )}

          {jessicaIncome > 0 && (
            <div className="obs-person-card jessica-card">
              <div className="obs-person-header">
                <span className="obs-person-icon">👩</span>
                <span className="obs-person-name">Jessica</span>
                <span className="obs-person-income">{formatCurrency(jessicaIncome)}/mo</span>
              </div>
              <SummaryBar
                income={jessicaIncome}
                fixed={jessicaFixedTotal}
                variable={0}
                savings={jessicaSavingsTotal}
                discretionary={jessicaIncome - jessicaFixedTotal - jessicaSavingsTotal}
              />
              <div className="obs-legend">
                {jessicaFixedTotal > 0 && <span className="obs-legend-item obs-fixed-dot">Fixed {formatCurrency(jessicaFixedTotal)}</span>}
                {jessicaSavingsTotal > 0 && <span className="obs-legend-item obs-savings-dot">Savings {formatCurrency(jessicaSavingsTotal)}</span>}
              </div>
            </div>
          )}
        </div>
      )}

      {hasData && (
        <div className="obs-household-row">
          <div className="obs-hh-stat">
            <span className="obs-hh-label">Combined Income</span>
            <span className="obs-hh-val positive">{formatCurrency(totalIncome)}</span>
          </div>
          <div className="obs-hh-stat">
            <span className="obs-hh-label">Total Expenses</span>
            <span className="obs-hh-val negative">{formatCurrency(totalExpenses)}</span>
          </div>
          <div className="obs-hh-stat">
            <span className="obs-hh-label">Total Savings</span>
            <span className="obs-hh-val" style={{ color: '#D4AF37' }}>{formatCurrency(totalSavings)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
