import { Button } from '../../../shared/ui/Button.jsx';
import { Icon } from '../../../shared/icons/index.jsx';
import { DashboardCard, DashboardEmpty, DashboardError, DashboardSkeleton, dashToneColor } from './DashboardCard.jsx';

const VIEW_W = 720;
const VIEW_H = 240;
const PAD = { top: 18, right: 14, bottom: 30, left: 52 };

function niceCeil(value) {
  if (value <= 0) return 100;
  const power = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / power) * power;
}

// Inline SVG keeps the page dependency-free: the project has no chart library installed.
function LineChart({ series, format }) {
  const values = series.map((point) => Number(point.value) || 0);
  const max = niceCeil(Math.max(...values, 0));
  const innerW = VIEW_W - PAD.left - PAD.right;
  const innerH = VIEW_H - PAD.top - PAD.bottom;
  const step = series.length > 1 ? innerW / (series.length - 1) : 0;
  const x = (index) => PAD.left + index * step;
  const y = (value) => PAD.top + innerH - (max ? (value / max) * innerH : 0);
  const points = values.map((value, index) => [x(index), y(value)]);
  const line = points.map(([px, py], index) => `${index ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`).join(' ');
  const area = `${line} L${x(values.length - 1).toFixed(1)} ${PAD.top + innerH} L${PAD.left} ${PAD.top + innerH} Z`;
  const ticks = [0, 0.5, 1].map((ratio) => Math.round(max * ratio));
  const color = dashToneColor('blue');
  return (
    <svg className="dsh-chart" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} role="img" aria-label="Продажи за 7 дней">
      <defs>
        <linearGradient id="dshSalesFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((tick) => (
        <g key={tick}>
          <line x1={PAD.left} x2={VIEW_W - PAD.right} y1={y(tick)} y2={y(tick)} stroke="var(--line)" strokeWidth="1" />
          <text x={PAD.left - 10} y={y(tick) + 4} textAnchor="end" className="dsh-chart-tick">{format(tick)}</text>
        </g>
      ))}
      <path d={area} fill="url(#dshSalesFill)" />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {points.map(([px, py], index) => (
        <circle key={series[index].key} cx={px} cy={py} r="3.4" fill="#fff" stroke={color} strokeWidth="2">
          <title>{`${series[index].label} · ${format(values[index])}`}</title>
        </circle>
      ))}
      {series.map((point, index) => (
        <text key={point.key} x={x(index)} y={VIEW_H - 9} textAnchor="middle" className="dsh-chart-tick">{point.label}</text>
      ))}
    </svg>
  );
}

function SalesChart({ series = [], total, delta, deltaTone = 'gray', loading, error, onRetry, onOpenAll, format = String }) {
  const body = () => {
    if (error) return <DashboardError sub={error} onRetry={onRetry} />;
    if (loading) return <DashboardSkeleton rows={1} height={200} />;
    if (series.length < 2 || !series.some((point) => Number(point.value))) return <DashboardEmpty icon="finance" tone="blue" title="Продаж за последние 7 дней нет" />;
    return (
      <>
        <div className="dsh-chart-head">
          <span className="dsh-chart-total">{total}</span>
          {delta && <span className="dsh-kpi-delta" style={{ color: dashToneColor(deltaTone) }}><Icon name="arrowUpRight" />{delta}</span>}
        </div>
        <div className="dsh-chart-sub">Общий объём продаж</div>
        <LineChart series={series} format={format} />
      </>
    );
  };
  return (
    <DashboardCard
      title="Продажи за 7 дней"
      action={<Button variant="ghost" size="sm" iconRight="arrowRight" onClick={onOpenAll}>Все продажи</Button>}
    >
      {body()}
    </DashboardCard>
  );
}

export { LineChart, SalesChart };
