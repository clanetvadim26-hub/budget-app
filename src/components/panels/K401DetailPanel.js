import React from 'react';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { formatCurrency } from '../../utils/calculations';

const IRS_LIMIT_UNDER_50 = 23500;
const IRS_LIMIT_OVER_50  = 31000;
const VESTING_OPTIONS    = ['Immediate', '1-Year Cliff', '2-Year Graded', '3-Year Graded', '4-Year Graded', '5-Year Graded', '6-Year Graded'];
const MATCH_TYPES        = ['Dollar for dollar up to %', 'Percentage of contribution', 'Custom'];

export default function K401DetailPanel({ accountId, accountName, accountType = '401k', owner = 'Vadim' }) {
  const [settings, setSettings] = useLocalStorage('budget_settings', {});

  const prefix = `k401_${accountId}_`;
  const get = (field, def = 0)     => settings[`${prefix}${field}`] !== undefined ? settings[`${prefix}${field}`] : def;
  const set = (field, value)        => setSettings((prev) => ({ ...prev, [`${prefix}${field}`]: value }));

  const salary           = Number(get('salary', 0));
  const empPct           = Number(get('emp_pct', 6));
  const empMonthly       = salary > 0 ? (salary * empPct / 100) / 12 : Number(get('emp_monthly', 0));
  const matchType        = get('match_type', MATCH_TYPES[0]);
  const matchPct1        = Number(get('match_pct1', 100));
  const matchUpTo1       = Number(get('match_upto1', 6));
  const matchPct2        = Number(get('match_pct2', 0));
  const matchUpTo2       = Number(get('match_upto2', 0));
  const maxEmployerAnnual= Number(get('max_employer_annual', 0));
  const vestingSchedule  = get('vesting', VESTING_OPTIONS[0]);
  const currentBalance   = Number(get('balance', 0));
  const ytdEmployee      = Number(get('ytd_employee', 0));
  const ytdEmployer      = Number(get('ytd_employer', 0));
  const catchUpEligible  = !!get('catch_up', false);
  const irsLimit         = catchUpEligible ? IRS_LIMIT_OVER_50 : IRS_LIMIT_UNDER_50;

  // Calculate employer match
  let annualEmployerMatch = 0;
  if (salary > 0) {
    const matchTier1 = salary * (matchUpTo1 / 100) * (matchPct1 / 100);
    const matchTier2 = matchUpTo2 > 0 ? salary * (matchUpTo2 / 100) * (matchPct2 / 100) : 0;
    annualEmployerMatch = maxEmployerAnnual > 0
      ? Math.min(matchTier1 + matchTier2, maxEmployerAnnual)
      : matchTier1 + matchTier2;
  }
  const effectiveMatchRate = empMonthly > 0 ? (annualEmployerMatch / 12 / empMonthly) * 100 : 0;
  const ytdProgress = Math.min((ytdEmployee / irsLimit) * 100, 100);

  const isRoth = accountType === 'roth_401k';
  const today  = new Date();
  const start  = new Date(2026, 5, 1); // June 1, 2026
  const daysUntil = Math.max(0, Math.floor((start - today) / (1000 * 60 * 60 * 24)));

  return (
    <div className="k401-panel">
      <div className="k401-header">
        <div className="k401-title-row">
          <span className="k401-icon">🏛️</span>
          <div>
            <div className="k401-name">{accountName}</div>
            <div className="k401-type">{isRoth ? 'Roth 401k' : 'Traditional 401k'} · {owner}</div>
          </div>
          {daysUntil > 0 && (
            <div className="k401-countdown">🗓️ Starts in {daysUntil} days</div>
          )}
        </div>
      </div>

      <div className="k401-grid">
        {/* Contributions */}
        <div className="k401-section">
          <div className="k401-section-title">Your Contributions</div>
          <div className="k401-field">
            <label>Annual Salary ($)</label>
            <input type="number" min="0" step="1000" placeholder="e.g. 75000"
              value={salary || ''} onChange={(e) => set('salary', Number(e.target.value))} className="k401-input" />
          </div>
          <div className="k401-field">
            <label>Contribution % of Salary</label>
            <input type="number" min="0" max="100" step="0.5"
              value={empPct} onChange={(e) => set('emp_pct', Number(e.target.value))} className="k401-input" />
          </div>
          {salary > 0 && (
            <div className="k401-computed">≈ {formatCurrency(empMonthly)}/mo employee contribution</div>
          )}
          <div className="k401-field">
            <label>
              <input type="checkbox" checked={catchUpEligible}
                onChange={(e) => set('catch_up', e.target.checked)} />
              {' '}Age 50+ (catch-up eligible)
            </label>
          </div>
        </div>

        {/* Employer Match */}
        <div className="k401-section">
          <div className="k401-section-title">Employer Match</div>
          <div className="k401-field">
            <label>Match Type</label>
            <select value={matchType} onChange={(e) => set('match_type', e.target.value)} className="k401-input">
              {MATCH_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="k401-field">
            <label>Tier 1: Match % on first % of salary</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="number" min="0" max="200" step="1" placeholder="Match %" className="k401-input"
                value={matchPct1} onChange={(e) => set('match_pct1', Number(e.target.value))} />
              <input type="number" min="0" max="100" step="0.5" placeholder="Up to %" className="k401-input"
                value={matchUpTo1} onChange={(e) => set('match_upto1', Number(e.target.value))} />
            </div>
          </div>
          <div className="k401-field">
            <label>Tier 2 (optional): Match % on next % of salary</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="number" min="0" max="200" step="1" placeholder="%" className="k401-input"
                value={matchPct2} onChange={(e) => set('match_pct2', Number(e.target.value))} />
              <input type="number" min="0" max="100" step="0.5" placeholder="Up to %" className="k401-input"
                value={matchUpTo2} onChange={(e) => set('match_upto2', Number(e.target.value))} />
            </div>
          </div>
          <div className="k401-field">
            <label>Max Employer Match/Year ($, 0 = no cap)</label>
            <input type="number" min="0" step="100" className="k401-input"
              value={maxEmployerAnnual} onChange={(e) => set('max_employer_annual', Number(e.target.value))} />
          </div>
          {annualEmployerMatch > 0 && (
            <div className="k401-match-result">
              Projected: {formatCurrency(annualEmployerMatch)}/yr
              <br /><small>Effective match rate: {effectiveMatchRate.toFixed(0)}%</small>
            </div>
          )}
        </div>

        {/* YTD Progress */}
        <div className="k401-section">
          <div className="k401-section-title">YTD Progress</div>
          <div className="k401-field">
            <label>Current Balance ($)</label>
            <input type="number" min="0" step="100" className="k401-input"
              value={currentBalance} onChange={(e) => set('balance', Number(e.target.value))} />
          </div>
          <div className="k401-field">
            <label>YTD Employee Contributions ($)</label>
            <input type="number" min="0" step="100" className="k401-input"
              value={ytdEmployee} onChange={(e) => set('ytd_employee', Number(e.target.value))} />
          </div>
          <div className="k401-field">
            <label>YTD Employer Contributions ($)</label>
            <input type="number" min="0" step="100" className="k401-input"
              value={ytdEmployer} onChange={(e) => set('ytd_employer', Number(e.target.value))} />
          </div>
          <div className="k401-field">
            <label>Vesting Schedule</label>
            <select value={vestingSchedule} onChange={(e) => set('vesting', e.target.value)} className="k401-input">
              {VESTING_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* IRS Limit Progress Bar */}
      <div className="k401-limit-bar">
        <div className="k401-limit-header">
          <span>IRS Contribution Limit ({new Date().getFullYear()})</span>
          <span className="k401-limit-amount">
            {formatCurrency(ytdEmployee)} / {formatCurrency(irsLimit)}
          </span>
          {catchUpEligible && <span className="k401-catchup-badge">+Catch-up</span>}
        </div>
        <div className="progress-bar-wrap">
          <div className="progress-bar-fill k401-progress-fill" style={{ width: `${ytdProgress}%` }} />
        </div>
        <div className="k401-limit-note">
          {ytdProgress < 100
            ? `${formatCurrency(irsLimit - ytdEmployee)} remaining to max out`
            : '🎉 Max contribution reached!'}
        </div>
      </div>
    </div>
  );
}
