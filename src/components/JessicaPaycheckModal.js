import React, { useState } from 'react';
import { format } from 'date-fns';
import { formatCurrencyFull } from '../utils/calculations';
import { calcJessicaAllocation, getJessicaMessage } from '../utils/paycheckAllocation';

const JOB_META = {
  orange_theory:    { label: 'Orange Theory',         icon: '🏋️', color: '#FB923C' },
  competitive_edge: { label: 'Competitive Edge LLC',  icon: '💼', color: '#60A5FA' },
};

export default function JessicaPaycheckModal({ paycheckItem, onConfirm, onClose }) {
  const [amount, setAmount]   = useState('');
  const [step, setStep]       = useState('enter'); // 'enter' | 'review'

  const meta   = paycheckItem?.income?.metadata || {};
  const job    = meta.paycheckJob || 'default';
  const jobMeta = JOB_META[job] || { label: 'Paycheck', icon: '💰', color: '#D4AF37' };
  const paydayDate = paycheckItem?.date || new Date();
  const alloc  = step === 'review' ? calcJessicaAllocation(amount) : null;
  const msg    = getJessicaMessage(job);

  const handleNext = () => {
    if (!amount || Number(amount) <= 0) return;
    setStep('review');
  };

  const handleConfirm = () => {
    onConfirm(paycheckItem, Number(amount));
  };

  return (
    <div className="pa-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pa-modal jessica-modal">
        {/* Header */}
        <div className="pa-header">
          <div>
            <h2 className="pa-title" style={{ color: jobMeta.color }}>
              {jobMeta.icon} Jessica's Paycheck
            </h2>
            <div className="pa-subtitle">
              {jobMeta.label} — {format(paydayDate, 'MMMM d, yyyy')}
            </div>
          </div>
          <button className="pa-close" onClick={onClose}>×</button>
        </div>

        {/* Motivational message */}
        <div className="pa-motivational jessica-msg">"{msg}"</div>

        {step === 'enter' && (
          <div className="jessica-entry">
            <label className="jessica-label">
              How much was your {jobMeta.label} paycheck?
            </label>
            <div className="jessica-amount-wrap">
              <span className="jessica-dollar">$</span>
              <input
                className="jessica-amount-input"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
              />
            </div>
            <div className="pa-footer">
              <button
                className="pa-confirm-btn"
                onClick={handleNext}
                disabled={!amount || Number(amount) <= 0}
              >
                See My Allocation →
              </button>
              <button className="pa-skip-btn" onClick={onClose}>Remind Me Later</button>
            </div>
          </div>
        )}

        {step === 'review' && alloc && (
          <>
            <div className="pa-total-banner">
              <span className="pa-total-label">Paycheck Amount</span>
              <span className="pa-total-amount">{formatCurrencyFull(alloc.paycheck)}</span>
            </div>

            <div className="pa-sections">
              <div className="pa-section">
                <div className="pa-section-title" style={{ color: '#F472B6' }}>
                  📊 Your Allocation Breakdown
                </div>

                <div className="pa-row">
                  <div>
                    <span>🏠 Household Contribution</span>
                    <span className="pa-chip" style={{ background: 'rgba(96,165,250,0.15)', color: '#60A5FA' }}>40%</span>
                  </div>
                  <span style={{ color: '#60A5FA', fontWeight: 700 }}>{formatCurrencyFull(alloc.household)}</span>
                </div>

                <div className="pa-row">
                  <div>
                    <span>💰 Capital One Joint Savings</span>
                    <span className="pa-chip" style={{ background: 'rgba(74,222,128,0.15)', color: '#4ADE80' }}>10%</span>
                  </div>
                  <span style={{ color: '#4ADE80' }}>{formatCurrencyFull(alloc.jointSavings)}</span>
                </div>

                <div className="pa-row">
                  <div>
                    <span>📈 Jessica's Roth IRA</span>
                    <span className="pa-chip" style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37' }}>10%</span>
                  </div>
                  <span style={{ color: '#D4AF37' }}>{formatCurrencyFull(alloc.rothIRA)}</span>
                </div>

                <div className="pa-row">
                  <div>
                    <span>👩 Jessica's Personal</span>
                    <span className="pa-chip" style={{ background: 'rgba(167,139,250,0.15)', color: '#A78BFA' }}>40%</span>
                  </div>
                  <span style={{ color: '#A78BFA', fontWeight: 700 }}>{formatCurrencyFull(alloc.personal)}</span>
                </div>
              </div>
            </div>

            <div className="pa-footer">
              <button className="pa-confirm-btn jessica-confirm" onClick={handleConfirm}>
                ✓ Confirm & Post Income
              </button>
              <button className="pa-skip-btn" onClick={() => setStep('enter')}>← Edit Amount</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
