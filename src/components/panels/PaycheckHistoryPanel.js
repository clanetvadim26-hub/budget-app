import React from 'react';
import { useLocalStorage } from '../../hooks/useLocalStorage';

const fmt = (n) =>
  '$' + Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function PaycheckHistoryPanel() {
  const [confirmedPaychecks] = useLocalStorage('budget_confirmed_paychecks', {});
  const [recurringIncomes]   = useLocalStorage('budget_recurring_incomes', []);

  // Build display list from the confirmed paychecks object
  // Keys are like: inc_vadim_paycheck_2026-03-14
  // Values are: { confirmedDate, actualAmount }
  const rows = Object.entries(confirmedPaychecks || {}).map(([key, val]) => {
    // Find matching recurring income
    const matchingIncome = recurringIncomes.find((ri) => key.startsWith(ri.id));
    const person = matchingIncome?.person
      || (key.includes('vadim') ? 'Vadim' : key.includes('jessica') ? 'Jessica' : 'Unknown');
    const source = matchingIncome?.name || 'Paycheck';

    // Extract payday date — last 3 underscore segments form the date yyyy-MM-dd
    const parts = key.split('_');
    let paydayDate = '';
    if (parts.length >= 3) {
      // Last 3 parts could be YYYY-MM-DD
      const candidate = parts.slice(-3).join('-');
      if (/^\d{4}-\d{2}-\d{2}$/.test(candidate)) {
        paydayDate = candidate;
      } else {
        // Fall back: last part if it looks like a date, or confirmedDate
        paydayDate = val.confirmedDate || '';
      }
    }

    return {
      key,
      paydayDate,
      person,
      source,
      amount:        val.actualAmount  || 0,
      confirmedDate: val.confirmedDate || '',
    };
  }).sort((a, b) => new Date(b.paydayDate) - new Date(a.paydayDate));

  const vadimTotal   = rows.filter((r) => r.person === 'Vadim').reduce((s, r)   => s + r.amount, 0);
  const jessicaTotal = rows.filter((r) => r.person === 'Jessica').reduce((s, r) => s + r.amount, 0);

  return (
    <div className="paycheck-history-panel">
      <div className="ph-header">
        <h3 className="ph-title">Paycheck History</h3>
        <div className="ph-subtotals">
          <span className="ph-subtotal vadim-color">👨 Vadim: {fmt(vadimTotal)}</span>
          <span className="ph-subtotal jessica-color">👩 Jessica: {fmt(jessicaTotal)}</span>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="empty-state">No confirmed paychecks yet.</div>
      ) : (
        <div className="ph-table-wrap">
          <table className="ph-table">
            <thead>
              <tr>
                <th>Payday</th>
                <th>Person</th>
                <th>Source</th>
                <th>Amount</th>
                <th>Confirmed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  <td className="ph-date">{row.paydayDate}</td>
                  <td>
                    <span className={`ph-person-badge ${row.person.toLowerCase()}-badge`}>
                      {row.person}
                    </span>
                  </td>
                  <td className="ph-source">{row.source}</td>
                  <td className="ph-amount">{fmt(row.amount)}</td>
                  <td className="ph-confirmed">{row.confirmedDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
