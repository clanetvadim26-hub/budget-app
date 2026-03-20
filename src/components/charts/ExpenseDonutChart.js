import React, { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getCategoryById, CATEGORY_COLORS } from '../../data/categories';
import { formatCurrency } from '../../utils/calculations';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const { name, value } = payload[0].payload;
    const cat = getCategoryById(name);
    return (
      <div className="chart-tooltip">
        <div>{cat.icon} {cat.label}</div>
        <div className="tooltip-amount">{formatCurrency(value)}</div>
      </div>
    );
  }
  return null;
};

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11}>
      {(percent * 100).toFixed(0)}%
    </text>
  );
};

export default function ExpenseDonutChart({ expensesByCategory }) {
  const [activeIndex, setActiveIndex] = useState(null);

  const data = Object.entries(expensesByCategory)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
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
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={70}
          outerRadius={110}
          paddingAngle={2}
          dataKey="value"
          labelLine={false}
          label={renderCustomLabel}
          onMouseEnter={(_, index) => setActiveIndex(index)}
          onMouseLeave={() => setActiveIndex(null)}
        >
          {data.map((entry, index) => (
            <Cell
              key={entry.name}
              fill={CATEGORY_COLORS[entry.name] || '#B0BEC5'}
              opacity={activeIndex === null || activeIndex === index ? 1 : 0.5}
              stroke="transparent"
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value) => {
            const cat = getCategoryById(value);
            return <span style={{ color: '#CBD5E1', fontSize: 12 }}>{cat.icon} {cat.label}</span>;
          }}
          iconSize={8}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
