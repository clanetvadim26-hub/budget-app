import React, { useEffect, useState } from 'react';
import { useSyncStatus, retrySyncAll } from '../hooks/useLocalStorage';

function timeAgo(date) {
  if (!date) return null;
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 5)  return 'just now';
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export default function SyncStatusBar() {
  const { saving, lastSaved, error } = useSyncStatus();

  // Re-render every 15 s so "X ago" stays fresh
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 15000);
    return () => clearInterval(id);
  }, []);

  if (error) {
    return (
      <div className="sync-bar sync-error">
        <span className="sync-dot sync-dot-err" />
        <span>Unsaved changes — {error}</span>
        <button className="sync-retry-btn" onClick={() => retrySyncAll()}>Retry Sync</button>
      </div>
    );
  }

  if (saving) {
    return (
      <div className="sync-bar sync-saving">
        <span className="sync-dot sync-dot-pulse" />
        Saving…
      </div>
    );
  }

  if (lastSaved) {
    return (
      <div className="sync-bar sync-ok">
        <span className="sync-dot sync-dot-ok" />
        Saved {timeAgo(lastSaved)}
      </div>
    );
  }

  return null;
}
