import {
  addDays, addWeeks, addMonths, isBefore, isAfter,
  differenceInDays, format, startOfMonth, endOfMonth,
} from 'date-fns';

export function getRecurringDates(startDate, frequency, endDate) {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : addMonths(new Date(), 3);
  const dates = [];
  let current = new Date(start);

  // If start is in the future, walk back to find the first occurrence before/at end
  while (isBefore(current, end)) {
    if (!isBefore(current, start)) {
      dates.push(new Date(current));
    }
    switch (frequency) {
      case 'bi-weekly': current = addDays(current, 14); break;
      case 'weekly':    current = addWeeks(current, 1); break;
      case 'monthly':   current = addMonths(current, 1); break;
      default:          current = addDays(current, 14);
    }
  }
  return dates;
}

// Returns paychecks that are pending confirmation:
// - occurred within the last 30 days and not yet confirmed
// - OR occur within the next 3 days and not yet confirmed
export function getPendingPaychecks(recurringIncomes, confirmedPaychecks) {
  const today = new Date();
  const lookAhead = addDays(today, 3);
  const lookBack = addDays(today, -30);
  const pending = [];

  recurringIncomes.forEach((income) => {
    if (!income.active) return;
    const dates = getRecurringDates(income.startDate, income.frequency, lookAhead);
    dates.forEach((date) => {
      if (isBefore(date, lookBack)) return;
      const dateStr = format(date, 'yyyy-MM-dd');
      const key = `${income.id}_${dateStr}`;
      if (!confirmedPaychecks[key]) {
        pending.push({
          key,
          income,
          date,
          dateStr,
          daysFromToday: differenceInDays(date, today),
        });
      }
    });
  });

  return pending.sort((a, b) => a.date - b.date);
}

// Returns recurring expenses due this calendar month that haven't been paid
export function getUpcomingThisMonth(recurringExpenses, paidExpenseKeys) {
  const today = new Date();
  const start = startOfMonth(today);
  const end = endOfMonth(today);
  const upcoming = [];

  recurringExpenses.forEach((expense) => {
    if (!expense.active) return;
    const dates = getRecurringDates(expense.startDate, expense.frequency, addDays(end, 1));
    dates.forEach((date) => {
      if (isBefore(date, start) || isAfter(date, end)) return;
      const dateStr = format(date, 'yyyy-MM-dd');
      const key = `${expense.id}_${dateStr}`;
      const isPaid = paidExpenseKeys && paidExpenseKeys[key];
      upcoming.push({
        key,
        expense,
        date,
        dateStr,
        daysUntil: differenceInDays(date, today),
        isPaid: !!isPaid,
      });
    });
  });

  return upcoming.sort((a, b) => a.date - b.date);
}

// Monthly projection from recurring incomes (bi-weekly = ~2.17 per month)
export function monthlyProjection(recurringIncomes) {
  return recurringIncomes
    .filter((i) => i.active)
    .reduce((sum, i) => {
      const multiplier = i.frequency === 'bi-weekly' ? 2.17 : i.frequency === 'weekly' ? 4.33 : 1;
      return sum + i.amount * multiplier;
    }, 0);
}

// Monthly fixed cost from recurring expenses
export function monthlyFixedCost(recurringExpenses) {
  return recurringExpenses
    .filter((e) => e.active)
    .reduce((sum, e) => {
      const multiplier = e.frequency === 'bi-weekly' ? 2.17 : e.frequency === 'weekly' ? 4.33 : 1;
      return sum + e.amount * multiplier;
    }, 0);
}
