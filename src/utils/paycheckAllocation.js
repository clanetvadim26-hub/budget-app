import { addDays, isWithinInterval, format } from 'date-fns';
import { getRecurringDates } from './recurringDates';

// After April 15, 2026: Roth IRA 2025 closes → redirect $291.67 to brokerage
export const ROTH_REDIRECT_DATE = new Date(2026, 3, 15); // April 15, 2026
export const K401_START_DATE    = new Date(2026, 5,  1); // June 1, 2026

export const VADIM_PAYCHECK_AMOUNT = 2200;

export const VADIM_ALLOCATIONS = {
  jointSavings: 200,
  rothPerPaycheck: 291.67,   // $583/month → $291.67 per bi-weekly paycheck
  brokerageBase: 100,
  groceriesHalf: 150,        // half of $300 monthly
  gasHalf: 80,               // half of $160 monthly
  diningHalf: 75,            // half of $150 monthly
};

// Return which bills fall within [paydayDate, paydayDate + 13 days]
export function getBillsDueInPayPeriod(recurringExpenses, paydayDate) {
  const start = new Date(paydayDate);
  const end   = addDays(start, 13);
  const bills = [];

  (recurringExpenses || []).forEach((exp) => {
    if (!exp.active) return;
    const meta = exp.metadata || {};
    if (meta.isBudget) return; // spending budgets aren't "bills"
    if (meta.isOneTime && meta.expiresDate && new Date(meta.expiresDate) < start) return; // expired
    if (meta.isPrepaid) return; // handled separately as monthly allocation

    const occurrences = getRecurringDates(
      exp.startDate,
      exp.frequency === 'monthly' ? 'monthly' : exp.frequency,
      addDays(end, 1),
    );
    occurrences.forEach((date) => {
      if (isWithinInterval(date, { start, end })) {
        bills.push({
          id:      `${exp.id}_${format(date, 'yyyy-MM-dd')}`,
          name:    exp.name,
          amount:  exp.amount,
          dueDate: format(date, 'MMM d'),
          category: exp.category,
          isVariable: meta.isVariable || false,
          isOneTime:  meta.isOneTime  || false,
        });
      }
    });
  });

  return bills.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

// Full Vadim paycheck allocation breakdown for a given payday date
export function calcVadimAllocation(paydayDate, recurringExpenses) {
  const today    = paydayDate instanceof Date ? paydayDate : new Date(paydayDate);
  const isRoth   = today < ROTH_REDIRECT_DATE;
  const is401k   = today >= K401_START_DATE;

  const bills      = getBillsDueInPayPeriod(recurringExpenses, today);
  const billsTotal = bills.reduce((s, b) => s + b.amount, 0);

  // Car insurance monthly allocation (always, even though it's prepaid)
  const carIns = (recurringExpenses || []).find((e) => e.id === 'rec_car_insurance');
  const carInsAllocation = carIns?.amount || 311.17;

  const { jointSavings, rothPerPaycheck, brokerageBase, groceriesHalf, gasHalf, diningHalf } = VADIM_ALLOCATIONS;
  const rothAmount     = isRoth ? rothPerPaycheck : 0;
  const brokerageExtra = isRoth ? 0 : rothPerPaycheck;
  const brokerage      = brokerageBase + brokerageExtra;

  const totalBills    = billsTotal + carInsAllocation;
  const totalSavings  = jointSavings + rothAmount + brokerage;
  const totalVariable = groceriesHalf + gasHalf + diningHalf;
  const totalAllocated = totalBills + totalSavings + totalVariable;
  const discretionary  = Math.max(0, VADIM_PAYCHECK_AMOUNT - totalAllocated);
  const overBudget     = totalAllocated > VADIM_PAYCHECK_AMOUNT;

  return {
    paycheck: VADIM_PAYCHECK_AMOUNT,
    bills,
    billsTotal,
    carInsAllocation,
    totalBills,
    savings: {
      jointSavings,
      rothAmount,
      brokerage,
      total: totalSavings,
      isRoth,
    },
    variable: {
      groceries: groceriesHalf,
      gas: gasHalf,
      dining: diningHalf,
      total: totalVariable,
    },
    discretionary,
    totalAllocated,
    overBudget,
    is401kSoon: !is401k,
  };
}

// Jessica's allocation from ONE paycheck (by percentage)
export function calcJessicaAllocation(amount) {
  const n = Number(amount) || 0;
  return {
    paycheck: n,
    household:    Math.round(n * 0.40 * 100) / 100,  // 40% to household
    jointSavings: Math.round(n * 0.10 * 100) / 100,  // 10% to joint savings
    rothIRA:      Math.round(n * 0.10 * 100) / 100,  // 10% to Roth IRA
    personal:     Math.round(n * 0.40 * 100) / 100,  // 40% personal
  };
}

const VADIM_MESSAGES = [
  'Every dollar you invest today is working while you sleep.',
  "You're building generational wealth one paycheck at a time.",
  'Vadim, you and Jessica are ahead of 80% of Americans your age.',
  "Financial freedom isn't a destination — it's a habit you're already building.",
  'Your future self will thank you for every dollar you save today.',
  'Consistency beats intensity. Keep showing up every payday.',
  'Every Roth IRA contribution grows tax-free for decades. Long-game mindset.',
  "Investing isn't risky. Not investing is.",
];

const JESSICA_MESSAGES = {
  orange_theory:     'Your Orange Theory paycheck is building both your body AND your wealth today.',
  competitive_edge:  'Jessica, every contribution to your Roth IRA today means tax-free wealth tomorrow.',
  default:           "You're not just paying bills — you're building your future with Vadim.",
};

export function getVadimMessage(paycheckNumber = 0) {
  return VADIM_MESSAGES[paycheckNumber % VADIM_MESSAGES.length];
}

export function getJessicaMessage(job) {
  return JESSICA_MESSAGES[job] || JESSICA_MESSAGES.default;
}
