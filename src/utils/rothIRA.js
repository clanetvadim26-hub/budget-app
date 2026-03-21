// IRS Roth IRA contribution limits and deadline utilities

export const ROTH_IRA_LIMITS = {
  2023: { base: 6500,  catchUp: 7500 },
  2024: { base: 7000,  catchUp: 8000 },
  2025: { base: 7000,  catchUp: 8000 },
  2026: { base: 7000,  catchUp: 8000 }, // Treat as $7,000 until IRS announces otherwise
};

export const ROTH_YEARS = [2023, 2024, 2025, 2026];

export const CURRENT_YEAR = new Date().getFullYear();

/** April 15 of the year AFTER the tax year */
export function contributionDeadline(taxYear) {
  return new Date(taxYear + 1, 3, 15); // month 3 = April (0-indexed)
}

export function deadlineLabel(taxYear) {
  return `April 15, ${taxYear + 1}`;
}

/** Days remaining until the contribution deadline (negative = past) */
export function daysUntilDeadline(taxYear) {
  const deadline = contributionDeadline(taxYear);
  const today    = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
}

export function getRothLimit(taxYear, catchUp = false) {
  const limits = ROTH_IRA_LIMITS[taxYear] || ROTH_IRA_LIMITS[2025];
  return catchUp ? limits.catchUp : limits.base;
}

/** Sum of all contributions for a specific account + tax year */
export function getTotalContributed(contributions, accountId, taxYear) {
  return (contributions || [])
    .filter((c) => c.accountId === accountId && c.taxYear === taxYear)
    .reduce((s, c) => s + (c.amount || 0), 0);
}

export function getYearStatus(taxYear, contributed, limit) {
  const days    = daysUntilDeadline(taxYear);
  const isCurrent = taxYear === CURRENT_YEAR;

  if (contributed >= limit)                   return 'maxed';
  if (isCurrent)                              return 'in_progress';
  if (days <= 0 && contributed < limit)       return 'deadline_passed';
  return 'under';
}

export const YEAR_STATUS_META = {
  maxed:            { label: 'Maxed Out',       color: '#4ADE80' },
  in_progress:      { label: 'In Progress',     color: '#D4AF37' },
  deadline_passed:  { label: 'Deadline Passed', color: '#F87171' },
  under:            { label: 'Under Limit',     color: '#64748B' },
};

/**
 * Returns the default "selected year" to show in the Roth IRA tracker.
 * If we're before April 15, the prior year's window is still open → show it.
 * After April 15, show the current year.
 */
export function defaultRothYear() {
  const now = new Date();
  const aprilDeadline = new Date(now.getFullYear(), 3, 15);
  return now < aprilDeadline ? now.getFullYear() - 1 : now.getFullYear();
}

// ── Income phase-out ranges (2025) ──────────────────────────────────────────
// Roth IRA eligibility phases out for Married Filing Jointly:
export const PHASE_OUT_MFJ_2025 = { start: 236000, end: 246000 };
// Single / Head of Household:
export const PHASE_OUT_SINGLE_2025 = { start: 150000, end: 165000 };
