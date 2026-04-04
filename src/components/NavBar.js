import React from 'react';
import SyncStatusBar from './SyncStatusBar';

const NAV_ITEMS = [
  { id: 'overview',     label: 'Overview',     icon: '📊' },
  { id: 'budget-plan',  label: 'Budget Plan',  icon: '📝' },
  { id: 'calendar',     label: 'Cal & Budget', icon: '📅' },
  { id: 'expenses',     label: 'Expenses',     icon: '📉' },
  { id: 'cashflow',     label: 'Cash Flow',    icon: '📈' },
  { id: 'accounts',     label: 'Accounts',     icon: '💳' },
  { id: 'moneyflow',    label: 'Money Flow',   icon: '🔀' },
  { id: 'investments',  label: 'Investments',  icon: '💼' },
  { id: 'debt',         label: 'Debt',         icon: '🔴' },
  { id: 'calculators',  label: 'Calculators',  icon: '🧮' },
  { id: 'add-expense',  label: 'Add Expense',  icon: '➕' },
  { id: 'add-income',   label: 'Income',       icon: '💵' },
];

const CONN_META = {
  connected:  { color: '#4ADE80', label: 'Synced',      pulse: false },
  connecting: { color: '#FACC15', label: 'Connecting…', pulse: true  },
  offline:    { color: '#F87171', label: 'Offline',      pulse: false },
};

export default function NavBar({ activeView, setActiveView, viewMode, setViewMode, pendingCount, connectionStatus = 'connecting' }) {
  const conn = CONN_META[connectionStatus] || CONN_META.connecting;
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="brand-icon">💰</span>
        <div>
          <div className="brand-name">BudgetFlow</div>
          <div className="brand-sub">Vadim & Jessica</div>
        </div>
        <div className="conn-indicator" title={conn.label}>
          <span
            className={`conn-dot${conn.pulse ? ' conn-pulse' : ''}`}
            style={{ backgroundColor: conn.color }}
          />
          <span className="conn-label">{conn.label}</span>
        </div>
        <SyncStatusBar />
      </div>

      <div className="nav-links">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activeView === item.id ? 'active' : ''}`}
            onClick={() => setActiveView(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
            {item.id === 'overview' && pendingCount > 0 && (
              <span className="nav-badge">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      <div className="view-toggle">
        <button className={`toggle-btn ${viewMode === 'monthly' ? 'active' : ''}`} onClick={() => setViewMode('monthly')}>
          Monthly
        </button>
        <button className={`toggle-btn ${viewMode === 'weekly' ? 'active' : ''}`} onClick={() => setViewMode('weekly')}>
          Weekly
        </button>
      </div>
    </nav>
  );
}
