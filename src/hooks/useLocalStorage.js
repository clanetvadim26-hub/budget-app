import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { TABLE_CONFIG, getRealtimeTable } from '../lib/tableConfig';

/**
 * Module-level singleton store.
 *
 * All data lives in DATA_STORE (module scope — survives component unmounts).
 * Supabase is loaded ONCE per key per app session.
 * Every useLocalStorage call for the same key shares the same value
 * via a Set of React setState listeners (broadcast on every write).
 */

// key → current value in memory
const DATA_STORE = {};
// keys that have been fetched from Supabase (or are in-flight)
const DATA_LOADED = new Set();
// key → Set<React setState fn>
const DATA_LISTENERS = {};
// key → supabase realtime channel
const RT_CHANNELS = {};

// ── Global sync status ──────────────────────────────────────────────────────
// Tracks the last successful save time and any current error across ALL keys.
export const SYNC_STATUS = {
  lastSaved: null,   // Date | null
  saving:    false,  // any write in-flight
  error:     null,   // error message string | null
  errorKey:  null,   // which storageKey failed
};
const SYNC_LISTENERS = new Set();

function broadcastSyncStatus() {
  const snap = { ...SYNC_STATUS };
  SYNC_LISTENERS.forEach((fn) => { try { fn(snap); } catch (_) {} });
}

/** Subscribe to global sync status (last saved, errors). */
export function useSyncStatus() {
  const [status, setStatus] = useState(() => ({ ...SYNC_STATUS }));
  useEffect(() => {
    SYNC_LISTENERS.add(setStatus);
    setStatus({ ...SYNC_STATUS });
    return () => SYNC_LISTENERS.delete(setStatus);
  }, []);
  return status;
}

/** Notify every mounted component using `key` of a new value. */
function broadcast(key, value) {
  const listeners = DATA_LISTENERS[key];
  if (listeners && listeners.size > 0) {
    listeners.forEach((fn) => { try { fn(value); } catch (_) {} });
  }
}

/** Load from Supabase once per key; set up one realtime subscription. */
function initSupabase(key, config, defaultValue) {
  if (DATA_LOADED.has(key)) return;
  DATA_LOADED.add(key);

  // ── Load ──────────────────────────────────────────────────────────────
  config.load(key, defaultValue)
    .then((loaded) => {
      DATA_STORE[key] = loaded;
      window.localStorage.setItem(key, JSON.stringify(loaded));
      broadcast(key, loaded);
      console.log(`[Supabase load: ${key}] ✓ loaded`, Array.isArray(loaded) ? `${loaded.length} rows` : typeof loaded);
    })
    .catch((err) => {
      DATA_LOADED.delete(key); // allow retry on next mount
      console.warn(`[Supabase load: ${key}] ✗ FAILED — using local cache. Error:`, err?.message || err);
    });

  // ── Realtime subscription (one per key) ──────────────────────────────
  if (RT_CHANNELS[key]) return;
  const table = getRealtimeTable(key);
  if (!table) return;

  RT_CHANNELS[key] = supabase
    .channel(`rt_${key}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table,
        ...(config.type === 'state' ? { filter: `key=eq.${config.stateKey}` } : {}),
      },
      () => {
        // Another device wrote — re-fetch and broadcast
        config.load(key, defaultValue)
          .then((loaded) => {
            DATA_STORE[key] = loaded;
            window.localStorage.setItem(key, JSON.stringify(loaded));
            broadcast(key, loaded);
          })
          .catch(console.error);
      },
    )
    .subscribe();
}

/**
 * Drop-in replacement for useState that:
 *   • Reads from the module-level store (no flash, no lost data on remount)
 *   • Syncs writes to all other mounted components sharing the same key
 *   • Loads from Supabase once per app session per key
 *   • Keeps localStorage as an offline cache
 *   • Reports sync status via useSyncStatus()
 */
export function useLocalStorage(key, initialValue) {
  const config = TABLE_CONFIG[key] || null;

  // ── 1. Initialize from store or localStorage (instant) ──────────────
  const [state, setStateRaw] = useState(() => {
    if (DATA_STORE[key] !== undefined) return DATA_STORE[key];

    const cached = window.localStorage.getItem(key);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        DATA_STORE[key] = parsed;
        return parsed;
      } catch (_) {}
    }
    const def = typeof initialValue === 'function' ? initialValue() : initialValue;
    DATA_STORE[key] = def;
    return def;
  });

  // ── 2. Subscribe to store broadcasts (cross-component reactivity) ────
  useEffect(() => {
    if (!DATA_LISTENERS[key]) DATA_LISTENERS[key] = new Set();
    DATA_LISTENERS[key].add(setStateRaw);

    // Sync current store value in case it was updated while unmounted
    if (DATA_STORE[key] !== undefined) {
      setStateRaw(DATA_STORE[key]);
    }

    return () => {
      if (DATA_LISTENERS[key]) DATA_LISTENERS[key].delete(setStateRaw);
    };
  }, [key]);

  // ── 3. Load from Supabase ONCE per key (not once per mount) ─────────
  useEffect(() => {
    if (config) initSupabase(key, config, initialValue);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 4. Setter: store → localStorage → broadcast → Supabase (async) ──
  const setValue = useCallback((newValueOrUpdater) => {
    const prev = DATA_STORE[key];
    const next = typeof newValueOrUpdater === 'function'
      ? newValueOrUpdater(prev)
      : newValueOrUpdater;

    // Synchronously update store + all listeners — no data loss on tab switch
    DATA_STORE[key] = next;
    window.localStorage.setItem(key, JSON.stringify(next));
    broadcast(key, next);

    // Async Supabase sync — update global sync status on success/failure
    if (config) {
      SYNC_STATUS.saving = true;
      broadcastSyncStatus();

      const t0 = Date.now();
      config.sync(prev, next)
        .then(() => {
          SYNC_STATUS.saving   = false;
          SYNC_STATUS.lastSaved = new Date();
          SYNC_STATUS.error    = null;
          SYNC_STATUS.errorKey = null;
          broadcastSyncStatus();
          console.log(`[Supabase sync: ${key}] ✓ saved in ${Date.now() - t0}ms`);
        })
        .catch((err) => {
          SYNC_STATUS.saving   = false;
          SYNC_STATUS.error    = err?.message || 'Save failed';
          SYNC_STATUS.errorKey = key;
          broadcastSyncStatus();
          console.error(`[Supabase sync: ${key}] ✗ FAILED`, err);
        });
    }
  }, [key, config]); // eslint-disable-line react-hooks/exhaustive-deps

  return [state, setValue];
}
