import React, { useState } from 'react';
import { LOAN_TYPE_META } from '../../utils/loanCalculations';

const EMPTY_FORM = {
  name: '', type: 'car', owner: 'Vadim',
  originalAmount: '', balance: '', apr: '',
  monthlyPayment: '', dueDay: '', startDate: '',
  termValue: '', termUnit: 'months', notes: '',
};

export default function AddLoanForm({ onAdd, onCancel, initialData }) {
  const [form, setForm] = useState(() => {
    if (!initialData) return EMPTY_FORM;
    const termMonths = initialData.termMonths || 0;
    return {
      name:           initialData.name          || '',
      type:           initialData.type          || 'car',
      owner:          initialData.owner         || 'Vadim',
      originalAmount: String(initialData.originalAmount || ''),
      balance:        String(initialData.balance        || ''),
      apr:            String(initialData.apr            || ''),
      monthlyPayment: String(initialData.monthlyPayment || ''),
      dueDay:         String(initialData.dueDay         || ''),
      startDate:      initialData.startDate     || '',
      termValue:      termMonths ? String(termMonths) : '',
      termUnit:       'months',
      notes:          initialData.notes         || '',
    };
  });

  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const termMonths = form.termValue
      ? (form.termUnit === 'years'
          ? Math.round(parseFloat(form.termValue) * 12)
          : parseInt(form.termValue, 10))
      : 0;
    onAdd({
      id:             initialData?.id || `loan_${Date.now()}`,
      name:           form.name.trim(),
      type:           form.type,
      owner:          form.owner,
      originalAmount: parseFloat(form.originalAmount) || 0,
      balance:        parseFloat(form.balance)        || 0,
      apr:            parseFloat(form.apr)            || 0,
      monthlyPayment: parseFloat(form.monthlyPayment) || 0,
      dueDay:         parseInt(form.dueDay, 10)       || 1,
      startDate:      form.startDate,
      termMonths,
      notes:          form.notes.trim(),
    });
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="add-loan-modal" onClick={(e) => e.stopPropagation()}>
        <div className="loan-modal-header">
          <h3>{initialData ? 'Edit Loan' : 'Add Installment Loan'}</h3>
          <button className="modal-close" onClick={onCancel}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="loan-form-grid">

            <div className="form-group loan-span-2">
              <label>Loan Name *</label>
              <input
                type="text"
                placeholder="e.g. 2020 Nissan Altima"
                value={form.name}
                onChange={set('name')}
                required
              />
            </div>

            <div className="form-group">
              <label>Loan Type *</label>
              <select value={form.type} onChange={set('type')} required>
                {Object.entries(LOAN_TYPE_META).map(([k, v]) => (
                  <option key={k} value={k}>{v.icon} {v.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Owner *</label>
              <select value={form.owner} onChange={set('owner')} required>
                <option value="Vadim">Vadim</option>
                <option value="Jessica">Jessica</option>
                <option value="Joint">Joint</option>
              </select>
            </div>

            <div className="form-group">
              <label>Original Loan Amount ($) *</label>
              <input
                type="number" min="0" step="0.01"
                placeholder="30000"
                value={form.originalAmount}
                onChange={set('originalAmount')}
                required
              />
            </div>

            <div className="form-group">
              <label>Current Remaining Balance ($) *</label>
              <input
                type="number" min="0" step="0.01"
                placeholder="22500"
                value={form.balance}
                onChange={set('balance')}
                required
              />
            </div>

            <div className="form-group">
              <label>Interest Rate / APR (%)</label>
              <input
                type="number" min="0" step="0.001"
                placeholder="5.9"
                value={form.apr}
                onChange={set('apr')}
              />
            </div>

            <div className="form-group">
              <label>Monthly Payment ($) *</label>
              <input
                type="number" min="0" step="0.01"
                placeholder="450"
                value={form.monthlyPayment}
                onChange={set('monthlyPayment')}
                required
              />
            </div>

            <div className="form-group">
              <label>Payment Due Day (1–28)</label>
              <input
                type="number" min="1" max="28"
                placeholder="15"
                value={form.dueDay}
                onChange={set('dueDay')}
              />
            </div>

            <div className="form-group">
              <label>Loan Start Date</label>
              <input type="date" value={form.startDate} onChange={set('startDate')} />
            </div>

            <div className="form-group loan-term-group">
              <label>Loan Term</label>
              <div className="term-input-row">
                <input
                  type="number" min="1"
                  placeholder="60"
                  value={form.termValue}
                  onChange={set('termValue')}
                />
                <select value={form.termUnit} onChange={set('termUnit')}>
                  <option value="months">Months</option>
                  <option value="years">Years</option>
                </select>
              </div>
            </div>

            <div className="form-group loan-span-2">
              <label>Notes (optional)</label>
              <textarea
                rows={2}
                placeholder="Any extra details about this loan..."
                value={form.notes}
                onChange={set('notes')}
              />
            </div>

          </div>

          <div className="loan-form-actions">
            <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
            <button type="submit" className="btn-primary">{initialData ? 'Save Changes' : 'Add Loan'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
