import { Icon } from '../../../shared/icons/index.jsx';
import { dashToneColor, dashToneSoft } from './DashboardCard.jsx';

const W = 120;
const H = 34;

// Inline sparkline — the project ships no chart library and none is needed for 7 points.
function Sparkline({ series = [], tone = 'blue' }) {
  const values = (series || []).map((point) => Number(point.value) || 0);
  // Нечего показывать: меньше двух точек или все значения нулевые.
  if (values.length < 2 || !values.some((value) => value !== 0)) return <span className="dsh-kpi-spark" aria-hidden="true" />;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min;
  const step = W / (values.length - 1);
  const points = values.map((value, index) => [index * step, span ? H - 3 - ((value - min) / span) * (H - 8) : H / 2]);
  const line = points.map(([x, y], index) => `${index ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const color = dashToneColor(tone);
  return (
    <svg className="dsh-kpi-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="presentation" focusable="false">
      <path d={`${line} L${W} ${H} L0 ${H} Z`} fill={color} opacity=".10" />
      <path d={line} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function KpiCard({ icon, tone = 'blue', label, value, delta, deltaTone = 'gray', deltaIcon, series, onClick, title }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick} title={title}
      className={'card dsh-kpi-card' + (onClick ? ' is-clickable' : '')}>
      <span className="dsh-kpi-ic" style={{ background: dashToneSoft(tone), color: dashToneColor(tone) }}>
        <Icon name={icon} />
      </span>
      <span className="dsh-kpi-label">{label}</span>
      <span className="dsh-kpi-value" style={tone === 'red' || tone === 'amber' ? { color: dashToneColor(tone) } : undefined}>{value}</span>
      <span className="dsh-kpi-foot">
        {delta ? (
          <span className="dsh-kpi-delta" style={{ color: dashToneColor(deltaTone) }}>
            {deltaIcon && <Icon name={deltaIcon} />}{delta}
          </span>
        ) : <span className="dsh-kpi-delta dsh-kpi-delta-muted">—</span>}
        <Sparkline series={series} tone={tone} />
      </span>
    </Tag>
  );
}

function DashboardKpiGrid({ items = [] }) {
  return (
    <div className="dsh-kpi-grid">
      {items.map(({ key, ...card }) => <KpiCard key={key} {...card} />)}
    </div>
  );
}

export { DashboardKpiGrid, KpiCard, Sparkline };
