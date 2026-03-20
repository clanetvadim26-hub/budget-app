import { addMonths, format } from 'date-fns';

export const LOAN_TYPE_META = {
  car:      { label: 'Car Loan',      color: '#60A5FA', icon: '🚗' },
  mortgage: { label: 'Mortgage',      color: '#A78BFA', icon: '🏠' },
  personal: { label: 'Personal Loan', color: '#2DD4BF', icon: '👤' },
  other:    { label: 'Other',         color: '#94A3B8', icon: '📋' },
};

/**
 * Full amortization schedule computed from current remaining balance.
 * paymentNum 1 = next payment due (current month).
 */
export function generateAmortizationSchedule(balance, aprPct, monthlyPayment) {
  if (!balance || balance <= 0 || !monthlyPayment || monthlyPayment <= 0) return [];

  const rate = (aprPct || 0) / 100 / 12;
  let remaining = balance;
  let paymentNum = 0;
  const schedule = [];
  const now = new Date();

  while (remaining > 0.01 && paymentNum < 600) {
    paymentNum++;
    const interest = remaining * rate;
    const payment = Math.min(monthlyPayment, remaining + interest);
    const principal = payment - interest;
    remaining = Math.max(0, remaining - principal);
    schedule.push({
      paymentNum,
      date: format(addMonths(now, paymentNum), 'MMM yyyy'),
      payment:          Math.round(payment   * 100) / 100,
      principal:        Math.round(Math.max(0, principal) * 100) / 100,
      interest:         Math.round(interest  * 100) / 100,
      remainingBalance: Math.round(remaining * 100) / 100,
    });
  }

  return schedule;
}

/**
 * Payoff summary for a single loan (months, totalInterest, totalPaid).
 */
export function loanPayoffSummary(balance, aprPct, monthlyPayment) {
  if (!balance || balance <= 0) return { months: 0, totalInterest: 0, totalPaid: 0 };
  if (!monthlyPayment || monthlyPayment <= 0) return { months: Infinity, totalInterest: Infinity, totalPaid: Infinity };

  const rate = (aprPct || 0) / 100 / 12;
  if (rate > 0 && monthlyPayment <= balance * rate) {
    return { months: Infinity, totalInterest: Infinity, totalPaid: Infinity };
  }

  let remaining = balance;
  let totalInterest = 0;
  let months = 0;

  while (remaining > 0.01 && months < 600) {
    const interest = remaining * rate;
    totalInterest += interest;
    remaining = Math.max(0, remaining + interest - Math.min(monthlyPayment, remaining + interest));
    months++;
  }

  return {
    months,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalPaid:     Math.round((balance + totalInterest) * 100) / 100,
  };
}

/**
 * Combined balance-over-time data for all credit cards + installment loans.
 * Returns { data, cards, loans } where data is an array of { month, [id]: balance, [loan_id]: balance }.
 */
export function generateCombinedDebtTimeline(cards, loans) {
  const activeCards  = (cards  || []).filter((c) => (c.balance || 0) > 0);
  const activeLoans  = (loans  || []).filter((l) => (l.balance || 0) > 0);

  if (!activeCards.length && !activeLoans.length) {
    return { data: [], cards: [], loans: [] };
  }

  const getMonthsToPayoff = (balance, apr, payment) => {
    if (!balance || !payment) return 0;
    const rate = (apr || 0) / 100 / 12;
    if (rate > 0 && payment <= balance * rate) return 120;
    let rem = balance;
    let m = 0;
    while (rem > 0.01 && m < 120) {
      const interest = rem * rate;
      rem = Math.max(0, rem + interest - Math.min(payment, rem + interest));
      m++;
    }
    return m;
  };

  const cardPayments = activeCards.map((c) => Math.max(c.plannedPayment || c.minPayment || 1, 1));
  const loanPayments = activeLoans.map((l) => Math.max(l.monthlyPayment || 1, 1));

  const maxMonths = Math.min(
    Math.max(
      ...activeCards.map((c, i) => getMonthsToPayoff(c.balance, c.apr, cardPayments[i])),
      ...activeLoans.map((l, i) => getMonthsToPayoff(l.balance, l.apr, loanPayments[i])),
      1,
    ),
    120,
  );

  const cardRates = activeCards.map((c) => (c.apr || 0) / 100 / 12);
  const loanRates = activeLoans.map((l) => (l.apr || 0) / 100 / 12);
  let cardBalances = activeCards.map((c) => c.balance || 0);
  let loanBalances = activeLoans.map((l) => l.balance || 0);

  const data = [{
    month: 0,
    ...Object.fromEntries(activeCards.map((c, i) => [c.id,           Math.round(cardBalances[i])])),
    ...Object.fromEntries(activeLoans.map((l, i) => [`loan_${l.id}`, Math.round(loanBalances[i])])),
  }];

  for (let m = 1; m <= maxMonths; m++) {
    cardBalances = cardBalances.map((b, i) => {
      if (b <= 0) return 0;
      const interest = b * cardRates[i];
      return Math.max(0, b + interest - Math.min(cardPayments[i], b + interest));
    });
    loanBalances = loanBalances.map((b, i) => {
      if (b <= 0) return 0;
      const interest = b * loanRates[i];
      return Math.max(0, b + interest - Math.min(loanPayments[i], b + interest));
    });
    const cSnap = cardBalances;
    const lSnap = loanBalances;
    data.push({
      month: m,
      ...Object.fromEntries(activeCards.map((c, i) => [c.id,           Math.round(cSnap[i])])),
      ...Object.fromEntries(activeLoans.map((l, i) => [`loan_${l.id}`, Math.round(lSnap[i])])),
    });
  }

  return { data, cards: activeCards, loans: activeLoans };
}
