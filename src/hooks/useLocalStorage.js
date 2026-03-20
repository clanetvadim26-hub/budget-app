import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { TABLE_CONFIG, getRealtimeTable } from '../lib/tableConfig';

/**
 * Drop-in replacement for the original useLocalStorage hook.
 *
 * For keys that have a Supabase table config:
 *   • Initialises instantly from localStorage cache (no flash)
 *   • Loads authoritative data from Supabase on mount
 *   • Syncs every write to Supabase (diff-based for arrays)
 *   • Subscribes to real-time changes so both devices stay in sync
 *   • Falls back gracefully to localStorage if Supabase is unreachable
 *
 * For unrecognised keys the original localStorage-only behaviour is preserved.
 */
export function useLocalStorage(key, initialValue) {
  const config = TABLE_CONFIG[key] || null;

  // ── 1. Initialise from localStorage cache for instant render ─────────────
  const [state, setStateRaw] = useState(() => {
    const cached = window.localStorage.getItem(key);
    if (cached) {
      try { return JSON.parse(cached); } catch {}
    }
    return typeof initialValue === 'function' ? initialValue() : initialValue;
  });

  // Keep a ref that's always current so async callbacks see latest state
  const stateRef = useRef(state);

  // ── 2. Wrapped setter: optimistic update → localStorage → Supabase ────────
  const setValue = useCallback((newValueOrUpdater) => {
    setStateRaw((prev) => {
      const next = typeof newValueOrUpdater === 'function'
        ? newValueOrUpdater(prev)
        : newValueOrUpdater;

      stateRef.current = next;
      window.localStorage.setItem(key, JSON.stringify(next));

      if (config) {
        config.sync(prev, next).catch((err) =>
          console.error(`[Supabase sync: ${key}]`, err),
        );
      }

      return next;
    });
  }, [key, config]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 3. Load from Supabase on mount ────────────────────────────────────────
  useEffect(() => {
    if (!config) return;

    config.load(key, initialValue)
      .then((loaded) => {
        stateRef.current = loaded;
        setStateRaw(loaded);
        window.localStorage.setItem(key, JSON.stringify(loaded));
      })
      .catch((err) => {
        console.warn(`[Supabase load failed: ${key}] Using localStorage cache.`, err);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 4. Real-time subscription ─────────────────────────────────────────────
  useEffect(() => {
    if (!config) return;

    const table   = getRealtimeTable(key);
    const channel = supabase
      .channel(`rt_${key}`)
      .on(
        'postgres_changes',
        {
          event:  '*',
          schema: 'public',
          table,
          // For app_state rows, narrow the subscription to this specific key
          ...(config.type === 'state'
            ? { filter: `key=eq.${config.stateKey}` }
            : {}),
        },
        () => {
          // Re-fetch the table so both devices stay in sync
          config.load(key, initialValue)
            .then((loaded) => {
              stateRef.current = loaded;
              setStateRaw(loaded);
              window.localStorage.setItem(key, JSON.stringify(loaded));
            })
            .catch(console.error);
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return [state, setValue];
}
