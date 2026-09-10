import { Avatar } from '../../../shared/ui/Avatar.jsx';
import { Button } from '../../../shared/ui/Button.jsx';
import { Icon } from '../../../shared/icons/index.jsx';
import { DashboardCard, DashboardEmpty, DashboardError, DashboardSkeleton, dashToneColor } from './DashboardCard.jsx';

function OperatorRow({ row, max }) {
  const share = max ? Math.max(6, Math.round((row.orders / max) * 100)) : 0;
  return (
    <div className="dsh-op">
      <Avatar name={row.name} size={34} />
      <span className="dsh-op-name">{row.name}</span>
      <span className="dsh-op-count">{row.orders}</span>
      <span className="dsh-op-bar"><span style={{ width: `${share}%`, background: dashToneColor(row.sla === 'red' ? 'red' : 'blue') }} /></span>
      <span className="dsh-op-delta" style={{ color: dashToneColor(row.deltaTone) }}>
        {row.delta ? <><Icon name={row.deltaTone === 'red' ? 'chevDown' : 'arrowUpRight'} />{row.delta}</> : '—'}
        <span className="dsh-op-delta-sub">заказов</span>
      </span>
    </div>
  );
}

function OperatorsPerformance({ rows = [], loading, error, onRetry, onOpenAll }) {
  const max = rows.reduce((peak, row) => Math.max(peak, row.orders || 0), 0);
  const body = () => {
    if (error) return <DashboardError sub={error} onRetry={onRetry} />;
    if (loading) return <DashboardSkeleton rows={4} height={44} />;
    if (!rows.length) return <DashboardEmpty icon="users" tone="blue" title="Операторы ещё не работали с заказами" />;
    return <div className="dsh-ops">{rows.map((row) => <OperatorRow key={row.id || row.name} row={row} max={max} />)}</div>;
  };
  return (
    <DashboardCard
      title="Работа операторов"
      action={<Button variant="ghost" size="sm" iconRight="arrowRight" onClick={onOpenAll}>Все операторы</Button>}
    >
      {body()}
    </DashboardCard>
  );
}

export { OperatorRow, OperatorsPerformance };
