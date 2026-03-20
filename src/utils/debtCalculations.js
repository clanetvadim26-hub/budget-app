import { addMonths, format } from 'date-fns';

/** Calculate payoff for a single card */
export function payoffCalc(balance, aprPct, monthlyPayment) {
  if ((balance || 0) <= 0) return { months: 0, totalInterest: 0, totalPaid: 0, timeline: [{ month: 0, balance: 0 }] };
  if ((monthlyPayment || 0) <= 0) return { months: Infinity, totalInterest: Infinity, totalPaid: Infinity, timeline: [] };

  const rate = (aprPct || 0) / 100 / 12;
  if (rate > 0 && monthlyPayment <= balance * rate + 0.01) {
    return { months: Infinity, totalInterest: Infinity, totalPaid: Infinity, timeline: [] };
  }

  let remaining = balance;
  let totalInterest = 0;
  let months = 0;
  const timeline = [{ month: 0, balance: Math.round(remaining) }];

  while (remaining > 0.01 && months < 600) {
    const interest = remaining * rate;
    totalInterest += interest;
    const payment = Math.min(monthlyPayment, remaining + interest);
    remaining = remaining + interest - payment;
    months++;
    if (months <= 36 || months % 3 === 0) {
      timeline.push({ month: months, balance: Math.max(0, Math.round(remaining)) });
    }
  }
  if ((timeline[timeline.length - 1]?.balance || 0) > 0) {
    timeline.push({ month: months, balance: 0 });
  }

  return { months, totalInterest, totalPaid: balance + totalInterest, timeline };
}

/** Monthly interest cost */
export function monthlyInterest(balance, aprPct) {
  return (balance || 0) * ((aprPct || 0) / 100 / 12);
}

/** Human-readable payoff date */
export function payoffDate(months) {
  if (!isFinite(months) || months > 600) return 'Never';
  return format(addMonths(new Date(), months), 'MMM yyyy');
}

/** Interest savings from paying extra */
export function interestSavings(balance, apr, currentPayment, extraAmount) {
  const base = payoffCalc(balance, apr, currentPayment);
  const boosted = payoffCalc(balance, apr, currentPayment + extraAmount);
  if (!isFinite(base.totalInterest) || !isFinite(boosted.totalInterest)) return null;
  return {
    interestSaved: base.totalInterest - boosted.totalInterest,
    monthsSaved: base.months - boosted.months,
    newMonths: boosted.months,
  };
}

/** Generate multi-card balance timeline for chart */
export function generateMultiCardTimeline(creditCards) {
  const cards = creditCards.filter(c => (c.balance || 0) > 0);
  if (!cards.length) return [];

  const rates = cards.map(c => (c.apr || 0) / 100 / 12);
  let balances = cards.map(c => c.balance || 0);
  const payments = cards.map(c => Math.max(c.plannedPayment || c.minPayment || 1, 1));

  let months = 0;
  const data = [{ month: 0, ...Object.fromEntries(cards.map((c, i) => [c.id, Math.round(balances[i])])) }];

  while (balances.some(b => b > 0.01) && months < 120) {
    months++;
    balances = balances.map((b, i) => {
      if (b <= 0) return 0;
      const interest = b * rates[i];
      const payment = Math.min(payments[i], b + interest);
      return Math.max(0, b + interest - payment);
    });
    const snapshot = balances;
    data.push({ month: months, ...Object.fromEntries(cards.map((c, i) => [c.id, Math.round(snapshot[i])])) });
  }

  return data;
}

/** Avalanche vs min-only comparison */
export function avalancheComparison(creditCards) {
  const cards = creditCards.filter(c => (c.balance || 0) > 0 && (c.type === 'credit'));
  if (!cards.length) return null;

  const minResult = simulatePayoff(cards, true);
  const avalResult = simulatePayoff(cards, false);

  return {
    minMonths: minResult.months,
    minInterest: minResult.totalInterest,
    avalancheMonths: avalResult.months,
    avalancheInterest: avalResult.totalInterest,
    interestSaved: Math.max(0, minResult.totalInterest - avalResult.totalInterest),
    monthsSaved: Math.max(0, minResult.months - avalResult.months),
    payoffOrder: avalResult.payoffOrder,
  };
}

function simulatePayoff(cards, minOnly) {
  const sorted = [...cards].sort((a, b) => (b.apr || 0) - (a.apr || 0));
  const rates = sorted.map(c => (c.apr || 0) / 100 / 12);
  let balances = sorted.map(c => c.balance || 0);
  const minPayments = sorted.map(c => Math.max(c.minPayment || 1, 1));

  const totalPlanned = minOnly
    ? minPayments.reduce((s, p) => s + p, 0)
    : sorted.reduce((s, c) => s + Math.max(c.plannedPayment || c.minPayment || 1, 1), 0);
  const totalMin = minPayments.reduce((s, p) => s + p, 0);

  let rollingExtra = Math.max(0, totalPlanned - totalMin);
  let totalInterest = 0;
  let months = 0;
  const paidOff = new Set();
  const payoffOrder = [];

  while (balances.some(b => b > 0.01) && months < 600) {
    months++;

    for (let i = 0; i < sorted.length; i++) {
      if (balances[i] <= 0) continue;
      const interest = balances[i] * rates[i];
      totalInterest += interest;
      balances[i] += interest;
    }

    for (let i = 0; i < sorted.length; i++) {
      if (balances[i] <= 0) continue;
      const payment = Math.min(minPayments[i], balances[i]);
      balances[i] -= payment;
      if (balances[i] < 0.01 && !paidOff.has(i)) {
        paidOff.add(i);
        payoffOrder.push(sorted[i].name);
        rollingExtra += minPayments[i];
        balances[i] = 0;
      }
    }

    if (!minOnly && rollingExtra > 0) {
      for (let i = 0; i < sorted.length; i++) {
        if (balances[i] <= 0 || rollingExtra <= 0) continue;
        const payment = Math.min(rollingExtra, balances[i]);
        balances[i] -= payment;
        rollingExtra -= payment;
        if (balances[i] < 0.01 && !paidOff.has(i)) {
          paidOff.add(i);
          payoffOrder.push(sorted[i].name);
          rollingExtra += minPayments[i];
          balances[i] = 0;
        }
        break; // Avalanche: one card at a time
      }
    }
  }

  return { months, totalInterest, payoffOrder };
}
