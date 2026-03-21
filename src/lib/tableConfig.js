import { supabase } from '../supabaseClient';

// ─── Row transformers ──────────────────────────────────────────────────────
// Each entry defines how to convert between app (camelCase) and DB (snake_case)

const num = (v, fallback = 0) => v != null ? Number(v) : fallback;
const numOrNull = (v) => v != null ? Number(v) : null;

// Expenses
const expenseFromRow = (r) => ({
  id:          r.id,
  date:        r.date,
  category:    r.category,
  description: r.description || '',
  amount:      num(r.amount),
});
const expenseToRow = (item) => ({
  id:          item.id,
  date:        item.date,
  category:    item.category,
  description: item.description || null,
  amount:      item.amount,
});

// Income
const incomeFromRow = (r) => ({
  id:          r.id,
  date:        r.date,
  source:      r.source,
  description: r.description || '',
  amount:      num(r.amount),
});
const incomeToRow = (item) => ({
  id:          item.id,
  date:        item.date,
  source:      item.source,
  description: item.description || null,
  amount:      item.amount,
});

// Recurring income
const recIncomeFromRow = (r) => ({
  id:        r.id,
  name:      r.name,
  person:    r.person || '',
  amount:    num(r.amount),
  frequency: r.frequency,
  startDate: r.start_date,
  active:    r.active !== false,
});
const recIncomeToRow = (item) => ({
  id:         item.id,
  name:       item.name,
  person:     item.person || '',
  amount:     item.amount,
  frequency:  item.frequency,
  start_date: item.startDate,
  active:     item.active !== false,
});

// Recurring expenses
const recExpenseFromRow = (r) => ({
  id:        r.id,
  name:      r.name,
  amount:    num(r.amount),
  category:  r.category,
  frequency: r.frequency,
  startDate: r.start_date,
  dueDay:    r.due_day,
  active:    r.active !== false,
});
const recExpenseToRow = (item) => ({
  id:         item.id,
  name:       item.name,
  amount:     item.amount,
  category:   item.category,
  frequency:  item.frequency,
  start_date: item.startDate || null,
  due_day:    item.dueDay    || null,
  active:     item.active !== false,
});

// Accounts
const accountFromRow = (r) => ({
  id:                 r.id,
  name:               r.name,
  owner:              r.owner,
  type:               r.type,
  institution:        r.institution        || '',
  color:              r.color              || '',
  balance:            num(r.balance),
  targetGoal:         num(r.target_goal),
  monthlyContribution:num(r.monthly_contribution),
  ytdContributions:   num(r.ytd_contributions),
  totalContributed:   num(r.total_contributed),
  annualTarget:       num(r.annual_target),
  lastUpdated:        r.last_updated || null,
  history:            r.balance_history || [],
  apr:                numOrNull(r.apr),
  creditLimit:        numOrNull(r.credit_limit),
  minPayment:         numOrNull(r.minimum_payment),
  plannedPayment:     numOrNull(r.planned_payment),
  dueDay:             r.due_day || null,
  connections:        r.connections || [],
});
const accountToRow = (item) => ({
  id:                  item.id,
  name:                item.name,
  owner:               item.owner,
  type:                item.type,
  institution:         item.institution         || null,
  color:               item.color               || null,
  balance:             item.balance            || 0,
  target_goal:         item.targetGoal         || 0,
  monthly_contribution:item.monthlyContribution|| 0,
  ytd_contributions:   item.ytdContributions   || 0,
  total_contributed:   item.totalContributed   || 0,
  annual_target:       item.annualTarget       || 0,
  last_updated:        item.lastUpdated        || null,
  balance_history:     item.history            || [],
  apr:                 item.apr    != null ? item.apr    : null,
  credit_limit:        item.creditLimit != null ? item.creditLimit : null,
  minimum_payment:     item.minPayment   != null ? item.minPayment   : null,
  planned_payment:     item.plannedPayment != null ? item.plannedPayment : null,
  due_day:             item.dueDay || null,
  connections:         item.connections || [],
});

// Loans
const loanFromRow = (r) => ({
  id:             r.id,
  name:           r.name,
  type:           r.loan_type,
  owner:          r.owner,
  originalAmount: num(r.original_amount),
  balance:        num(r.remaining_balance),
  apr:            num(r.apr),
  monthlyPayment: num(r.monthly_payment),
  dueDay:         r.due_day    || null,
  startDate:      r.start_date || null,
  termMonths:     r.term_months || null,
  notes:          r.notes || '',
  scenarios:      r.scenarios || [],
});
const loanToRow = (item) => ({
  id:                item.id,
  name:              item.name,
  loan_type:         item.type,
  owner:             item.owner,
  original_amount:   item.originalAmount   || 0,
  remaining_balance: item.balance          || 0,
  apr:               item.apr              || 0,
  monthly_payment:   item.monthlyPayment   || 0,
  due_day:           item.dueDay           || null,
  start_date:        item.startDate        || null,
  term_months:       item.termMonths       || null,
  notes:             item.notes            || null,
  scenarios:         item.scenarios        || [],
});

// Savings goals (object ↔ rows)
const DEFAULT_SAVINGS_KEYS = ['emergency', 'roth_ira', 'investments', 'general'];
const savingsFromRows = (rows) => {
  const obj = {
    emergency:   { current: 0, target: 0 },
    roth_ira:    { current: 0, target: 7000 },
    investments: { current: 0, target: 0 },
    general:     { current: 0, target: 0 },
  };
  (rows || []).forEach((r) => {
    if (obj[r.name] !== undefined) {
      obj[r.name] = { current: num(r.current), target: num(r.target) };
    }
  });
  return obj;
};
const savingsToRows = (obj) =>
  Object.entries(obj)
    .filter(([name]) => DEFAULT_SAVINGS_KEYS.includes(name))
    .map(([name, vals]) => ({ name, target: vals.target || 0, current: vals.current || 0 }));

// ─── Generic array loader/syncer ───────────────────────────────────────────
async function loadArray(config, storageKey, defaultValue) {
  const { data, error } = await supabase.from(config.table).select('*');
  if (error) throw error;

  const items = (data || []).map(config.fromRow);

  // Empty table: try to migrate from localStorage, then fall back to defaults
  if (items.length === 0) {
    const cached = localStorage.getItem(storageKey);
    let localItems = null;
    if (cached) { try { localItems = JSON.parse(cached); } catch {} }

    const toSeed = (localItems && localItems.length > 0)
      ? localItems
      : (config.seedOnEmpty && Array.isArray(defaultValue) && defaultValue.length > 0)
          ? defaultValue
          : null;

    if (toSeed && toSeed.length > 0) {
      const rows = toSeed.map(config.toRow);
      const { error: e } = await supabase.from(config.table).upsert(rows, { onConflict: 'id' });
      if (e) throw e;
      return toSeed;
    }
  }

  return items;
}

async function syncArray(config, prevData, newData) {
  const prev = Array.isArray(prevData) ? prevData : [];
  const next = Array.isArray(newData)  ? newData  : [];
  const prevMap = new Map(prev.map((i) => [String(i.id), i]));
  const nextMap = new Map(next.map((i) => [String(i.id), i]));

  // Deletes
  const toDelete = [...prevMap.keys()].filter((id) => !nextMap.has(id));
  if (toDelete.length) {
    const { error } = await supabase.from(config.table).delete().in('id', toDelete);
    if (error) throw error;
  }

  // Inserts (upsert to be safe against duplicates)
  const toInsert = [...nextMap.values()].filter((i) => !prevMap.has(String(i.id)));
  if (toInsert.length) {
    const { error } = await supabase.from(config.table)
      .upsert(toInsert.map(config.toRow), { onConflict: 'id' });
    if (error) throw error;
  }

  // Updates
  for (const [id, item] of nextMap) {
    if (prevMap.has(id) && JSON.stringify(prevMap.get(id)) !== JSON.stringify(item)) {
      const { error } = await supabase.from(config.table).update(config.toRow(item)).eq('id', id);
      if (error) throw error;
    }
  }
}

// ─── Config registry ────────────────────────────────────────────────────────
//
// type: 'array'   → array of objects with ids, diff-synced
// type: 'savings' → nested object, upserted as rows by name
// type: 'state'   → JSON blob stored in app_state table by key
//
export const TABLE_CONFIG = {
  // ── Transactions ──────────────────────────────────────────────────────
  budget_expenses: {
    type: 'array', table: 'expenses',
    fromRow: expenseFromRow, toRow: expenseToRow,
    load: (key, def) => loadArray(TABLE_CONFIG.budget_expenses, key, def),
    sync: (prev, next) => syncArray(TABLE_CONFIG.budget_expenses, prev, next),
  },
  budget_incomes: {
    type: 'array', table: 'income',
    fromRow: incomeFromRow, toRow: incomeToRow,
    load: (key, def) => loadArray(TABLE_CONFIG.budget_incomes, key, def),
    sync: (prev, next) => syncArray(TABLE_CONFIG.budget_incomes, prev, next),
  },

  // ── Recurring ─────────────────────────────────────────────────────────
  budget_recurring_incomes: {
    type: 'array', table: 'recurring_income',
    fromRow: recIncomeFromRow, toRow: recIncomeToRow,
    load: (key, def) => loadArray(TABLE_CONFIG.budget_recurring_incomes, key, def),
    sync: (prev, next) => syncArray(TABLE_CONFIG.budget_recurring_incomes, prev, next),
  },
  budget_recurring_expenses: {
    type: 'array', table: 'recurring_expenses',
    fromRow: recExpenseFromRow, toRow: recExpenseToRow,
    load: (key, def) => loadArray(TABLE_CONFIG.budget_recurring_expenses, key, def),
    sync: (prev, next) => syncArray(TABLE_CONFIG.budget_recurring_expenses, prev, next),
  },

  // ── Accounts & Loans ──────────────────────────────────────────────────
  budget_accounts: {
    type: 'array', table: 'accounts', seedOnEmpty: true,
    fromRow: accountFromRow, toRow: accountToRow,
    load: (key, def) => loadArray(TABLE_CONFIG.budget_accounts, key, def),
    sync: (prev, next) => syncArray(TABLE_CONFIG.budget_accounts, prev, next),
  },
  budget_loans: {
    type: 'array', table: 'loans',
    fromRow: loanFromRow, toRow: loanToRow,
    load: (key, def) => loadArray(TABLE_CONFIG.budget_loans, key, def),
    sync: (prev, next) => syncArray(TABLE_CONFIG.budget_loans, prev, next),
  },

  // ── Savings goals (object) ────────────────────────────────────────────
  budget_savings: {
    type: 'savings', table: 'savings_goals',
    load: async (key, def) => {
      const { data, error } = await supabase.from('savings_goals').select('*');
      if (error) throw error;
      if (data && data.length > 0) return savingsFromRows(data);
      // Migrate from localStorage if non-zero
      const cached = localStorage.getItem(key);
      if (cached) {
        try {
          const local = JSON.parse(cached);
          const hasData = Object.values(local).some((v) => v.current > 0 || v.target > 0);
          if (hasData) {
            const rows = savingsToRows(local);
            await supabase.from('savings_goals').upsert(rows, { onConflict: 'name' });
            return local;
          }
        } catch {}
      }
      return typeof def === 'function' ? def() : def;
    },
    sync: async (_, next) => {
      const rows = savingsToRows(next);
      const { error } = await supabase.from('savings_goals').upsert(rows, { onConflict: 'name' });
      if (error) throw error;
    },
    realtimeTable: 'savings_goals',
  },

  // ── Session state (confirmed paychecks, paid keys) ────────────────────
  budget_confirmed_paychecks: {
    type: 'state', stateKey: 'confirmed_paychecks',
    load: (key, def) => loadStateItem('confirmed_paychecks', key, def),
    sync: (_, next) => syncStateItem('confirmed_paychecks', next),
    realtimeTable: 'app_state',
  },
  budget_paid_recurring_expenses: {
    type: 'state', stateKey: 'paid_recurring_expenses',
    load: (key, def) => loadStateItem('paid_recurring_expenses', key, def),
    sync: (_, next) => syncStateItem('paid_recurring_expenses', next),
    realtimeTable: 'app_state',
  },
  budget_paid_cc_payments: {
    type: 'state', stateKey: 'paid_cc_payments',
    load: (key, def) => loadStateItem('paid_cc_payments', key, def),
    sync: (_, next) => syncStateItem('paid_cc_payments', next),
    realtimeTable: 'app_state',
  },
};

async function loadStateItem(stateKey, storageKey, defaultValue) {
  const { data, error } = await supabase
    .from('app_state')
    .select('value')
    .eq('key', stateKey)
    .maybeSingle();
  if (error) throw error;
  if (data) return data.value;

  // Migrate from localStorage
  const cached = localStorage.getItem(storageKey);
  if (cached) {
    try {
      const local = JSON.parse(cached);
      if (Object.keys(local).length > 0) {
        await supabase.from('app_state').upsert(
          { key: stateKey, value: local },
          { onConflict: 'key' },
        );
        return local;
      }
    } catch {}
  }
  return typeof defaultValue === 'function' ? defaultValue() : defaultValue;
}

async function syncStateItem(stateKey, newData) {
  const { error } = await supabase.from('app_state').upsert(
    { key: stateKey, value: newData, updated_at: new Date().toISOString() },
    { onConflict: 'key' },
  );
  if (error) throw error;
}

// ─── Realtime table lookup ─────────────────────────────────────────────────
// Returns the DB table name to subscribe to for a given localStorage key
export function getRealtimeTable(key) {
  const cfg = TABLE_CONFIG[key];
  if (!cfg) return null;
  if (cfg.realtimeTable) return cfg.realtimeTable;
  if (cfg.table)         return cfg.table;
  return null;
}
