import { useState } from 'react';
import { Icon } from '../icons/index';

function Th({ label, col, sort, onSort, sortable = true, style }) {
  if (!sortable) return <th style={style}>{label}</th>;
  const active = sort && sort.col === col;
  return (
    <th className="sortable" style={style} onClick={() => onSort(col)}>
      <span className="th-in">{label}
        <Icon name={active ? (sort.dir === 'asc' ? 'chevUp' : 'chevDown') : 'chevDown'}
          style={{ opacity: active ? 0.9 : 0.35 }} />
      </span>
    </th>
  );
}

function useSort(initial) {
  const [sort, setSort] = useState(initial || null);
  const onSort = (col) => setSort((s) => (s && s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' }));
  const apply = (rows, accessors) => {
    if (!sort) return rows;
    const acc = accessors[sort.col] || ((r) => r[sort.col]);
    const sorted = [...rows].sort((a, b) => {
      const x = acc(a), y = acc(b);
      if (typeof x === 'number' && typeof y === 'number') return x - y;
      return String(x).localeCompare(String(y), 'ru');
    });
    return sort.dir === 'asc' ? sorted : sorted.reverse();
  };
  return { sort, onSort, apply };
}

export { Th, useSort };
