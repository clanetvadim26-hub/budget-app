import React, { useState } from 'react';

// Primary tabs always visible in the bottom bar
const PRIMARY = [
  { id: 'overview',  icon: '📊', label: 'Overview'  },
  { id: 'calendar',  icon: '📅', label: 'Calendar'  },
  { id: '__add__',   icon: '➕', label: 'Add',  isAdd: true },
  { id: 'accounts',  icon: '💳', label: 'Accounts'  },
  { id: '__more__',  icon: '⋯',  label: 'More'      },
];

// All items shown in the "More" sheet (excluding ones already in PRIMARY)
const MORE_ITEMS = [
  { id: 'budget-plan', icon: '📝', label: 'Budget Plan' },
  { id: 'expenses',    icon: '📉', label: 'Expenses'    },
  { id: 'cashflow',    icon: '📈', label: 'Cash Flow'   },
  { id: 'savings',     icon: '🏦', label: 'Savings'     },
  { id: 'moneyflow',   icon: '🔀', label: 'Money Flow'  },
  { id: 'investments', icon: '💼', label: 'Investments' },
  { id: 'debt',        icon: '🔴', label: 'Debt'        },
  { id: 'recurring',   icon: '🔄', label: 'Recurring'   },
  { id: 'add-income',  icon: '💵', label: 'Add Income'  },
  { id: 'advice',      icon: '💡', label: 'Advice'      },
];

export default function MobileNav({ activeView, setActiveView, pendingCount }) {
  const [showMore, setShowMore] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const navigate = (id) => {
    setActiveView(id);
    setShowMore(false);
    setShowAddMenu(false);
  };

  const handleTab = (item) => {
    if (item.id === '__more__') {
      setShowMore((s) => !s);
      setShowAddMenu(false);
    } else if (item.id === '__add__') {
      setShowAddMenu((s) => !s);
      setShowMore(false);
    } else {
      navigate(item.id);
    }
  };

  const isActive = (id) => {
    if (id === '__more__') return showMore;
    if (id === '__add__')  return showAddMenu;
    return activeView === id;
  };

  return (
    <>
      {/* Backdrop for sheet dismissal */}
      {(showMore || showAddMenu) && (
        <div
          className="mobile-sheet-backdrop"
          onClick={() => { setShowMore(false); setShowAddMenu(false); }}
        />
      )}

      {/* More sheet */}
      {showMore && (
        <div className="mobile-more-sheet">
          <div className="mobile-sheet-handle" />
          <div className="mobile-more-grid">
            {MORE_ITEMS.map((item) => (
              <button
                key={item.id}
                className={`mobile-more-item ${activeView === item.id ? 'active' : ''}`}
                onClick={() => navigate(item.id)}
              >
                <span className="more-item-icon">{item.icon}</span>
                <span className="more-item-label">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add menu */}
      {showAddMenu && (
        <div className="mobile-add-menu">
          <button className="add-menu-item" onClick={() => navigate('add-expense')}>
            <span>💸</span> Add Expense
          </button>
          <button className="add-menu-item" onClick={() => navigate('add-income')}>
            <span>💵</span> Add Income
          </button>
        </div>
      )}

      {/* Bottom tab bar */}
      <nav className="mobile-nav">
        {PRIMARY.map((item) => (
          <button
            key={item.id}
            className={`mobile-nav-tab ${isActive(item.id) ? 'active' : ''} ${item.isAdd ? 'add-tab' : ''}`}
            onClick={() => handleTab(item)}
          >
            <span className="mobile-tab-icon">
              {item.icon}
              {item.id === 'overview' && pendingCount > 0 && (
                <span className="mobile-nav-badge">{pendingCount}</span>
              )}
            </span>
            <span className="mobile-tab-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
