import React, { createContext, useContext, useRef, useState, useCallback } from 'react';

// ── Context ───────────────────────────────────────────────────────────────────
const ConfirmContext = createContext(null);

// ── Provider (wrap App once) ──────────────────────────────────────────────────
export function ConfirmModalProvider({ children }) {
  const [state, setState] = useState({ open: false, itemName: '', message: '' });
  const resolverRef = useRef(null);

  const confirm = useCallback((itemName, message = 'This action cannot be undone.') => {
    setState({ open: true, itemName, message });
    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const handleConfirm = () => {
    setState((s) => ({ ...s, open: false }));
    resolverRef.current?.(true);
  };

  const handleCancel = () => {
    setState((s) => ({ ...s, open: false }));
    resolverRef.current?.(false);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state.open && (
        <div className="confirm-overlay" onClick={handleCancel}>
          <div className="confirm-card" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-title">Are you sure?</div>
            {state.itemName && (
              <div className="confirm-item-name">{state.itemName}</div>
            )}
            <div className="confirm-message">{state.message}</div>
            <div className="confirm-actions">
              <button className="confirm-btn cancel" onClick={handleCancel}>Cancel</button>
              <button className="confirm-btn delete" onClick={handleConfirm}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error('useConfirm must be used within ConfirmModalProvider');
  return confirm;
}
