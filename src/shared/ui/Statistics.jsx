import { Children } from 'react';
import { Icon } from '../icons/index.jsx';

export function Statistics({ children, label = 'Статистика', columns, className = '', style }) {
  const count = Children.toArray(children).length;
  if (!count) return null;
  const size = Math.max(1, Math.min(columns || count, 4));
  return <div role="group" aria-label={label} data-stat-columns={size}
    className={`statistics ${className}`.trim()} style={{ ...style, '--stat-columns': size }}>
    {children}
  </div>;
}

export function Statistic({ label, value, color, icon, sub, onClick, selected, className = '' }) {
  const Tag = onClick ? 'button' : 'div';
  return <Tag className={`statistic ${className}`.trim()} type={onClick ? 'button' : undefined} onClick={onClick} aria-pressed={onClick && selected !== undefined ? selected : undefined}>
    <span className="statistic-label">{icon && <span aria-hidden="true"><Icon name={icon} /></span>}{label}</span>
    <span className="statistic-value" style={color ? { color } : undefined}>{value}</span>
    {sub && <span className="statistic-sub">{sub}</span>}
  </Tag>;
}
