// Central source of truth for all budget plan numbers.
// Stored in Supabase app_state under key 'budget_settings'.
// When any value changes, it broadcasts to all components via useLocalStorage singleton.

export const DEFAULT_BUDGET_SETTINGS = {
  vadim: {
    paycheck: 2200,
    payFrequency: 'bi-weekly',
    nextPayday: '2026-03-21',

    // Monthly contribution per account — also synced to accounts[x].monthlyContribution
    savings: {
      cap1_joint_savings:        { monthly: 400,   perPaycheck: 200,    label: 'Capital One Joint Savings (Emergency Fund)' },
      roth_ira_vadim:            { monthly: 583,   perPaycheck: 291.50, label: 'Vadim Roth IRA 2025',        targetGoal: 7000, deadline: '2026-04-15' },
      brokerage_joint:           { monthly: 200,   perPaycheck: 100,    label: 'Ameriprise Joint Brokerage', targetGoal: 0 },
      ameriprise_savings_vadim:  { monthly: 0,     perPaycheck: 0,      label: 'Ameriprise Savings (Vacation & Fun)',        targetGoal: 5000 },
      '401k_vadim':              { monthly: 0,     perPaycheck: 0,      label: 'Vadim 401k (starts June 2026)', startDate: '2026-06-01', targetGoal: 0 },
    },

    // Variable monthly budgets
    variableBudgets: {
      groceries:    300,
      gas:          160,
      dining_out:   150,
      electricity:  100,
      water:         47,
    },
  },

  jessica: {
    estimatedMonthlyIncome: 2000,
    nextCEPayday: '2026-04-01',
    nextOTPayday: '2026-03-27',

    // Allocation percentages (must sum to 100)
    allocations: {
      household:    40,
      jointSavings: 10,
      rothIRA:      10,
      personal:     40,
    },

    savings: {
      roth_ira_jessica:   { monthly: 0, perPaycheck: 0, label: 'Jessica Roth IRA', targetGoal: 7000, deadline: '2026-04-15' },
      '401k_jessica':     { monthly: 0, perPaycheck: 0, label: 'Jessica 401k',    targetGoal: 0 },
    },

    fixedExpenses: [
      { id: 'jfe_wf_cc', name: 'Wells Fargo CC Minimum Payment', amount: 177.41 },
    ],
  },

  // Long-term target goals per account (editable on account cards, synced here)
  accountTargets: {
    cap1_joint_savings:       20000,   // Emergency Fund: 6 months expenses
    cap1_checking_vadim:       3000,   // Minimum balance buffer
    wf_checking_jessica:       1500,   // Minimum balance buffer
    ameriprise_savings_vadim:  5000,   // Vacation & Fun target
    roth_ira_vadim:           50000,   // Long-term Roth balance goal
    roth_ira_jessica:         50000,
    brokerage_joint:          25000,
    reit_vadim:               10000,
    '401k_vadim':             25000,
    '401k_jessica':           15000,
  },
};
