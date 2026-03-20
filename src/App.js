import React, { useState, useMemo } from 'react';
import './App.css';
import './styles/new-features.css';
import { format } from 'date-fns';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useConnectionStatus } from './hooks/useConnectionStatus';
import {
  filterByMonth, filterByWeek, getTotalIncome, getTotalExpenses,
  getSavingsRate, getExpensesByCategory, getLast6MonthsData,
} from './utils/calculations';
import { getPendingPaychecks, getUpcomingThisMonth } from './utils/recurringDates';
import { DEFAULT_ACCOUNTS } from './data/accounts';

import NavBar from './components/NavBar';
import OverviewPanel from './components/panels/OverviewPanel';
import ExpenseBreakdownPanel from './components/panels/ExpenseBreakdownPanel';
import CashFlowPanel from './components/panels/CashFlowPanel';
import SavingsTracker from './components/panels/SavingsTracker';
import AddExpenseForm from './components/forms/AddExpenseForm';
import AddIncomeForm from './components/forms/AddIncomeForm';
import FinancialAdvicePanel from './components/panels/FinancialAdvicePanel';
import RecurringPanel from './components/panels/RecurringPanel';
import AccountsPanel from './components/panels/AccountsPanel';
import InvestmentsPanel from './components/panels/InvestmentsPanel';
import DebtPanel from './components/panels/DebtPanel';
import CalendarPanel from './components/panels/CalendarPanel';
import PendingConfirmationCard from './components/PendingConfirmationCard';
import UpcomingExpensesCard from './components/UpcomingExpensesCard';
import HealthScoreGauge, { calculateHealthScore } from './components/HealthScoreGauge';

export default function App() {
  const [activeView, setActiveView] = useState('overview');
  const [viewMode, setViewMode] = useState('monthly');
  const connectionStatus = useConnectionStatus();

  // Core budget data
  const [expenses, setExpenses] = useLocalStorage('budget_expenses', []);
  const [incomes, setIncomes] = useLocalStorage('budget_incomes', []);

  // Recurring
  const [recurringIncomes] = useLocalStorage('budget_recurring_incomes', []);
  const [recurringExpenses] = useLocalStorage('budget_recurring_expenses', []);
  const [confirmedPaychecks, setConfirmedPaychecks] = useLocalStorage('budget_confirmed_paychecks', {});
  const [paidExpenseKeys, setPaidExpenseKeys] = useLocalStorage('budget_paid_recurring_expenses', {});

  // Accounts & savings for health score
  const [accounts] = useLocalStorage('budget_accounts', DEFAULT_ACCOUNTS);
  const [savings] = useLocalStorage('budget_savings', {
    emergency: { current: 0, target: 0 },
    roth_ira: { current: 0, target: 7000 },
    investments: { current: 0, target: 0 },
    general: { current: 0, target: 0 },
  });

  const now = new Date();

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

  const totalIncome = getTotalIncome(filteredIncomes);
  const totalExpenses = getTotalExpenses(filteredExpenses);
  const net = totalIncome - totalExpenses;
  const savingsRate = getSavingsRate(totalIncome, totalExpenses);
  const expensesByCategory = getExpensesByCategory(filteredExpenses);
  const cashFlowData = getLast6MonthsData(incomes, expenses);

  const monthlyExpenses = getTotalExpenses(filterByMonth(expenses, now));
  const monthlyIncome = getTotalIncome(filterByMonth(incomes, now));

  // Recurring logic
  const pendingPaychecks = useMemo(
    () => getPendingPaychecks(recurringIncomes, confirmedPaychecks),
    [recurringIncomes, confirmedPaychecks]
  );

  const upcomingExpenses = useMemo(
    () => getUpcomingThisMonth(recurringExpenses, paidExpenseKeys),
    [recurringExpenses, paidExpenseKeys]
  );

  // Health score
  const { score: healthScore, breakdown: healthBreakdown } = useMemo(
    () => calculateHealthScore({ savingsRate, monthlyExpenses, savings, accounts }),
    [savingsRate, monthlyExpenses, savings, accounts]
  );

  const addExpense = (expense) => setExpenses((prev) => [...prev, expense]);
  const addIncome = (income) => setIncomes((prev) => [...prev, income]);

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

  const renderView = () => {
    switch (activeView) {
      case 'overview':
        return (
          <>
            <HealthScoreGauge score={healthScore} breakdown={healthBreakdown} />
            <PendingConfirmationCard
              pendingPaychecks={pendingPaychecks}
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
        return <CashFlowPanel chartData={cashFlowData} />;
      case 'savings':
        return <SavingsTracker monthlyExpenses={monthlyExpenses} />;
      case 'accounts':
        return <AccountsPanel />;
      case 'investments':
        return <InvestmentsPanel />;
      case 'debt':
        return <DebtPanel />;
      case 'calendar':
        return <CalendarPanel />;
      case 'recurring':
        return <RecurringPanel />;
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
      <NavBar
        activeView={activeView}
        setActiveView={setActiveView}
        viewMode={viewMode}
        setViewMode={setViewMode}
        pendingCount={pendingPaychecks.length}
        connectionStatus={connectionStatus}
      />
      <main className="main-content">{renderView()}</main>
    </div>
  );
}

function RecentItem({ item, type, onDelete }) {
  const isIncome = type === 'income';
  const sourceIcon = item.source === 'Vadim' ? '👨' : item.source === 'Jessica' ? '👩' : '🌐';
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
      <button className="delete-btn" onClick={onDelete} title="Delete">×</button>
    </div>
  );
}
