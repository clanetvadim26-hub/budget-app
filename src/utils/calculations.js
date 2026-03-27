import { format, startOfMonth, endOfMonth, isWithinInterval, subMonths, startOfWeek, endOfWeek } from 'date-fns';

export const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);

export const formatCurrencyFull = (amount) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

export const filterByMonth = (items, date) => {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  return items.filter((item) => {
    const d = new Date(item.date);
    return isWithinInterval(d, { start, end });
  });
};

export const filterByWeek = (items, date) => {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const end = endOfWeek(date, { weekStartsOn: 1 });
  return items.filter((item) => {
    const d = new Date(item.date);
    return isWithinInterval(d, { start, end });
  });
};

export const getTotalIncome = (incomes) =>
  incomes.reduce((sum, i) => sum + Number(i.amount), 0);

export const getTotalExpenses = (expenses) =>
  expenses.reduce((sum, e) => sum + Number(e.amount), 0);

export const getSavingsRate = (income, expenses) => {
  if (income === 0) return 0;
  return ((income - expenses) / income) * 100;
};

export const getExpensesByCategory = (expenses) => {
  const map = {};
  expenses.forEach((e) => {
    map[e.category] = (map[e.category] || 0) + Number(e.amount);
  });
  return map;
};

export const getLast6MonthsData = (incomes, expenses) => {
  const today = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const monthDate = subMonths(today, i);
    const label = format(monthDate, 'MMM yy');
    const monthIncome = getTotalIncome(filterByMonth(incomes, monthDate));
    const monthExpenses = getTotalExpenses(filterByMonth(expenses, monthDate));
    months.push({ month: label, income: monthIncome, expenses: monthExpenses, net: monthIncome - monthExpenses });
  }
  return months;
};

export const getIncomeBySource = (incomes) => {
  const vadim = incomes.filter((i) => i.source === 'Vadim').reduce((s, i) => s + Number(i.amount), 0);
  const jessica = incomes.filter((i) => i.source === 'Jessica').reduce((s, i) => s + Number(i.amount), 0);
  const other = incomes.filter((i) => i.source === 'Other').reduce((s, i) => s + Number(i.amount), 0);
  return { vadim, jessica, other };
};

/**
 * Generates monthly cash flow data from a given startDate to the current month.
 * @param {Array}  incomes   - all income entries
 * @param {Array}  expenses  - all expense entries
 * @param {string} startDate - ISO date string like '2026-03-01'
 * @returns {Array} array of { month, income, expenses, net } objects
 */
export function getCashFlowDataFromDate(incomes, expenses, startDate) {
  const start = new Date(startDate);
  const now   = new Date();
  const months = [];

  let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor <= now) {
    months.push(new Date(cursor));
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }

  return months.map((monthDate) => {
    const year     = monthDate.getFullYear();
    const month    = monthDate.getMonth();
    const monthStr = monthDate.toLocaleString('default', { month: 'short', year: '2-digit' });

    const monthIncome = (incomes || [])
      .filter((i) => { const d = new Date(i.date); return d.getFullYear() === year && d.getMonth() === month; })
      .reduce((sum, i) => sum + Number(i.amount || 0), 0);

    const monthExpenses = (expenses || [])
      .filter((e) => { const d = new Date(e.date); return d.getFullYear() === year && d.getMonth() === month; })
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);

    return { month: monthStr, income: monthIncome, expenses: monthExpenses, net: monthIncome - monthExpenses };
  });
}
