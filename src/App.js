import React, { useState, useMemo } from 'react';
import { useConfirm } from './components/ConfirmModal';
import './App.css';
import './styles/new-features.css';
import { format, addDays } from 'date-fns';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useConnectionStatus } from './hooks/useConnectionStatus';
import {
  filterByMonth, filterByWeek, getTotalIncome, getTotalExpenses,
  getSavingsRate, getExpensesByCategory,
} from './utils/calculations';
import { getPendingPaychecks, getUpcomingThisMonth } from './utils/recurringDates';
import { DEFAULT_ACCOUNTS } from './data/accounts';
import { DEFAULT_RECURRING_EXPENSES, DEFAULT_RECURRING_INCOMES } from './data/defaultRecurring';

import NavBar from './components/NavBar';
import OverviewPanel from './components/panels/OverviewPanel';
import ExpenseBreakdownPanel from './components/panels/ExpenseBreakdownPanel';
import CashFlowPanel from './components/panels/CashFlowPanel';
import CalculatorsPanel from './components/panels/CalculatorsPanel';
import AddExpenseForm from './components/forms/AddExpenseForm';
import AddIncomeForm from './components/forms/AddIncomeForm';
import FinancialAdvicePanel from './components/panels/FinancialAdvicePanel';
import AccountsPanel from './components/panels/AccountsPanel';
import InvestmentsPanel from './components/panels/InvestmentsPanel';
import DebtPanel from './components/panels/DebtPanel';
import CalendarPanel from './components/panels/CalendarPanel';
import MoneyFlowPanel from './components/panels/MoneyFlowPanel';
import FullBudgetPlanPanel from './components/panels/FullBudgetPlanPanel';
import OverviewBudgetSummary from './components/panels/OverviewBudgetSummary';
import PaycheckPanel from './components/panels/PaycheckPanel';
import SetupWizard from './components/SetupWizard';
import PendingConfirmationCard from './components/PendingConfirmationCard';
import UpcomingExpensesCard from './components/UpcomingExpensesCard';
import HealthScoreGauge, { calculateHealthScore } from './components/HealthScoreGauge';
import InstallPrompt from './components/InstallPrompt';
import MobileNav from './components/MobileNav';
import PaycheckAllocationModal from './components/PaycheckAllocationModal';
import JessicaPaycheckModal from './components/JessicaPaycheckModal';
import VariableBillModal from './components/VariableBillModal';
import FinancialAlerts from './components/FinancialAlerts';
import ContributionConfirmationModal from './components/ContributionConfirmationModal';

export default function App() {
  const [activeView, setActiveView] = useState('overview');
  const [viewMode, setViewMode] = useState('monthly');
  const connectionStatus = useConnectionStatus();

  // Core budget data
  const [expenses, setExpenses] = useLocalStorage('budget_expenses', []);
  const [incomes, setIncomes] = useLocalStorage('budget_incomes', []);

  // Recurring — seeded with defaults on empty DB
  const [recurringIncomes] = useLocalStorage('budget_recurring_incomes', DEFAULT_RECURRING_INCOMES);
  const [recurringExpenses] = useLocalStorage('budget_recurring_expenses', DEFAULT_RECURRING_EXPENSES);
  const [confirmedPaychecks, setConfirmedPaychecks] = useLocalStorage('budget_confirmed_paychecks', {});
  const [paidExpenseKeys, setPaidExpenseKeys] = useLocalStorage('budget_paid_recurring_expenses', {});

  // Variable bill entries — shared between Vadim & Jessica via Supabase
  const [variableBillEntries, setVariableBillEntries] = useLocalStorage('budget_variable_bill_entries', {});
  // Deferred paychecks — "not paid yet, ask me tomorrow"
  const [deferredPaychecks] = useLocalStorage('budget_deferred_paychecks', {});
  // Jessica's paycheck amounts — keyed by `incomeId_YYYY-MM-DD`
  const [, setJessicaPaycheckEntries] = useLocalStorage('budget_jessica_paycheck_entries', {});

  // Accounts & savings for health score
  const [accounts] = useLocalStorage('budget_accounts', DEFAULT_ACCOUNTS);
  const [savings] = useLocalStorage('budget_savings', {
    emergency: { current: 0, target: 0 },
    roth_ira:    { current: 0, target: 7000 },
    investments: { current: 0, target: 0 },
    general:     { current: 0, target: 0 },
  });

  // Contribution confirmation persistence
  const [confirmedContributions, setConfirmedContributions] = useLocalStorage('budget_confirmed_contributions', {});
  const [deferredContributions, setDeferredContributions] = useLocalStorage('budget_deferred_contributions', {});
  const [settings] = useLocalStorage('budget_settings', {});

  // Session-dismissed modals (not persisted — resets on page reload)
  const [sessionDismissed, setSessionDismissed] = useState(new Set());
  const dismissModal = (key) => setSessionDismissed((prev) => new Set([...prev, key]));

  const [activeContribIndex, setActiveContribIndex] = useState(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const now = useMemo(() => new Date(), []);

  const filteredExpenses = useMemo(
    () => (viewMode === 'monthly' ? filterByMonth(expenses, now) : filterByWeek(expenses, now)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [expenses, viewMode]
  );

  const filteredIncomes = useMemo(
    () => (viewMode === 'monthly' ? filterByMonth(incomes, now) : filterByWeek(incomes, now)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [incomes, viewMode]
  );

  const totalIncome    = getTotalIncome(filteredIncomes);
  const totalExpenses  = getTotalExpenses(filteredExpenses);
  const net            = totalIncome - totalExpenses;
  const savingsRate    = getSavingsRate(totalIncome, totalExpenses);
  const expensesByCategory = getExpensesByCategory(filteredExpenses);

  const monthlyExpenses = getTotalExpenses(filterByMonth(expenses, now));
  const monthlyIncome   = getTotalIncome(filterByMonth(incomes, now));

  // All pending paychecks
  const allPendingPaychecks = useMemo(
    () => getPendingPaychecks(recurringIncomes, confirmedPaychecks),
    [recurringIncomes, confirmedPaychecks]
  );

  const upcomingExpenses = useMemo(
    () => getUpcomingThisMonth(recurringExpenses, paidExpenseKeys),
    [recurringExpenses, paidExpenseKeys]
  );

  // Pending contribution/payment confirmations
  const pendingContributions = useMemo(() => {
    const today = format(now, 'yyyy-MM-dd');
    const pending = [];

    // Get Vadim's savings list from budget_settings
    let savingsList = null;
    if (settings && settings['vadim_savings_list']) {
      try { savingsList = JSON.parse(settings['vadim_savings_list']); } catch {}
    }
    if (!savingsList) savingsList = [
      { key: 'vadim_savings_cap1_monthly', accountId: 'cap1_joint_savings', label: 'Capital One Joint Savings' },
      { key: 'vadim_savings_roth_monthly', accountId: 'roth_ira_vadim', label: 'Vadim Roth IRA' },
      { key: 'vadim_savings_brokerage_monthly', accountId: 'brokerage_joint', label: 'Ameriprise Joint Brokerage' },
    ];

    // Check each savings entry
    if (settings) {
      savingsList.forEach(sv => {
        const amount = Number(settings[sv.key] || 0);
        if (!amount || !sv.accountId) return;

        // Use next payday as the trigger date
        const paydayStr = settings['vadim_next_payday'];
        if (!paydayStr) return;

        // Check if payday has passed
        if (paydayStr > today) return;

        const itemId = `contrib_${sv.accountId}_${paydayStr}`;
        if (confirmedContributions[itemId]) return;

        // Check deferral
        const deferred = deferredContributions[itemId];
        if (deferred && deferred.deferUntil > today) return;

        const account = accounts.find(a => a.id === sv.accountId);
        const accountType = account?.type || 'savings';
        pending.push({
          id: itemId,
          accountId: sv.accountId,
          accountName: sv.label || account?.name || sv.accountId,
          accountType,
          amount,
          dueDate: paydayStr,
          label: sv.label || account?.name || sv.accountId,
          isDebt: false,
        });
      });
    }

    return pending;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, confirmedContributions, deferredContributions, accounts, now]);

  // Health score
  const { score: healthScore, breakdown: healthBreakdown } = useMemo(
    () => calculateHealthScore({ savingsRate, monthlyExpenses, savings, accounts }),
    [savingsRate, monthlyExpenses, savings, accounts]
  );

  // ── Modal priority resolution ────────────────────────────────────────
  const pendingVadimPaycheck = useMemo(
    () => allPendingPaychecks.find((p) => p.income.metadata?.paycheckOwner === 'vadim'),
    [allPendingPaychecks]
  );

  const pendingJessicaPaycheck = useMemo(
    () => allPendingPaychecks.find((p) => p.income.metadata?.paycheckOwner === 'jessica'),
    [allPendingPaychecks]
  );

  // Variable bills for current month not yet entered
  const currentMonthKey = format(now, 'yyyy-MM');
  const pendingVariableBills = useMemo(
    () => recurringExpenses.filter((e) => {
      if (!e.metadata?.isVariable || !e.active) return false;
      const key = `${e.id}_${currentMonthKey}`;
      return !variableBillEntries?.[key];
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recurringExpenses, variableBillEntries, currentMonthKey]
  );

  // Helper: check if a paycheck key is deferred until tomorrow or later
  const isDeferredToday = (key) => {
    const d = deferredPaychecks?.[key];
    if (!d) return false;
    const today = format(now, 'yyyy-MM-dd');
    return d.deferUntil > today;
  };

  // Which modal is active (priority order, respecting session dismissals and deferrals)
  const activeModal = useMemo(() => {
    if (pendingVadimPaycheck && !sessionDismissed.has(pendingVadimPaycheck.key) && !isDeferredToday(pendingVadimPaycheck.key)) {
      return { type: 'vadim', data: pendingVadimPaycheck };
    }
    if (pendingJessicaPaycheck && !sessionDismissed.has(pendingJessicaPaycheck.key) && !isDeferredToday(pendingJessicaPaycheck.key)) {
      return { type: 'jessica', data: pendingJessicaPaycheck };
    }
    if (pendingVariableBills.length > 0) {
      const bill = pendingVariableBills[0];
      if (!sessionDismissed.has(`vbill_${bill.id}_${currentMonthKey}`)) {
        return { type: 'variable_bill', data: bill };
      }
    }
    return null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingVadimPaycheck, pendingJessicaPaycheck, pendingVariableBills, sessionDismissed, currentMonthKey]);

  // Paychecks to show in the standard PendingConfirmationCard (non-modal ones)
  const standardPendingPaychecks = useMemo(
    () => allPendingPaychecks.filter((p) => !p.income.metadata?.isPaycheck),
    [allPendingPaychecks]
  );

  // ── Actions ──────────────────────────────────────────────────────────
  const addExpense = (expense) => setExpenses((prev) => [...prev, expense]);
  const addIncome  = (income)  => setIncomes((prev)  => [...prev, income]);

  const confirmPaycheck = (item) => {
    setConfirmedPaychecks((prev) => ({
      ...prev,
      [item.key]: { confirmedDate: format(now, 'yyyy-MM-dd'), actualAmount: item.income.amount },
    }));
    addIncome({
      id: Date.now().toString(),
      date: item.dateStr,
      source: item.income.person,
      description: item.income.name,
      amount: item.income.amount,
    });
  };

  const confirmPaycheckEdited = (item, actualAmount) => {
    setConfirmedPaychecks((prev) => ({
      ...prev,
      [item.key]: { confirmedDate: format(now, 'yyyy-MM-dd'), actualAmount },
    }));
    addIncome({
      id: Date.now().toString(),
      date: item.dateStr,
      source: item.income.person,
      description: item.income.name,
      amount: actualAmount,
    });
  };

  const markExpensePaid = (key) => {
    setPaidExpenseKeys((prev) => ({ ...prev, [key]: true }));
  };

  // Vadim paycheck: confirm + post income
  const handleVadimConfirm = (item) => {
    confirmPaycheck(item);
    dismissModal(item.key);
  };

  // Jessica paycheck: confirm + post income with entered amount
  const handleJessicaConfirm = (item, amount) => {
    const entryKey = item.key;
    setJessicaPaycheckEntries((prev) => ({
      ...prev,
      [entryKey]: { amount, enteredAt: new Date().toISOString() },
    }));
    confirmPaycheckEdited(item, amount);
    dismissModal(item.key);
  };

  // Variable bill: save amount and mark entered
  const handleVariableBillSave = (billId, amount) => {
    const key = `${billId}_${currentMonthKey}`;
    setVariableBillEntries((prev) => ({
      ...prev,
      [key]: { amount, enteredAt: new Date().toISOString(), month: currentMonthKey },
    }));
    dismissModal(`vbill_${billId}_${currentMonthKey}`);
  };

  // Number of confirmed Vadim paychecks (for motivational message rotation)
  const confirmedVadimCount = Object.keys(confirmedPaychecks).filter((k) =>
    k.startsWith('inc_vadim_paycheck_')
  ).length;

  const renderView = () => {
    switch (activeView) {
      case 'overview':
        return (
          <>
            <FinancialAlerts accounts={accounts} savings={savings} recurringExpenses={recurringExpenses} />
            <HealthScoreGauge score={healthScore} breakdown={healthBreakdown} />
            <PendingConfirmationCard
              pendingPaychecks={standardPendingPaychecks}
              onConfirm={confirmPaycheck}
              onEditConfirm={confirmPaycheckEdited}
            />
            <UpcomingExpensesCard
              upcomingExpenses={upcomingExpenses}
              onMarkPaid={markExpensePaid}
            />
            <OverviewPanel
              income={totalIncome}
              expenses={totalExpenses}
              net={net}
              savingsRate={savingsRate}
              viewMode={viewMode}
              incomes={filteredIncomes}
            />
            <OverviewBudgetSummary onNavigateToBudgetPlan={() => setActiveView('budget-plan')} />
          </>
        );
      case 'expenses':
        return (
          <ExpenseBreakdownPanel
            expensesByCategory={expensesByCategory}
            totalExpenses={totalExpenses}
            expenses={filteredExpenses}
            viewMode={viewMode}
          />
        );
      case 'cashflow':
        return <CashFlowPanel />;
      case 'calculators':
        return <CalculatorsPanel />;
      case 'accounts':
        return <AccountsPanel />;
      case 'investments':
        return <InvestmentsPanel />;
      case 'debt':
        return <DebtPanel />;
      case 'calendar':
        return <CalendarPanel />;
      case 'budget-plan':
        return <FullBudgetPlanPanel />;
      case 'paycheck':
        return <PaycheckPanel />;
      case 'moneyflow':
        return <MoneyFlowPanel />;
      case 'add-expense':
        return (
          <div className="form-panel">
            <AddExpenseForm onAdd={addExpense} />
            <div className="recent-list-panel">
              <div className="chart-title">Recent Expenses</div>
              {expenses
                .slice()
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 15)
                .map((exp) => (
                  <RecentItem
                    key={exp.id}
                    item={exp}
                    type="expense"
                    onDelete={() => setExpenses((prev) => prev.filter((e) => e.id !== exp.id))}
                  />
                ))}
              {expenses.length === 0 && <div className="empty-state">No expenses yet.</div>}
            </div>
          </div>
        );
      case 'add-income':
        return (
          <div className="form-panel">
            <AddIncomeForm onAdd={addIncome} />
            <div className="recent-list-panel">
              <div className="chart-title">Recent Income</div>
              {incomes
                .slice()
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 15)
                .map((inc) => (
                  <RecentItem
                    key={inc.id}
                    item={inc}
                    type="income"
                    onDelete={() => setIncomes((prev) => prev.filter((i) => i.id !== inc.id))}
                  />
                ))}
              {incomes.length === 0 && <div className="empty-state">No income entries yet.</div>}
            </div>
          </div>
        );
      case 'advice':
        return (
          <FinancialAdvicePanel
            income={totalIncome}
            expenses={totalExpenses}
            savingsRate={savingsRate}
            monthlyIncome={monthlyIncome}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="app">
      <SetupWizard />
      <NavBar
        activeView={activeView}
        setActiveView={setActiveView}
        viewMode={viewMode}
        setViewMode={setViewMode}
        pendingCount={allPendingPaychecks.length}
        connectionStatus={connectionStatus}
      />

      <main className="main-content">{renderView()}</main>

      <MobileNav
        activeView={activeView}
        setActiveView={setActiveView}
        pendingCount={allPendingPaychecks.length}
      />

      <InstallPrompt />

      {/* ── Global Modals (highest priority first) ── */}
      {activeModal?.type === 'vadim' && (
        <PaycheckAllocationModal
          paycheckItem={activeModal.data}
          recurringExpenses={recurringExpenses}
          confirmedCount={confirmedVadimCount}
          onConfirm={handleVadimConfirm}
          onClose={() => dismissModal(activeModal.data.key)}
        />
      )}

      {activeModal?.type === 'jessica' && (
        <JessicaPaycheckModal
          paycheckItem={activeModal.data}
          onConfirm={handleJessicaConfirm}
          onClose={() => dismissModal(activeModal.data.key)}
        />
      )}

      {activeModal?.type === 'variable_bill' && (
        <VariableBillModal
          bill={activeModal.data}
          variableBillEntries={variableBillEntries}
          onSave={handleVariableBillSave}
          onClose={() => dismissModal(`vbill_${activeModal.data.id}_${currentMonthKey}`)}
        />
      )}

      {/* Contribution / debt-payment confirmations (shown after paycheck modals) */}
      {!activeModal && pendingContributions.length > 0 && activeContribIndex < pendingContributions.length &&
        !sessionDismissed.has(`contrib_dismiss_${pendingContributions[activeContribIndex]?.id}`) && (
        <ContributionConfirmationModal
          item={pendingContributions[activeContribIndex]}
          onConfirm={(id) => {
            const today = format(now, 'yyyy-MM-dd');
            setConfirmedContributions(prev => ({ ...prev, [id]: { confirmedDate: today } }));
            setActiveContribIndex(i => i + 1);
          }}
          onDefer={(id) => {
            const tomorrow = format(addDays(now, 1), 'yyyy-MM-dd');
            setDeferredContributions(prev => ({ ...prev, [id]: { deferUntil: tomorrow } }));
            setActiveContribIndex(i => i + 1);
          }}
          onDismiss={(id) => {
            dismissModal(`contrib_dismiss_${id}`);
            setActiveContribIndex(i => i + 1);
          }}
        />
      )}
    </div>
  );
}

function RecentItem({ item, type, onDelete }) {
  const isIncome = type === 'income';
  const sourceIcon = item.source === 'Vadim' ? '👨' : item.source === 'Jessica' ? '👩' : '🌐';
  const confirm = useConfirm();
  const handleDelete = async () => {
    const label = isIncome ? `${item.source} – ${item.description || item.source}` : `${item.category}${item.description ? ` – ${item.description}` : ''}`;
    const ok = await confirm(label);
    if (ok) onDelete();
  };
  return (
    <div className="recent-item">
      <span className="recent-icon">{isIncome ? sourceIcon : '💸'}</span>
      <div className="recent-info">
        <div className="recent-primary">{isIncome ? item.source : item.category}</div>
        {item.description && <div className="recent-secondary">{item.description}</div>}
        <div className="recent-date">{item.date}</div>
      </div>
      <span className={isIncome ? 'recent-amount positive' : 'recent-amount negative'}>
        {isIncome ? '+' : '-'}${Number(item.amount).toLocaleString()}
      </span>
      <button className="delete-btn" onClick={handleDelete} title="Delete">×</button>
    </div>
  );
}
