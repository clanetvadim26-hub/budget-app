import React, { useState, useEffect } from 'react';
import { format, addMonths } from 'date-fns';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { DEFAULT_ACCOUNTS, ACCOUNT_TYPE_META, OWNER_COLORS } from '../../data/accounts';
import { formatCurrency } from '../../utils/calculations';
import { monthlyInterest } from '../../utils/debtCalculations';
import { getContributionForAccount } from '../../utils/budgetPlanSync';
import NetWorthChart from '../charts/NetWorthChart';
import { useConfirm } from '../ConfirmModal';

function GoalProjection({ balance, targetGoal, monthlyContribution }) {
  if (!targetGoal || targetGoal <= 0) return null;
  const pct = Math.min((balance / targetGoal) * 100, 100);
  if (pct >= 100) {
    return <span className="goal-badge goal-reached">🎉 Goal Reached!</span>;
  }
  if (!monthlyContribution || monthlyContribution <= 0) {
    return <span className="goal-badge goal-no-contrib">Set contribution to project</span>;
  }
  const gap    = targetGoal - balance;
  const months = Math.ceil(gap / monthlyContribution);
  const date   = addMonths(new Date(), months);
  const status = months <= 6  ? 'ahead'
               : months <= 18 ? 'on-track'
               :                'behind';
  const meta   = {
    ahead:    { label: 'Ahead',    color: '#4ADE80' },
    'on-track':{ label: 'On Track', color: '#FBBF24' },
    behind:   { label: 'Behind',   color: '#F87171' },
  }[status];
  return (
    <span className="goal-projection">
      <span className="goal-badge" style={{ background: meta.color + '22', color: meta.color }}>{meta.label}</span>
      <span className="goal-proj-date">Goal in ~{months}mo ({format(date, 'MMM yyyy')})</span>
    </span>
  );
}

const TYPE_GROUPS = {
  'Checking & Savings': ['checking', 'savings', 'money_market', 'cd'],
  'Credit & Loans':     ['credit', 'store_credit', 'mortgage', 'auto_loan', 'personal_loan', 'student_loan'],
  'Retirement':         ['roth_ira', 'traditional_ira', '401k', 'roth_401k', '403b', 'hsa'],
  'Investment':         ['brokerage', 'reit', 'crypto'],
};
const FLOW_TYPES = [
  { value: 'income',      label: 'Income deposit',     color: '#D4AF37' },
  { value: 'bill',        label: 'Bill / expense pay',  color: '#F87171' },
  { value: 'cc_payment',  label: 'CC payment',          color: '#FB923C' },
  { value: 'loan',        label: 'Loan payment',        color: '#60A5FA' },
  { value: 'investment',  label: 'Investment transfer', color: '#4ADE80' },
  { value: 'transfer',    label: 'Transfer',            color: '#A78BFA' },
];

function UtilizationBar({ balance, creditLimit }) {
  if (!creditLimit || creditLimit <= 0) return null;
  const pct = Math.min((balance / creditLimit) * 100, 100);
  const color = pct < 30 ? '#4ADE80' : pct < 60 ? '#FACC15' : '#F87171';
  return (
    <div className="util-wrap">
      <div className="util-header">
        <span className="util-label">Utilization</span>
        <span style={{ color, fontWeight: 700, fontSize: 13 }}>{pct.toFixed(1)}%</span>
        <span className="util-limit">of {formatCurrency(creditLimit)}</span>
      </div>
      <div className="progress-bar-wrap" style={{ marginBottom: 4 }}>
        <div className="progress-bar-fill" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <div className="util-hint" style={{ color }}>
        {pct < 30 ? '✓ Good' : pct < 60 ? '⚠ Moderate' : '✗ High — impacts credit score'}
      </div>
    </div>
  );
}

function AccountCard({ account, settings = {}, onSave, onDelete }) {
  const isCC = account.type === 'credit';
  const isInvestment = ACCOUNT_TYPE_META[account.type]?.isInvestment || false;
  const planContrib = isInvestment ? getContributionForAccount(settings, account.id) : null;
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    balance:            account.balance            || 0,
    creditLimit:        account.creditLimit        || 0,
    apr:                account.apr                || 0,
    minPayment:         account.minPayment         || 0,
    plannedPayment:     account.plannedPayment      || 0,
    dueDay:             account.dueDay             || 1,
    monthlyContribution:account.monthlyContribution|| 0,
    targetGoal:         account.targetGoal         || 0,
    ytdContributions:   account.ytdContributions   || 0,
    totalContributed:   account.totalContributed   || 0,
    annualTarget:       account.annualTarget        || 0,
  });
  const f = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const meta = ACCOUNT_TYPE_META[account.type] || { label: account.type, icon: '💰', color: '#94A3B8', isLiability: false };
  const ownerColor = OWNER_COLORS[account.owner] || '#94A3B8';
  const pct = account.targetGoal > 0 ? Math.min((account.balance / account.targetGoal) * 100, 100) : null;
  const monthlyInt = isCC ? monthlyInterest(account.balance, account.apr) : 0;

  const handleSave = () => {
    onSave(account.id, Object.fromEntries(Object.entries(form).map(([k, v]) => [k, Number(v)])));
    setEditing(false);
  };

  return (
    <div className="account-card">
      <div className="account-card-header">
        <div className="account-type-icon" style={{ backgroundColor: meta.color + '22', color: meta.color }}>
          {meta.icon}
        </div>
        <div className="account-title-wrap">
          <div className="account-name">{account.name}</div>
          <div className="account-meta-row">
            <span className="account-type-badge" style={{ color: meta.color }}>{meta.label}</span>
            <span className="account-owner-badge" style={{ color: ownerColor }}>· {account.owner}</span>
          </div>
        </div>
        <div className="account-balance-wrap">
          <div className={`account-balance ${meta.isLiability ? 'negative' : ''}`}>
            {meta.isLiability ? '-' : ''}{formatCurrency(account.balance)}
          </div>
          {account.lastUpdated && <div className="account-updated">Updated {account.lastUpdated}</div>}
        </div>
      </div>

      {/* Utilization bar for credit cards */}
      {isCC && <UtilizationBar balance={account.balance || 0} creditLimit={account.creditLimit || 0} />}

      {/* Credit card details strip */}
      {isCC && (account.apr > 0 || account.minPayment > 0 || account.dueDay > 0) && (
        <div className="cc-details-strip">
          {account.apr > 0 && <span className="cc-detail-chip"><span className="cc-chip-label">APR</span> {account.apr}%</span>}
          {account.minPayment > 0 && <span className="cc-detail-chip"><span className="cc-chip-label">Min</span> {formatCurrency(account.minPayment)}/mo</span>}
          {account.plannedPayment > 0 && <span className="cc-detail-chip"><span className="cc-chip-label">Planned</span> {formatCurrency(account.plannedPayment)}/mo</span>}
          {account.dueDay > 0 && <span className="cc-detail-chip"><span className="cc-chip-label">Due</span> {account.dueDay}th</span>}
          {monthlyInt > 0.01 && <span className="cc-detail-chip negative"><span className="cc-chip-label">Interest/mo</span> {formatCurrency(monthlyInt)}</span>}
        </div>
      )}

      {/* Goal bar (non-CC) */}
      {pct !== null && !isCC && (
        <div className="account-goal-wrap">
          <div className="account-goal-row">
            <span className="account-goal-label">Goal: {formatCurrency(account.targetGoal)}</span>
            <span style={{ color: meta.color }}>{pct.toFixed(0)}%</span>
          </div>
          <div className="progress-bar-wrap" style={{ marginBottom: 4 }}>
            <div className="progress-bar-fill" style={{ width: `${pct}%`, backgroundColor: pct >= 100 ? '#4ADE80' : meta.color }} />
          </div>
          <GoalProjection
            balance={account.balance}
            targetGoal={account.targetGoal}
            monthlyContribution={planContrib || account.monthlyContribution}
          />
        </div>
      )}

      {account.history && account.history.length > 1 && !isCC && (
        <div style={{ marginTop: 8, fontSize: 11, color: '#64748B' }}>
          <span>Balance history: </span>
          {account.history.slice(-4).map((h, i) => (
            <span key={i} style={{ marginRight: 8 }}>
              {h.date}: <span style={{ color: '#94A3B8' }}>${Number(h.balance).toLocaleString()}</span>
            </span>
          ))}
        </div>
      )}

      {(account.monthlyContribution > 0 || (isInvestment && planContrib > 0)) && !isCC && (
        <div className="account-contrib">
          +{formatCurrency(isInvestment ? (planContrib || account.monthlyContribution) : account.monthlyContribution)}/mo contribution
          {isInvestment && <span className="contrib-plan-note"> (Budget Plan)</span>}
        </div>
      )}

      {!editing ? (
        <div className="account-card-actions">
          <button className="btn-edit-account" onClick={() => setEditing(true)}>Edit</button>
          <button className="btn-icon danger" onClick={() => onDelete(account.id, account.name)}>🗑️</button>
        </div>
      ) : (
        <div className="account-edit-form">
          <div className="form-row">
            <div className="form-group">
              <label>{isCC ? 'Current Balance (Owed)' : 'Current Balance'} ($)</label>
              <input type="number" min="0" step="0.01" value={form.balance} onChange={(e) => f('balance', e.target.value)} />
            </div>
            {isCC ? (
              <div className="form-group">
                <label>Credit Limit ($)</label>
                <input type="number" min="0" step="1" value={form.creditLimit} onChange={(e) => f('creditLimit', e.target.value)} />
              </div>
            ) : isInvestment ? (
              <div className="form-group">
                <label>Monthly Contribution</label>
                <div className="contrib-readonly">
                  {formatCurrency(planContrib || form.monthlyContribution)}/mo
                  <span className="contrib-readonly-note">set in Budget Plan</span>
                </div>
              </div>
            ) : (
              <div className="form-group">
                <label>Monthly Contribution ($)</label>
                <input type="number" min="0" step="0.01" value={form.monthlyContribution} onChange={(e) => f('monthlyContribution', e.target.value)} />
              </div>
            )}
          </div>

          {isCC && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>APR / Interest Rate (%)</label>
                  <input type="number" min="0" step="0.01" value={form.apr} onChange={(e) => f('apr', e.target.value)} placeholder="e.g. 24.99" />
                </div>
                <div className="form-group">
                  <label>Payment Due Day (of month)</label>
                  <input type="number" min="1" max="31" step="1" value={form.dueDay} onChange={(e) => f('dueDay', e.target.value)} placeholder="e.g. 15" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Minimum Monthly Payment ($)</label>
                  <input type="number" min="0" step="0.01" value={form.minPayment} onChange={(e) => f('minPayment', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Planned Monthly Payment ($)</label>
                  <input type="number" min="0" step="0.01" value={form.plannedPayment} onChange={(e) => f('plannedPayment', e.target.value)} />
                </div>
              </div>
            </>
          )}

          {!isCC && (
            <div className="form-row">
              <div className="form-group">
                <label>Target Goal ($)</label>
                <input type="number" min="0" step="1" value={form.targetGoal} onChange={(e) => f('targetGoal', e.target.value)} placeholder="0 = no goal" />
              </div>
              {(account.type === 'roth_ira' || account.type === '401k') && (
                <div className="form-group">
                  <label>YTD Contributions ($)</label>
                  <input type="number" min="0" step="0.01" value={form.ytdContributions} onChange={(e) => f('ytdContributions', e.target.value)} />
                </div>
              )}
              {(account.type === 'brokerage' || account.type === 'reit') && (
                <div className="form-group">
                  <label>Total Contributed ($)</label>
                  <input type="number" min="0" step="0.01" value={form.totalContributed} onChange={(e) => f('totalContributed', e.target.value)} />
                </div>
              )}
              {account.type === '401k' && (
                <div className="form-group">
                  <label>Annual Target ($)</label>
                  <input type="number" min="0" step="1" value={form.annualTarget} onChange={(e) => f('annualTarget', e.target.value)} />
                </div>
              )}
            </div>
          )}

          <div className="form-actions">
            <button className="btn-primary" onClick={handleSave}>Save</button>
            <button className="btn-cancel-lg" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

const PRESET_COLORS = ['#60A5FA','#4ADE80','#F87171','#D4AF37','#A78BFA','#38BDF8','#FB923C','#F472B6','#34D399','#FBBF24'];

function AddAccountForm({ onAdd, onCancel, allAccounts }) {
  const [form, setForm] = useState({
    name: '', owner: 'Vadim', type: 'checking', institution: '', color: '',
    balance: '', creditLimit: '', apr: '', minPayment: '', plannedPayment: '', dueDay: '',
    monthlyContribution: '', targetGoal: '', ytdContributions: '', annualTarget: '',
    connections: [],
  });
  const f = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const meta = ACCOUNT_TYPE_META[form.type] || {};

  const addConnection = () =>
    f('connections', [...form.connections, { toAccountId: '', label: '', amount: '', flowType: 'transfer' }]);
  const updateConn = (i, k, v) =>
    f('connections', form.connections.map((c, idx) => idx === i ? { ...c, [k]: v } : c));
  const removeConn = (i) =>
    f('connections', form.connections.filter((_, idx) => idx !== i));

  const handleAdd = () => {
    if (!form.name) return;
    onAdd({
      ...form,
      balance:             Number(form.balance)             || 0,
      creditLimit:         Number(form.creditLimit)         || 0,
      apr:                 Number(form.apr)                 || 0,
      minPayment:          Number(form.minPayment)          || 0,
      plannedPayment:      Number(form.plannedPayment)      || 0,
      dueDay:              Number(form.dueDay)              || 1,
      monthlyContribution: Number(form.monthlyContribution) || 0,
      targetGoal:          Number(form.targetGoal)          || 0,
      ytdContributions:    Number(form.ytdContributions)    || 0,
      annualTarget:        Number(form.annualTarget)        || 0,
      connections: form.connections
        .filter((c) => c.toAccountId)
        .map((c) => ({ ...c, amount: Number(c.amount) || 0 })),
    });
  };

  return (
    <div className="panel add-account-panel" style={{ marginBottom: 20 }}>
      <div className="panel-header"><h2>Add New Account</h2></div>
      <div className="recurring-form">

        {/* ── Basic Info ── */}
        <div className="add-account-section-label">Basic Info</div>
        <div className="form-row">
          <div className="form-group">
            <label>Account Name *</label>
            <input placeholder="e.g. Ally Savings" value={form.name} onChange={(e) => f('name', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Institution</label>
            <input placeholder="e.g. Ally Bank" value={form.institution} onChange={(e) => f('institution', e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Type</label>
            <select value={form.type} onChange={(e) => f('type', e.target.value)}>
              {Object.entries(TYPE_GROUPS).map(([group, types]) => (
                <optgroup key={group} label={group}>
                  {types.map((t) => (
                    <option key={t} value={t}>{ACCOUNT_TYPE_META[t]?.icon} {ACCOUNT_TYPE_META[t]?.label || t}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Owner</label>
            <div className="source-buttons">
              {['Vadim', 'Jessica', 'Joint'].map((o) => (
                <button key={o} type="button" className={`source-btn ${form.owner === o ? 'active' : ''}`} onClick={() => f('owner', o)}>
                  {o === 'Vadim' ? '👨' : o === 'Jessica' ? '👩' : '🤝'} {o}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="form-group">
          <label>Color (optional — overrides type default)</label>
          <div className="color-picker-row">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`color-swatch ${form.color === c ? 'selected' : ''}`}
                style={{ background: c }}
                onClick={() => f('color', form.color === c ? '' : c)}
                title={c}
              />
            ))}
            <input
              type="color"
              className="color-custom-input"
              value={form.color || (meta.color || '#60A5FA')}
              onChange={(e) => f('color', e.target.value)}
              title="Custom color"
            />
          </div>
        </div>

        {/* ── Balance Info ── */}
        <div className="add-account-section-label">Balance Info</div>
        <div className="form-row">
          <div className="form-group">
            <label>{meta.isLiability ? 'Current Balance Owed ($)' : 'Current Balance ($)'}</label>
            <input type="number" min="0" step="0.01" placeholder="0.00" value={form.balance} onChange={(e) => f('balance', e.target.value)} />
          </div>
          {!meta.isLiability && (
            <div className="form-group">
              <label>Target Goal ($)</label>
              <input type="number" min="0" step="1" placeholder="Optional" value={form.targetGoal} onChange={(e) => f('targetGoal', e.target.value)} />
            </div>
          )}
        </div>
        {!meta.isLiability && (
          <div className="form-row">
            <div className="form-group">
              <label>Monthly Contribution ($)</label>
              <input type="number" min="0" step="0.01" placeholder="0.00" value={form.monthlyContribution} onChange={(e) => f('monthlyContribution', e.target.value)} />
            </div>
            {meta.isInvestment && (
              <div className="form-group">
                <label>Annual Target ($)</label>
                <input type="number" min="0" step="1" placeholder="e.g. 7000" value={form.annualTarget} onChange={(e) => f('annualTarget', e.target.value)} />
              </div>
            )}
          </div>
        )}
        {meta.isInvestment && (
          <div className="form-row">
            <div className="form-group">
              <label>YTD Contributions ($)</label>
              <input type="number" min="0" step="0.01" placeholder="0.00" value={form.ytdContributions} onChange={(e) => f('ytdContributions', e.target.value)} />
            </div>
          </div>
        )}

        {/* ── Credit / Loan Fields ── */}
        {meta.isCredit && (
          <>
            <div className="add-account-section-label">Credit Card Details</div>
            <div className="form-row">
              <div className="form-group">
                <label>Credit Limit ($)</label>
                <input type="number" min="0" step="1" placeholder="e.g. 5000" value={form.creditLimit} onChange={(e) => f('creditLimit', e.target.value)} />
              </div>
              <div className="form-group">
                <label>APR (%)</label>
                <input type="number" min="0" step="0.01" placeholder="e.g. 24.99" value={form.apr} onChange={(e) => f('apr', e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Minimum Payment ($)</label>
                <input type="number" min="0" step="0.01" placeholder="0.00" value={form.minPayment} onChange={(e) => f('minPayment', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Planned Payment ($)</label>
                <input type="number" min="0" step="0.01" placeholder="0.00" value={form.plannedPayment} onChange={(e) => f('plannedPayment', e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group" style={{ maxWidth: 160 }}>
                <label>Due Day of Month</label>
                <input type="number" min="1" max="31" step="1" placeholder="e.g. 15" value={form.dueDay} onChange={(e) => f('dueDay', e.target.value)} />
              </div>
            </div>
          </>
        )}

        {/* ── Connected Accounts ── */}
        <div className="add-account-section-label">
          Connected Accounts
          <button type="button" className="btn-add-small" style={{ marginLeft: 12 }} onClick={addConnection}>+ Add</button>
        </div>
        {form.connections.length === 0 && (
          <div className="empty-state" style={{ marginBottom: 12, fontSize: 12 }}>
            Optional: define money flows to/from other accounts (used in Cash Flow Map).
          </div>
        )}
        {form.connections.map((conn, i) => (
          <div key={i} className="connection-row">
            <select
              value={conn.toAccountId}
              onChange={(e) => updateConn(i, 'toAccountId', e.target.value)}
              className="conn-account-select"
            >
              <option value="">Select account…</option>
              {(allAccounts || []).map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({a.owner})</option>
              ))}
            </select>
            <select
              value={conn.flowType}
              onChange={(e) => updateConn(i, 'flowType', e.target.value)}
              className="conn-flow-select"
            >
              {FLOW_TYPES.map((ft) => (
                <option key={ft.value} value={ft.value}>{ft.label}</option>
              ))}
            </select>
            <input
              type="number" min="0" step="0.01" placeholder="Amount"
              value={conn.amount}
              onChange={(e) => updateConn(i, 'amount', e.target.value)}
              className="conn-amount-input"
            />
            <input
              placeholder="Label (optional)"
              value={conn.label}
              onChange={(e) => updateConn(i, 'label', e.target.value)}
              className="conn-label-input"
            />
            <button type="button" className="btn-icon danger" onClick={() => removeConn(i)}>×</button>
          </div>
        ))}

        <div className="form-actions">
          <button className="btn-primary" onClick={handleAdd} disabled={!form.name}>Add Account</button>
          <button className="btn-cancel-lg" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

const GROUP_ORDER = ['liquid', 'liability', 'retirement', 'investment'];
const GROUP_LABELS = { liquid: 'Checking & Savings', liability: 'Credit Cards & Liabilities', retirement: 'Retirement Accounts', investment: 'Investment Accounts' };

export default function AccountsPanel() {
  const [accounts, setAccounts] = useLocalStorage('budget_accounts', DEFAULT_ACCOUNTS);
  const [settings]              = useLocalStorage('budget_settings', {});
  const [netWorthHistory, setNetWorthHistory] = useLocalStorage('budget_networth_history', []);
  const [showAddForm, setShowAddForm] = useState(false);

  // Migrate: add any missing default accounts + one-time renames — runs ONCE per device
  useEffect(() => {
    // Rename 'Coinbase' → 'Crypto' if not yet done
    const cryptoRenamed = localStorage.getItem('budget_crypto_renamed');
    if (!cryptoRenamed) {
      setAccounts((prev) =>
        prev.map((a) =>
          a.id === 'crypto_coinbase_vadim' && a.name === 'Coinbase'
            ? { ...a, name: 'Crypto' }
            : a
        )
      );
      localStorage.setItem('budget_crypto_renamed', 'true');
    }

    const migrated = localStorage.getItem('budget_accounts_migrated_v2');
    if (migrated) return;
    setAccounts((prev) => {
      const existingIds = new Set(prev.map((a) => a.id));
      const missing = DEFAULT_ACCOUNTS.filter((a) => !existingIds.has(a.id));
      if (missing.length === 0) {
        localStorage.setItem('budget_accounts_migrated_v2', 'true');
        return prev;
      }
      localStorage.setItem('budget_accounts_migrated_v2', 'true');
      return [...prev, ...missing];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveAccount = (id, updates) => {
    const today = format(new Date(), 'MMM d, yyyy');
    setAccounts((prev) => {
      const updated = prev.map((a) => {
        if (a.id !== id) return a;
        const history = [...(a.history || []), { date: format(new Date(), 'MMM d'), balance: updates.balance }].slice(-24);
        return { ...a, ...updates, lastUpdated: today, history };
      });
      const assets = updated.filter((a) => !ACCOUNT_TYPE_META[a.type]?.isLiability).reduce((s, a) => s + (a.balance || 0), 0);
      const liabilities = updated.filter((a) => ACCOUNT_TYPE_META[a.type]?.isLiability).reduce((s, a) => s + (a.balance || 0), 0);
      setNetWorthHistory((h) => {
        const todayStr = format(new Date(), 'MMM d');
        const filtered = (h || []).filter((e) => e.date !== todayStr);
        return [...filtered, { date: todayStr, netWorth: assets - liabilities, assets, liabilities }].slice(-24);
      });
      return updated;
    });
  };

  const confirm = useConfirm();
  const deleteAccount = async (id, name) => {
    const ok = await confirm(name);
    if (ok) setAccounts((prev) => prev.filter((a) => a.id !== id));
  };

  const addAccount = (data) => {
    setAccounts((prev) => [...prev, {
      id: Date.now().toString(),
      name: data.name,
      owner: data.owner,
      type: data.type,
      institution: data.institution || '',
      color: data.color || '',
      balance: data.balance,
      creditLimit: data.creditLimit || 0,
      apr: data.apr || 0,
      minPayment: data.minPayment || 0,
      plannedPayment: data.plannedPayment || 0,
      dueDay: data.dueDay || 1,
      monthlyContribution: data.monthlyContribution || 0,
      targetGoal: data.targetGoal || 0,
      ytdContributions: data.ytdContributions || 0,
      totalContributed: 0,
      annualTarget: data.annualTarget || 0,
      connections: data.connections || [],
      lastUpdated: null,
      history: [],
    }]);
    setShowAddForm(false);
  };

  const assets      = accounts.filter((a) => !ACCOUNT_TYPE_META[a.type]?.isLiability).reduce((s, a) => s + (a.balance || 0), 0);
  const liabilities = accounts.filter((a) =>  ACCOUNT_TYPE_META[a.type]?.isLiability).reduce((s, a) => s + (a.balance || 0), 0);
  const netWorth    = assets - liabilities;
  const liquid      = accounts.filter((a) => ACCOUNT_TYPE_META[a.type]?.group === 'liquid').reduce((s, a) => s + (a.balance || 0), 0);
  const retirement  = accounts.filter((a) => ACCOUNT_TYPE_META[a.type]?.group === 'retirement').reduce((s, a) => s + (a.balance || 0), 0);
  const investment  = accounts.filter((a) => ACCOUNT_TYPE_META[a.type]?.group === 'investment').reduce((s, a) => s + (a.balance || 0), 0);

  const grouped = {};
  GROUP_ORDER.forEach((g) => { grouped[g] = []; });
  accounts.forEach((a) => {
    const g = ACCOUNT_TYPE_META[a.type]?.group || 'liquid';
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(a);
  });

  return (
    <div>
      {/* Net Worth Hero */}
      <div className="panel nw-hero-panel">
        <div className="nw-hero">
          <div>
            <div className="nw-label">Total Net Worth</div>
            <div className={`nw-value ${netWorth >= 0 ? 'positive' : 'negative'}`}>{formatCurrency(netWorth)}</div>
          </div>
          <div className="nw-breakdown">
            <div className="nw-stat"><div className="nw-stat-label">Liquid Assets</div><div className="nw-stat-val positive">{formatCurrency(liquid)}</div></div>
            <div className="nw-stat"><div className="nw-stat-label">Retirement</div><div className="nw-stat-val" style={{ color: '#D4AF37' }}>{formatCurrency(retirement)}</div></div>
            <div className="nw-stat"><div className="nw-stat-label">Investments</div><div className="nw-stat-val" style={{ color: '#38BDF8' }}>{formatCurrency(investment)}</div></div>
            <div className="nw-stat"><div className="nw-stat-label">Liabilities</div><div className="nw-stat-val negative">{formatCurrency(liabilities)}</div></div>
          </div>
        </div>
        <div style={{ marginTop: 20 }}>
          <div className="chart-title">Net Worth History</div>
          <NetWorthChart history={netWorthHistory} />
        </div>
      </div>

      {showAddForm && <AddAccountForm onAdd={addAccount} onCancel={() => setShowAddForm(false)} allAccounts={accounts} />}

      {GROUP_ORDER.map((group) => {
        if (!grouped[group] || grouped[group].length === 0) return null;
        const groupTotal = grouped[group].reduce((s, a) => s + (a.balance || 0), 0);
        const isLiabilityGroup = group === 'liability';
        return (
          <div key={group} className="panel">
            <div className="panel-header">
              <h2>{GROUP_LABELS[group]}</h2>
              <span className={`panel-subtitle ${isLiabilityGroup ? 'negative' : 'positive'}`}>
                {isLiabilityGroup ? '-' : ''}{formatCurrency(groupTotal)}
              </span>
            </div>
            <div className="accounts-grid">
              {grouped[group].map((account) => (
                <AccountCard key={account.id} account={account} settings={settings} onSave={saveAccount} onDelete={deleteAccount} />
              ))}
            </div>
          </div>
        );
      })}

      <div style={{ textAlign: 'center', marginTop: 8 }}>
        <button className="btn-add-account" onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? 'Cancel' : '+ Add Account'}
        </button>
        <button
          className="btn-rerun-setup"
          onClick={() => { window.localStorage.removeItem('budget_setup_complete'); window.location.reload(); }}
        >
          ↺ Re-run Setup Wizard
        </button>
      </div>
    </div>
  );
}
