import React, { useState, useRef, useEffect } from 'react';

// Reusable inline-edit component.
// Shows a formatted value with a hover pencil icon.
// On click → becomes an input; on Enter/blur → saves and flashes "Saved ✓".
export default function InlineEdit({
  value,
  onSave,
  formatFn,
  type = 'number',
  min = 0,
  step = '0.01',
  className = '',
  suffix = '',
  prefix = '',
  style = {},
}) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState('');
  const [saved,   setSaved]   = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.select();
  }, [editing]);

  const startEdit = () => {
    setDraft(String(value ?? ''));
    setEditing(true);
    setSaved(false);
  };

  const commit = () => {
    setEditing(false);
    const parsed = type === 'number' ? Number(draft) : draft.trim();
    // Always call onSave — let the store decide if anything changed.
    // Guards here cause silent no-ops that confuse users.
    onSave(parsed);
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter')  commit();
    if (e.key === 'Escape') setEditing(false);
  };

  const display = formatFn ? formatFn(value) : value;

  if (editing) {
    return (
      <span className={`ie-wrap ie-editing ${className}`} style={style}>
        {prefix && <span className="ie-prefix">{prefix}</span>}
        <input
          ref={inputRef}
          className="ie-input"
          type={type}
          min={min}
          step={step}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKey}
          inputMode={type === 'number' ? 'decimal' : 'text'}
        />
        {suffix && <span className="ie-suffix">{suffix}</span>}
      </span>
    );
  }

  return (
    <span
      className={`ie-wrap ie-display ${className} ${saved ? 'ie-saved-state' : ''}`}
      style={style}
      onClick={startEdit}
      title="Click to edit"
    >
      {prefix && <span className="ie-prefix">{prefix}</span>}
      <span className="ie-value">{display}</span>
      {suffix && <span className="ie-suffix">{suffix}</span>}
      {saved
        ? <span className="ie-saved">✓</span>
        : <span className="ie-hint">✏</span>
      }
    </span>
  );
}
