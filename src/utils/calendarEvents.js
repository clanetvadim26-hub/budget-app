import { format, parseISO, addMonths, addDays, startOfMonth, getDaysInMonth, isAfter } from 'date-fns';
import { getRecurringDates } from './recurringDates';

export function buildEventMap(startDate, endDate, {
  recurringIncomes = [],
  recurringExpenses = [],
  accounts = [],
  expenses = [],
  incomes = [],
  confirmedPaychecks = {},
  paidExpenseKeys = {},
  paidCCPayments = {},
  loans = [],
}) {
  const map = {};

  const add = (date, event) => {
    const key = format(date, 'yyyy-MM-dd');
    if (!map[key]) map[key] = [];
    map[key].push(event);
  };

  const inRange = (d) => d >= startDate && d <= endDate;

  // 1. Recurring income pay dates
  recurringIncomes.forEach((ri) => {
    if (!ri.active) return;
    const dates = getRecurringDates(ri.startDate, ri.frequency, addDays(endDate, 1));
    dates.forEach((d) => {
      if (!inRange(d)) return;
      const ds = format(d, 'yyyy-MM-dd');
      const ckey = `${ri.id}_${ds}`;
      add(d, {
        id: ckey,
        type: 'paycheck',
        label: `${ri.person}: ${ri.name}`,
        shortLabel: ri.person,
        amount: ri.amount,
        status: confirmedPaychecks[ckey] ? 'confirmed' : 'pending',
        isIncome: true,
      });
    });
  });

  // 2. Logged incomes
  incomes.forEach((inc) => {
    try {
      const d = parseISO(inc.date);
      if (!inRange(d)) return;
      add(d, {
        id: inc.id,
        type: 'income',
        label: `${inc.source}${inc.description ? ': ' + inc.description : ''}`,
        shortLabel: inc.source,
        amount: inc.amount,
        status: 'confirmed',
        isIncome: true,
      });
    } catch {}
  });

  // 3. Recurring expense due dates (bills)
  recurringExpenses.forEach((re) => {
    if (!re.active) return;
    const dates = getRecurringDates(re.startDate, re.frequency, addDays(endDate, 1));
    dates.forEach((d) => {
      if (!inRange(d)) return;
      const ds = format(d, 'yyyy-MM-dd');
      const ekey = `${re.id}_${ds}`;
      const paid = !!(paidExpenseKeys && paidExpenseKeys[ekey]);
      add(d, {
        id: ekey,
        type: 'bill',
        label: re.name,
        shortLabel: re.name.length > 10 ? re.name.slice(0, 10) + '…' : re.name,
        amount: re.amount,
        status: paid ? 'paid' : 'unpaid',
        isExpense: true,
      });
    });
  });

  // 4. Credit card payment due dates (one per month, based on dueDay)
  accounts
    .filter((a) => a.type === 'credit' && (a.balance || 0) > 0 && a.dueDay)
    .forEach((cc) => {
      let month = startOfMonth(startDate);
      while (!isAfter(month, endDate)) {
        const day = Math.min(cc.dueDay, getDaysInMonth(month));
        const dueDate = new Date(month.getFullYear(), month.getMonth(), day);
        if (inRange(dueDate)) {
          const mk = format(month, 'yyyy-MM');
          const pkey = `cc_${cc.id}_${mk}`;
          const paid = !!(paidCCPayments && paidCCPayments[pkey]);
          add(dueDate, {
            id: pkey,
            type: 'credit-payment',
            label: cc.name,
            shortLabel: cc.name.replace(/credit card/gi, 'CC').slice(0, 14),
            amount: cc.plannedPayment || cc.minPayment || 0,
            status: paid ? 'paid' : 'unpaid',
            isExpense: true,
          });
        }
        month = addMonths(month, 1);
      }
    });

  // 5. Installment loan payment due dates (one per month, walking balance forward)
  loans
    .filter((l) => (l.balance || 0) > 0 && l.dueDay)
    .forEach((loan) => {
      const rate = (loan.apr || 0) / 100 / 12;
      let bal = loan.balance || 0;
      let month = startOfMonth(startDate);
      while (!isAfter(month, endDate)) {
        const day     = Math.min(loan.dueDay, getDaysInMonth(month));
        const dueDate = new Date(month.getFullYear(), month.getMonth(), day);
        const interest  = bal * rate;
        const payment   = Math.min(loan.monthlyPayment || 0, bal + interest);
        const principal = Math.max(0, payment - interest);
        if (inRange(dueDate)) {
          add(dueDate, {
            id:           `loan_${loan.id}_${format(month, 'yyyy-MM')}`,
            type:         'loan-payment',
            label:        loan.name,
            shortLabel:   loan.name.length > 12 ? loan.name.slice(0, 12) + '…' : loan.name,
            amount:       Math.round(payment  * 100) / 100,
            status:       'upcoming',
            isExpense:    true,
            loanType:     loan.type,
            loanInterest: Math.round(interest  * 100) / 100,
            loanPrincipal:Math.round(principal * 100) / 100,
          });
        }
        // Advance balance for next month
        bal = Math.max(0, bal + interest - payment);
        if (bal <= 0.01) break;
        month = addMonths(month, 1);
      }
    });

  // 6. Logged expenses
  expenses.forEach((exp) => {
    try {
      const d = parseISO(exp.date);
      if (!inRange(d)) return;
      add(d, {
        id: exp.id,
        type: 'expense',
        label: exp.description || exp.category,
        shortLabel: (exp.category || '').slice(0, 10),
        amount: exp.amount,
        status: 'logged',
        isExpense: true,
      });
    } catch {}
  });

  return map;
}

export function getEventColor(event) {
  if (event.type === 'paycheck' || event.type === 'income') return '#D4AF37';
  if (event.type === 'bill') return event.status === 'paid' ? '#4ADE80' : '#F87171';
  if (event.type === 'credit-payment') return event.status === 'paid' ? '#4ADE80' : '#FB923C';
  if (event.type === 'loan-payment')   return '#60A5FA';
  if (event.type === 'expense') return '#FB7185';
  return '#94A3B8';
}

export function getDayNet(events) {
  if (!events) return 0;
  return events.reduce((net, e) => {
    if (e.isIncome) return net + e.amount;
    if (e.isExpense) return net - e.amount;
    return net;
  }, 0);
}
