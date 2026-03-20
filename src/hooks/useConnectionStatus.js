import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

/**
 * Returns 'connecting' | 'connected' | 'offline'
 * Tracks the Supabase Realtime channel connection state.
 */
export function useConnectionStatus() {
  const [status, setStatus] = useState('connecting');

  useEffect(() => {
    const channel = supabase
      .channel('__connection_monitor__')
      .subscribe((s) => {
        if (s === 'SUBSCRIBED')     setStatus('connected');
        else if (s === 'CLOSED' || s === 'CHANNEL_ERROR' || s === 'TIMED_OUT')
                                    setStatus('offline');
        else                        setStatus('connecting');
      });

    return () => { supabase.removeChannel(channel); };
  }, []);

  return status;
}
