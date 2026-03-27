import React, { useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { DEFAULT_ACCOUNTS, ACCOUNT_TYPE_META } from '../data/accounts';

export default function SetupWizard({ onComplete }) {
  const [setupComplete, setSetupComplete] = useLocalStorage('budget_setup_complete', false);
  const [accounts, setAccounts] = useLocalStorage('budget_accounts', DEFAULT_ACCOUNTS);
  const [step, setStep] = useState(0);
  const [balances, setBalances] = useState({});
  const [creditDetails, setCreditDetails] = useState({});
  const [rothContribs, setRothContribs] = useState({});

  if (setupComplete) return null;

  const handleComplete = () => {
    const updated = accounts.map((acc) => {
      const balance = balances[acc.id];
      const credit  = creditDetails[acc.id] || {};
      const roth    = rothContribs[acc.id];
      return {
        ...acc,
        balance:          balance != null ? Number(balance) : acc.balance,
        creditLimit:      credit.creditLimit != null ? Number(credit.creditLimit) : acc.creditLimit,
        apr:              credit.apr        != null ? Number(credit.apr)         : acc.apr,
        minPayment:       credit.minPayment != null ? Number(credit.minPayment)  : acc.minPayment,
        ytdContributions: roth    != null ? Number(roth)    : acc.ytdContributions,
        lastUpdated:      new Date().toISOString().slice(0, 10),
      };
    });
    setAccounts(updated);
    setSetupComplete(true);
    if (onComplete) onComplete();
  };

  const stepLabels = ['Welcome', 'Your Accounts', 'Done'];

  return (
    <div className="wizard-overlay">
      <div className="wizard-card">
        {/* Step indicator */}
        <div className="wizard-steps">
          {stepLabels.map((label, i) => (
            <React.Fragment key={i}>
              <div className={`wizard-dot ${i === step ? 'active' : i < step ? 'done' : ''}`}>
                {i < step ? '✓' : i + 1}
                <span className="wizard-dot-label">{label}</span>
              </div>
              {i < stepLabels.length - 1 && (
                <div className={`wizard-connector ${i < step ? 'done' : ''}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step 0: Welcome */}
        {step === 0 && (
          <div className="wizard-body">
            <div className="wizard-icon">💰</div>
            <h2 className="wizard-title">Welcome to BudgetFlow</h2>
            <p className="wizard-desc">
              Let's set up your accounts so we can track your financial picture accurately.
              This takes about 2 minutes.
            </p>
            <button className="wizard-btn-primary" onClick={() => setStep(1)}>Get Started →</button>
            <button className="wizard-btn-skip" onClick={handleComplete}>Skip setup</button>
          </div>
        )}

        {/* Step 1: Account balances */}
        {step === 1 && (
          <div className="wizard-body">
            <h2 className="wizard-title">Enter Your Current Balances</h2>
            <p className="wizard-desc">Enter the current balance for each account. You can always update these later.</p>
            <div className="wizard-accounts-list">
              {accounts.map((acc) => {
                const isCredit = ['credit', 'store_credit'].includes(acc.type);
                const isRoth   = acc.type === 'roth_ira';
                const meta     = ACCOUNT_TYPE_META[acc.type] || {};
                return (
                  <div key={acc.id} className="wizard-account-row">
                    <div className="wizard-account-name">
                      {meta.icon} {acc.name}
                      <span className="wizard-account-owner"> ({acc.owner})</span>
                    </div>
                    <div className="wizard-account-fields">
                      <div className="wizard-field">
                        <label>{isCredit ? 'Current Balance Owed ($)' : 'Current Balance ($)'}</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={balances[acc.id] ?? ''}
                          onChange={(e) => setBalances((prev) => ({ ...prev, [acc.id]: e.target.value }))}
                          className="wizard-input"
                        />
                      </div>
                      {isCredit && (
                        <>
                          <div className="wizard-field">
                            <label>Credit Limit ($)</label>
                            <input type="number" min="0" placeholder="0" className="wizard-input"
                              value={creditDetails[acc.id]?.creditLimit ?? ''}
                              onChange={(e) => setCreditDetails((prev) => ({ ...prev, [acc.id]: { ...prev[acc.id], creditLimit: e.target.value } }))} />
                          </div>
                          <div className="wizard-field">
                            <label>APR (%)</label>
                            <input type="number" min="0" max="100" step="0.01" placeholder="0.00" className="wizard-input"
                              value={creditDetails[acc.id]?.apr ?? ''}
                              onChange={(e) => setCreditDetails((prev) => ({ ...prev, [acc.id]: { ...prev[acc.id], apr: e.target.value } }))} />
                          </div>
                          <div className="wizard-field">
                            <label>Min Payment ($)</label>
                            <input type="number" min="0" step="0.01" placeholder="0.00" className="wizard-input"
                              value={creditDetails[acc.id]?.minPayment ?? ''}
                              onChange={(e) => setCreditDetails((prev) => ({ ...prev, [acc.id]: { ...prev[acc.id], minPayment: e.target.value } }))} />
                          </div>
                        </>
                      )}
                      {isRoth && (
                        <div className="wizard-field">
                          <label>2025 Contributions So Far ($)</label>
                          <input type="number" min="0" step="0.01" placeholder="0.00" className="wizard-input"
                            value={rothContribs[acc.id] ?? ''}
                            onChange={(e) => setRothContribs((prev) => ({ ...prev, [acc.id]: e.target.value }))} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="wizard-footer">
              <button className="wizard-btn-secondary" onClick={() => setStep(0)}>← Back</button>
              <button className="wizard-btn-primary" onClick={() => setStep(2)}>Review →</button>
            </div>
          </div>
        )}

        {/* Step 2: Complete */}
        {step === 2 && (
          <div className="wizard-body">
            <div className="wizard-icon">✅</div>
            <h2 className="wizard-title">You're All Set!</h2>
            <p className="wizard-desc">
              Your account balances have been entered. BudgetFlow will now track your
              financial health automatically.
            </p>
            <div className="wizard-summary">
              {accounts
                .filter((a) => balances[a.id] != null && balances[a.id] !== '')
                .map((acc) => (
                  <div key={acc.id} className="wizard-summary-row">
                    <span>{acc.name}</span>
                    <span className="wizard-summary-amount">
                      ${Number(balances[acc.id] || 0).toLocaleString()}
                    </span>
                  </div>
                ))}
            </div>
            <div className="wizard-footer">
              <button className="wizard-btn-secondary" onClick={() => setStep(1)}>← Back</button>
              <button className="wizard-btn-primary" onClick={handleComplete}>Complete Setup ✓</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
