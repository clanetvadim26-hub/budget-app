// Flat key-value store for all budget plan numbers.
// Each key maps to a single Supabase row in the `budget_settings` table.
// Numeric values use the `value` column; date strings use `text_value`.

export const DEFAULT_BUDGET_SETTINGS = {
  // ── Vadim ──────────────────────────────────────────────────────────────
  vadim_paycheck:                 2200,
  vadim_next_payday:              '2026-03-21',   // text_value

  // Savings contributions (monthly)
  vadim_savings_cap1_monthly:     400,
  vadim_savings_roth_monthly:     583,
  vadim_savings_brokerage_monthly:200,
  vadim_savings_ameriprise_monthly:0,
  vadim_savings_401k_monthly:     0,

  // Variable budgets (monthly)
  vadim_budget_groceries:         300,
  vadim_budget_gas:               160,
  vadim_budget_dining:            150,
  vadim_budget_electricity:       100,
  vadim_budget_water:              47,

  // ── Jessica ────────────────────────────────────────────────────────────
  jessica_estimated_monthly:      2000,
  jessica_next_ce_payday:         '2026-04-01',   // text_value
  jessica_next_ot_payday:         '2026-03-27',   // text_value

  // Allocation percentages (must sum to 100)
  jessica_alloc_household:        40,
  jessica_alloc_savings:          10,
  jessica_alloc_roth:             10,
  jessica_alloc_personal:         40,

  // Jessica's fixed expense
  jessica_fixed_wf_cc:            177.41,
};
