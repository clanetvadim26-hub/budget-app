import React from 'react';
import { getCategoryById, CATEGORY_COLORS } from '../data/categories';

export default function CategoryBadge({ categoryId }) {
  const cat = getCategoryById(categoryId);
  const color = CATEGORY_COLORS[categoryId] || '#B0BEC5';

  return (
    <span
      className="category-badge"
      style={{ backgroundColor: color + '22', color, border: `1px solid ${color}44` }}
    >
      {cat.icon} {cat.label}
    </span>
  );
}
