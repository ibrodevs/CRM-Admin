import { Icon } from '../icons/index.jsx';

function EmptyState({ icon = 'inbox', title = 'Нет данных', sub, action }) {
  return (
    <div className="empty">
      <Icon name={icon} strokeWidth={1.5} />
      <div className="e-title">{title}</div>
      {sub && <div className="e-sub">{sub}</div>}
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  );
}

function SkeletonRows({ rows = 6, cols = 6 }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: cols }).map((__, j) => (
            <td key={j}><div className="sk" style={{ height: 16, width: j === 0 ? '40%' : '70%' }} /></td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

export { EmptyState, SkeletonRows };
