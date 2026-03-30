import React from 'react';

export default function PersonSelector({ onSelect }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#050816',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', zIndex: 10000, padding: 24,
    }}>
      <div style={{ marginBottom: 12, fontSize: 32 }}>💰</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: '#F1F5F9', marginBottom: 6 }}>BudgetFlow</div>
      <div style={{ fontSize: 14, color: '#64748B', marginBottom: 40 }}>Who's using the app today?</div>

      <div style={{ display: 'flex', gap: 16, width: '100%', maxWidth: 400 }}>
        <button onClick={() => onSelect('vadim')} style={cardStyle('#D4AF37')}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>👨</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#F1F5F9' }}>Vadim</div>
          <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>Opens Vadim's Budget Plan</div>
        </button>
        <button onClick={() => onSelect('jessica')} style={cardStyle('#F472B6')}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>👩</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#F1F5F9' }}>Jessica</div>
          <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>Opens Jessica's Budget Plan</div>
        </button>
      </div>

      <button
        onClick={() => onSelect('both')}
        style={{
          marginTop: 16, background: 'transparent', border: '1px solid #1E2A45',
          color: '#64748B', borderRadius: 12, padding: '10px 24px', fontSize: 13,
          cursor: 'pointer',
        }}
      >
        View as Household
      </button>
    </div>
  );
}

function cardStyle(accent) {
  return {
    flex: 1, background: '#0F1629', border: `1px solid ${accent}33`,
    borderRadius: 16, padding: '24px 16px', cursor: 'pointer',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    transition: 'border-color 0.2s, background 0.2s',
  };
}
