/**
 * budgetPlanSync.js — One-way sync utilities
 * Budget Plan is the source of truth for contribution/payment amounts.
 * These utilities apply contributions/payments to account balances.
 */
import { format } from 'date-fns';

/**
 * Get the monthly contribution amount for an account from budget_settings.
 * Reads the dynamic vadim_savings_list first, then falls back to static key map.
 */
export function getContributionForAccount(settings, accountId) {
  if (!settings) return 0;

  // Dynamic lookup via vadim_savings_list
  if (settings['vadim_savings_list']) {
    try {
      const list = JSON.parse(settings['vadim_savings_list']);
      if (Array.isArray(list)) {
        const entry = list.find(s => s.accountId === accountId);
        if (entry && entry.key && settings[entry.key] !== undefined) {
          return Number(settings[entry.key]) || 0;
        }
      }
    } catch {}
  }

  // Static fallback key map
  const keyMap = {
    'cap1_joint_savings':       'vadim_savings_cap1_monthly',
    'roth_ira_vadim':           'vadim_savings_roth_monthly',
    'brokerage_joint':          'vadim_savings_brokerage_monthly',
    'ameriprise_savings_vadim': 'vadim_savings_ameriprise_monthly',
    '401k_vadim':               'vadim_savings_401k_monthly',
  };
  const key = keyMap[accountId];
  return key ? (Number(settings[key]) || 0) : 0;
}

/**
 * Get the monthly payment amount for a debt from budget_settings.
 * Keys follow the pattern: `debt_payment_<debtId>`
 */
export function getPaymentForDebt(settings, debtId) {
  if (!settings) return 0;
  return Number(settings[`debt_payment_${debtId}`] || 0);
}

/**
 * Apply a contribution to an account's balance.
 * Returns the updated accounts array — caller must save via setAccounts().
 *
 * @param {Array}  accounts  - current budget_accounts array
 * @param {string} accountId - the account to update
 * @param {number} amount    - the contribution amount
 * @param {string} date      - ISO date string for the history entry
 * @returns {Array} updated accounts array
 */
export function applyContributionToAccount(accounts, accountId, amount, date) {
  if (!accounts || !accountId || !amount) return accounts;
  const dateStr = date || format(new Date(), 'yyyy-MM-dd');

  return accounts.map((acc) => {
    if (acc.id !== accountId) return acc;
    const newBalance  = (acc.balance          || 0) + amount;
    const newYtd      = (acc.ytdContributions  || 0) + amount;
    const newTotal    = (acc.totalContributed  || 0) + amount;
    const historyEntry = {
      date: dateStr,
      balance: newBalance,
      contributed: amount,
      note: 'Paycheck contribution',
    };
    return {
      ...acc,
      balance:          newBalance,
      ytdContributions: newYtd,
      totalContributed: newTotal,
      lastUpdated:      dateStr,
      history:          [...(acc.history || []), historyEntry],
    };
  });
}

/**
 * Apply a debt payment to an account's balance.
 * Calculates interest for the month and reduces principal accordingly.
 * Returns the updated accounts array AND a payment log record.
 *
 * @param {Array}  accounts      - current budget_accounts array
 * @param {string} debtId        - the account id of the debt
 * @param {number} paymentAmount - the total payment amount
 * @param {string} date          - ISO date string
 * @returns {{ accounts: Array, paymentRecord: Object|null }}
 */
export function applyPaymentToDebt(accounts, debtId, paymentAmount, date) {
  if (!accounts || !debtId || !paymentAmount) return { accounts, paymentRecord: null };
  const dateStr = date || format(new Date(), 'yyyy-MM-dd');

  let paymentRecord = null;
  const updatedAccounts = accounts.map((acc) => {
    if (acc.id !== debtId) return acc;

    const balance        = acc.balance || 0;
    const apr            = acc.apr     || 0;
    const monthlyRate    = apr / 100 / 12;
    const interestCharge = balance * monthlyRate;
    const principalReduction = Math.max(0, paymentAmount - interestCharge);
    const newBalance     = Math.max(0, balance - principalReduction);

    paymentRecord = {
      id:               `${debtId}_${dateStr}_${Date.now()}`,
      debtId,
      paymentDate:      dateStr,
      amount:           paymentAmount,
      principal:        principalReduction,
      interest:         interestCharge,
      remainingBalance: newBalance,
      source:           'budget_plan',
    };

    const historyEntry = {
      date:      dateStr,
      balance:   newBalance,
      payment:   paymentAmount,
      interest:  interestCharge,
      principal: principalReduction,
    };

    return {
      ...acc,
      balance:     newBalance,
      lastUpdated: dateStr,
      history:     [...(acc.history || []), historyEntry],
    };
  });

  return { accounts: updatedAccounts, paymentRecord };
}
