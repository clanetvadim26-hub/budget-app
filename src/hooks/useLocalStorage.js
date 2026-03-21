import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { TABLE_CONFIG, getRealtimeTable } from '../lib/tableConfig';

/**
 * Module-level singleton store.
 *
 * ROOT CAUSE OF PRIOR DATA LOSS:
 *   Every time a panel unmounted and remounted (tab switch), useLocalStorage
 *   created a new component-local useState AND re-fetched from Supabase.
 *   If the async Supabase write hadn't completed yet, the re-fetch returned
 *   stale data and overwrote the optimistic local state.
 *
 * FIX:
 *   All data lives in DATA_STORE (module scope — survives component unmounts).
 *   Supabase is loaded ONCE per key per app session, not once per mount.
 *   Every useLocalStorage call for the same key shares the same value
 *   via a Set of React setState listeners (broadcast on every write).
 */

// key → current value in memory (survives component unmount/remount)
const DATA_STORE = {};

// keys that have been fetched from Supabase (or are in-flight)
const DATA_LOADED = new Set();

// key → Set<React setState fn>  (all mounted components sharing that key)
const DATA_LISTENERS = {};

// key → supabase realtime channel  (one subscription per key, ever)
const RT_CHANNELS = {};

/** Notify every mounted component using `key` of a new value. */
function broadcast(key, value) {
  const listeners = DATA_LISTENERS[key];
  if (listeners && listeners.size > 0) {
    listeners.forEach((fn) => {
      try { fn(value); } catch (_) {}
    });
  }
}

/** Load from Supabase once per key; set up one realtime subscription. */
function initSupabase(key, config, defaultValue) {
  if (DATA_LOADED.has(key)) return;
  DATA_LOADED.add(key);

  // ── Load ────────────────────────────────────────────────────────────────
  config.load(key, defaultValue)
    .then((loaded) => {
      DATA_STORE[key] = loaded;
      window.localStorage.setItem(key, JSON.stringify(loaded));
      broadcast(key, loaded);
    })
    .catch((err) => {
      DATA_LOADED.delete(key); // allow retry on next mount
      console.warn(`[Supabase load: ${key}] Using local cache.`, err);
    });

  // ── Realtime subscription (one per key) ────────────────────────────────
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
 */
export function useLocalStorage(key, initialValue) {
  const config = TABLE_CONFIG[key] || null;

  // ── 1. Initialize from store or localStorage (instant, no Supabase wait) ─
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

  // ── 2. Subscribe to store broadcasts (cross-component reactivity) ────────
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

  // ── 3. Load from Supabase ONCE per key (not once per mount) ──────────────
  useEffect(() => {
    if (config) initSupabase(key, config, initialValue);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 4. Setter: store → localStorage → broadcast → Supabase (async) ───────
  const setValue = useCallback((newValueOrUpdater) => {
    const prev = DATA_STORE[key];
    const next = typeof newValueOrUpdater === 'function'
      ? newValueOrUpdater(prev)
      : newValueOrUpdater;

    // Synchronously update store + all listeners — no data loss on tab switch
    DATA_STORE[key] = next;
    window.localStorage.setItem(key, JSON.stringify(next));
    broadcast(key, next);

    // Async Supabase sync (non-blocking — already safe in local store)
    if (config) {
      config.sync(prev, next).catch((err) =>
        console.error(`[Supabase sync: ${key}]`, err),
      );
    }
  }, [key, config]); // eslint-disable-line react-hooks/exhaustive-deps

  return [state, setValue];
}
