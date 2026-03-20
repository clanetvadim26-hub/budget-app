import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getCategoryById, CATEGORY_COLORS } from '../../data/categories';
import { formatCurrency } from '../../utils/calculations';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const cat = getCategoryById(payload[0].payload.name);
    return (
      <div className="chart-tooltip">
        <div>{cat.icon} {cat.label}</div>
        <div className="tooltip-amount">{formatCurrency(payload[0].value)}</div>
      </div>
    );
  }
  return null;
};

export default function ExpenseBarChart({ expensesByCategory }) {
  const data = Object.entries(expensesByCategory)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([key, value]) => ({ name: key, value }));

  if (data.length === 0) {
    return (
      <div className="empty-chart">
        <span>No expense data yet</span>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
        <XAxis
          type="number"
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          tick={{ fill: '#94A3B8', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={0}
          tick={false}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || '#B0BEC5'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
