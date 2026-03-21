import React, { useState, useRef, useCallback, useMemo } from 'react';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { DEFAULT_ACCOUNTS, ACCOUNT_TYPE_META, OWNER_COLORS } from '../../data/accounts';
import { formatCurrency } from '../../utils/calculations';

// ── Flow type colors ────────────────────────────────────────────────────────
const FLOW_COLOR = {
  income:     '#D4AF37',
  bill:       '#F87171',
  cc_payment: '#FB923C',
  loan:       '#60A5FA',
  investment: '#4ADE80',
  transfer:   '#A78BFA',
};
const FLOW_LABEL = {
  income:     'Income',
  bill:       'Bill',
  cc_payment: 'CC Payment',
  loan:       'Loan',
  investment: 'Investment',
  transfer:   'Transfer',
};

// ── Default node layout (a rough grid) ─────────────────────────────────────
function defaultPositions(accounts) {
  const groups = { liquid: [], liability: [], retirement: [], investment: [] };
  accounts.forEach((a) => {
    const g = ACCOUNT_TYPE_META[a.type]?.group || 'liquid';
    if (!groups[g]) groups[g] = [];
    groups[g].push(a);
  });

  const cols = { liquid: 60, liability: 340, retirement: 620, investment: 900 };
  const pos = {};
  Object.entries(groups).forEach(([g, accs]) => {
    const x = cols[g] ?? 60;
    accs.forEach((a, i) => { pos[a.id] = { x, y: 80 + i * 130 }; });
  });
  return pos;
}

// ── Arrow SVG path (cubic bezier) ──────────────────────────────────────────
function Arrow({ x1, y1, x2, y2, color, label, amount, animated }) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;

  // Cubic bezier control points
  const cp1x = x1 + dx * 0.5;
  const cp1y = y1;
  const cp2x = x2 - dx * 0.5;
  const cp2y = y2;
  const path = `M${x1},${y1} C${cp1x},${cp1y} ${cp2x},${cp2y} ${x2},${y2}`;

  const arrowId = `arrow-${color.replace('#', '')}-${Math.abs(dx + dy).toFixed(0)}`;

  return (
    <g>
      <defs>
        <marker
          id={arrowId}
          markerWidth="8" markerHeight="8"
          refX="6" refY="3"
          orient="auto"
        >
          <path d="M0,0 L0,6 L8,3 z" fill={color} />
        </marker>
      </defs>
      {animated && (
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeOpacity="0.15"
          strokeDasharray="6 4"
        />
      )}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={animated ? 2.5 : 1.5}
        strokeOpacity={animated ? 0.9 : 0.5}
        strokeDasharray={animated ? '6 4' : undefined}
        markerEnd={`url(#${arrowId})`}
        className={animated ? 'flow-arrow-animated' : undefined}
      />
      {label && (
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          fontSize="10"
          fill={color}
          style={{ pointerEvents: 'none', fontWeight: 600 }}
        >
          {label}{amount ? ` · ${formatCurrency(amount)}` : ''}
        </text>
      )}
    </g>
  );
}

// ── Account Node ────────────────────────────────────────────────────────────
const NODE_W = 160;
const NODE_H = 68;

function AccountNode({ account, pos, onDrag, selected, onClick }) {
  const meta = ACCOUNT_TYPE_META[account.type] || { icon: '💰', color: '#94A3B8', label: account.type };
  const nodeColor = account.color || meta.color;
  const ownerColor = OWNER_COLORS[account.owner] || '#94A3B8';
  const dragRef = useRef(null);

  const handleMouseDown = (e) => {
    e.stopPropagation();
    const startX = e.clientX - pos.x;
    const startY = e.clientY - pos.y;
    const onMove = (me) => onDrag(account.id, me.clientX - startX, me.clientY - startY);
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    const startX = touch.clientX - pos.x;
    const startY = touch.clientY - pos.y;
    const onMove = (te) => {
      const t = te.touches[0];
      onDrag(account.id, t.clientX - startX, t.clientY - startY);
    };
    const onEnd = () => {
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
  };

  return (
    <g
      ref={dragRef}
      transform={`translate(${pos.x},${pos.y})`}
      style={{ cursor: 'grab', userSelect: 'none' }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onClick={onClick}
    >
      <rect
        x={0} y={0}
        width={NODE_W} height={NODE_H}
        rx={12}
        fill="#0F1629"
        stroke={selected ? nodeColor : '#1E2A45'}
        strokeWidth={selected ? 2.5 : 1.5}
        style={{ filter: selected ? `drop-shadow(0 0 8px ${nodeColor}88)` : undefined }}
      />
      {/* Left color bar */}
      <rect x={0} y={0} width={5} height={NODE_H} rx={3} fill={nodeColor} />

      {/* Icon */}
      <text x={20} y={28} fontSize={18} dominantBaseline="middle">{meta.icon}</text>

      {/* Name */}
      <text x={44} y={22} fontSize={11} fontWeight={700} fill="#E2E8F0" dominantBaseline="middle">
        {account.name.length > 16 ? account.name.slice(0, 15) + '…' : account.name}
      </text>

      {/* Balance */}
      <text x={44} y={40} fontSize={12} fontWeight={700} fill={meta.isLiability ? '#F87171' : '#4ADE80'} dominantBaseline="middle">
        {meta.isLiability ? '-' : ''}{formatCurrency(account.balance || 0)}
      </text>

      {/* Owner */}
      <text x={44} y={57} fontSize={10} fill={ownerColor} dominantBaseline="middle">
        {account.owner}
      </text>
    </g>
  );
}

// ── Summary Sidebar ─────────────────────────────────────────────────────────
function FlowSummary({ accounts, edges }) {
  const totalAssets = accounts.filter((a) => !ACCOUNT_TYPE_META[a.type]?.isLiability).reduce((s, a) => s + (a.balance || 0), 0);
  const totalLiability = accounts.filter((a) => ACCOUNT_TYPE_META[a.type]?.isLiability).reduce((s, a) => s + (a.balance || 0), 0);
  const totalFlow = edges.reduce((s, e) => s + (e.amount || 0), 0);

  const byType = {};
  edges.forEach((e) => {
    byType[e.flowType] = (byType[e.flowType] || 0) + (e.amount || 0);
  });

  return (
    <div className="flow-sidebar">
      <div className="flow-sidebar-title">Flow Summary</div>
      <div className="flow-sidebar-stat">
        <span className="fss-label">Total Assets</span>
        <span className="fss-value positive">{formatCurrency(totalAssets)}</span>
      </div>
      <div className="flow-sidebar-stat">
        <span className="fss-label">Total Liabilities</span>
        <span className="fss-value negative">{formatCurrency(totalLiability)}</span>
      </div>
      <div className="flow-sidebar-stat">
        <span className="fss-label">Net Worth</span>
        <span className={`fss-value ${totalAssets - totalLiability >= 0 ? 'positive' : 'negative'}`}>
          {formatCurrency(totalAssets - totalLiability)}
        </span>
      </div>
      <div className="flow-sidebar-divider" />
      <div className="flow-sidebar-title">Monthly Flows</div>
      <div className="flow-sidebar-stat">
        <span className="fss-label">Total Mapped</span>
        <span className="fss-value" style={{ color: '#D4AF37' }}>{formatCurrency(totalFlow)}</span>
      </div>
      {Object.entries(byType).map(([ft, amt]) => (
        <div key={ft} className="flow-sidebar-stat">
          <span className="fss-label" style={{ color: FLOW_COLOR[ft] || '#94A3B8' }}>
            {FLOW_LABEL[ft] || ft}
          </span>
          <span className="fss-value" style={{ color: FLOW_COLOR[ft] || '#94A3B8' }}>
            {formatCurrency(amt)}
          </span>
        </div>
      ))}
      {edges.length === 0 && (
        <div className="fss-hint">
          No flows configured yet. Edit accounts and add connections to see money flows here.
        </div>
      )}
    </div>
  );
}

// ── List View ────────────────────────────────────────────────────────────────
function ListView({ accounts, edges }) {
  const accountMap = Object.fromEntries(accounts.map((a) => [a.id, a]));
  return (
    <div className="flow-list-view">
      {edges.length === 0 && (
        <div className="empty-state">No connections defined. Open Accounts tab, edit an account, and add connections.</div>
      )}
      {edges.map((e, i) => {
        const from = accountMap[e.fromId];
        const to = accountMap[e.toId];
        if (!from || !to) return null;
        return (
          <div key={i} className="flow-list-row">
            <span className="flow-from">{from.name}</span>
            <span className="flow-arrow-label" style={{ color: FLOW_COLOR[e.flowType] || '#94A3B8' }}>
              → {FLOW_LABEL[e.flowType] || e.flowType} →
            </span>
            <span className="flow-to">{to.name}</span>
            <span className="flow-amount" style={{ color: FLOW_COLOR[e.flowType] || '#94A3B8' }}>
              {e.label ? `${e.label} · ` : ''}{formatCurrency(e.amount || 0)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Panel ───────────────────────────────────────────────────────────────
export default function MoneyFlowPanel() {
  const [accounts] = useLocalStorage('budget_accounts', DEFAULT_ACCOUNTS);
  const [positions, setPositions] = useLocalStorage('budget_flow_positions', {});
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [viewMode, setViewMode] = useState('diagram'); // 'diagram' | 'list'
  const [selected, setSelected] = useState(null);
  const svgRef = useRef(null);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });

  // Compute effective positions (use stored or default)
  const effectivePos = useMemo(() => {
    const defaults = defaultPositions(accounts);
    const merged = { ...defaults };
    Object.entries(positions).forEach(([id, p]) => { merged[id] = p; });
    return merged;
  }, [accounts, positions]);

  // Build edge list from account connections
  const edges = useMemo(() => {
    const result = [];
    accounts.forEach((a) => {
      (a.connections || []).forEach((conn) => {
        result.push({
          fromId: a.id,
          toId: conn.toAccountId,
          label: conn.label || '',
          amount: conn.amount || 0,
          flowType: conn.flowType || 'transfer',
        });
      });
    });
    return result;
  }, [accounts]);

  const handleDrag = useCallback((id, x, y) => {
    setPositions((prev) => ({ ...prev, [id]: { x: Math.max(0, x), y: Math.max(0, y) } }));
  }, [setPositions]);

  const resetLayout = () => {
    setPositions({});
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Pan on SVG background drag
  const onSvgMouseDown = (e) => {
    if (e.target !== svgRef.current && e.target.closest('g')) return;
    isPanning.current = true;
    panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };
  const onSvgMouseMove = (e) => {
    if (!isPanning.current) return;
    setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
  };
  const onSvgMouseUp = () => { isPanning.current = false; };

  const onWheel = (e) => {
    e.preventDefault();
    setZoom((z) => Math.min(2, Math.max(0.3, z - e.deltaY * 0.001)));
  };

  // Arrow endpoint: center of right or left edge of node
  const nodePort = (id, side = 'right') => {
    const p = effectivePos[id] || { x: 0, y: 0 };
    return side === 'right'
      ? { x: p.x + NODE_W, y: p.y + NODE_H / 2 }
      : { x: p.x,          y: p.y + NODE_H / 2 };
  };

  // SVG canvas size (enough to show all nodes)
  const canvasW = Math.max(1200, ...Object.values(effectivePos).map((p) => p.x + NODE_W + 80));
  const canvasH = Math.max(700, ...Object.values(effectivePos).map((p) => p.y + NODE_H + 80));

  return (
    <div className="flow-panel">
      {/* Toolbar */}
      <div className="flow-toolbar">
        <div className="flow-toolbar-left">
          <button
            className={`flow-view-btn ${viewMode === 'diagram' ? 'active' : ''}`}
            onClick={() => setViewMode('diagram')}
          >
            Diagram
          </button>
          <button
            className={`flow-view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            List
          </button>
        </div>
        {viewMode === 'diagram' && (
          <div className="flow-toolbar-right">
            <button className="flow-zoom-btn" onClick={() => setZoom((z) => Math.min(2, z + 0.1))}>＋</button>
            <span className="flow-zoom-label">{Math.round(zoom * 100)}%</span>
            <button className="flow-zoom-btn" onClick={() => setZoom((z) => Math.max(0.3, z - 0.1))}>－</button>
            <button className="flow-reset-btn" onClick={resetLayout}>Reset Layout</button>
          </div>
        )}
      </div>

      <div className="flow-body">
        {viewMode === 'list' ? (
          <ListView accounts={accounts} edges={edges} />
        ) : (
          <>
            {/* Diagram canvas */}
            <div className="flow-canvas-wrap">
              <svg
                ref={svgRef}
                className="flow-svg"
                width={canvasW}
                height={canvasH}
                onMouseDown={onSvgMouseDown}
                onMouseMove={onSvgMouseMove}
                onMouseUp={onSvgMouseUp}
                onWheel={onWheel}
                style={{ cursor: isPanning.current ? 'grabbing' : 'default' }}
              >
                <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
                  {/* Arrows */}
                  {edges.map((e, i) => {
                    const fp = effectivePos[e.fromId];
                    const tp = effectivePos[e.toId];
                    if (!fp || !tp) return null;
                    const from = nodePort(e.fromId, fp.x < tp.x ? 'right' : 'left');
                    const to   = nodePort(e.toId,   fp.x < tp.x ? 'left'  : 'right');
                    return (
                      <Arrow
                        key={i}
                        x1={from.x} y1={from.y}
                        x2={to.x}   y2={to.y}
                        color={FLOW_COLOR[e.flowType] || '#94A3B8'}
                        label={e.label}
                        amount={e.amount}
                        animated={true}
                      />
                    );
                  })}

                  {/* Nodes */}
                  {accounts.map((a) => (
                    <AccountNode
                      key={a.id}
                      account={a}
                      pos={effectivePos[a.id] || { x: 60, y: 60 }}
                      onDrag={handleDrag}
                      selected={selected === a.id}
                      onClick={() => setSelected(selected === a.id ? null : a.id)}
                    />
                  ))}
                </g>
              </svg>
            </div>

            {/* Sidebar */}
            <FlowSummary accounts={accounts} edges={edges} />
          </>
        )}
      </div>

      {/* Legend */}
      {viewMode === 'diagram' && (
        <div className="flow-legend">
          {Object.entries(FLOW_COLOR).map(([ft, color]) => (
            <span key={ft} className="flow-legend-item">
              <span className="flow-legend-dot" style={{ background: color }} />
              {FLOW_LABEL[ft]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
