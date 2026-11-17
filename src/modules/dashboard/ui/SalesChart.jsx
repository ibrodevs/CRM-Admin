import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Drawer } from '../../../shared/ui/Overlays.jsx';
import { Button } from '../../../shared/ui/Button.jsx';
import { Icon } from '../../../shared/icons/index.jsx';
import { DateRangeField } from '../../../shared/ui/DateFields.jsx';
import { DashboardCard, DashboardError, DashboardSkeleton, dashToneColor } from './DashboardCard.jsx';
import { percentChange, formatPercent, percentTone, seriesTotal } from '../model/dashboard-metrics.js';
import { SALES_PERIODS, chartDate, chartDayKey, rangeDays, salesPeriodRange, salesRangeSeries, previousSalesRange, zoomSalesRange, salesDayStatistics } from '../model/sales-chart.js';

const VIEW_W = 720, VIEW_H = 260;
const PAD = { top: 18, right: 22, bottom: 32, left: 76 };
const prettyDate = (key) => chartDate(key)?.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
function niceCeil(value) {
  if (value <= 0) return 100;
  const power = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / power) * power;
}

function LineChart({ series, format = String, onZoom, onSelectDay }) {
  const svg = useRef(null);
  const lastWheel = useRef(0);
  const gradientId = useId().replace(/:/g, '');
  const [hovered, setHovered] = useState(null);
  const [viewWidth, setViewWidth] = useState(VIEW_W);
  const innerW = viewWidth - PAD.left - PAD.right, innerH = VIEW_H - PAD.top - PAD.bottom;
  const ratioAt = (event) => {
    const box = svg.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, ((event.clientX - box.left) / box.width * viewWidth - PAD.left) / innerW));
  };
  useEffect(() => {
    const node = svg.current;
    if (!node || !onZoom) return;
    const wheel = (event) => {
      if (!event.deltaY || event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      const time = Date.now();
      if (time - lastWheel.current < 100) return;
      lastWheel.current = time;
      onZoom(event.deltaY, ratioAt(event));
    };
    node.addEventListener('wheel', wheel, { passive: false });
    return () => node.removeEventListener('wheel', wheel);
  }, [onZoom, viewWidth]);
  useEffect(() => {
    const node = svg.current;
    if (!node) return;
    const measure = () => setViewWidth(Math.max(300, Math.round(node.getBoundingClientRect().width) || VIEW_W));
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => setHovered(null), [series[0]?.key, series[series.length - 1]?.key]);
  if (!series.length) return null;
  const values = series.map((point) => Number(point.value) || 0);
  const low = Math.min(...values, 0), min = low < 0 ? -niceCeil(-low) : 0;
  const max = niceCeil(Math.max(...values, 0));
  const x = (index) => PAD.left + (series.length > 1 ? index / (series.length - 1) : 0.5) * innerW;
  const y = (value) => PAD.top + innerH - (value - min) / (max - min) * innerH;
  const points = values.map((value, index) => [x(index), y(value)]);
  const line = points.map(([px, py], index) => `${index ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`).join(' ');
  const area = `${line} L${x(values.length - 1)} ${y(0)} L${x(0)} ${y(0)} Z`;
  const ticks = [...new Set([min, (max + min) / 2, max])];
  const color = dashToneColor('blue');
  const activeIndex = hovered == null ? null : Math.max(0, Math.min(series.length - 1, hovered));
  const active = activeIndex == null ? null : series[activeIndex];
  const labelEvery = Math.max(1, Math.ceil((series.length - 1) / Math.max(2, Math.floor(innerW / 100))));
  return <div className="dsh-interactive-chart">
    <svg ref={svg} className="dsh-chart" viewBox={`0 0 ${viewWidth} ${VIEW_H}`} preserveAspectRatio="none" role="img" tabIndex={0}
      aria-label={`Продажи с ${prettyDate(series[0].key)} по ${prettyDate(series[series.length - 1].key)}. Стрелки влево и вправо — просмотр значений. Enter — статистика за день.`}
      onPointerMove={(event) => setHovered(Math.round(ratioAt(event) * (series.length - 1)))} onPointerLeave={() => setHovered(null)}
      onClick={(event) => onSelectDay?.(series[Math.round(ratioAt(event) * (series.length - 1))].key)}
      onPointerDown={(event) => { event.currentTarget.focus({ preventScroll: true }); setHovered(Math.round(ratioAt(event) * (series.length - 1))); }}
      onFocus={() => setHovered((index) => index ?? 0)} onBlur={() => setHovered(null)}
      onKeyDown={(event) => {
        if (['Enter', ' '].includes(event.key) && onSelectDay) { event.preventDefault(); onSelectDay(series[activeIndex ?? 0].key); return; }
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        setHovered((index) => event.key === 'Home' ? 0 : event.key === 'End' ? series.length - 1 : Math.max(0, Math.min(series.length - 1, (index ?? 0) + (event.key === 'ArrowRight' ? 1 : -1))));
      }}>
      <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".18" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      {ticks.map((tick) => <g key={tick}>
        <line x1={PAD.left} x2={viewWidth - PAD.right} y1={y(tick)} y2={y(tick)} stroke="var(--line)" />
        <text x={PAD.left - 10} y={y(tick) + 4} textAnchor="end" className="dsh-chart-tick">{format(tick)}</text>
      </g>)}
      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {points.map(([px, py], index) => <circle key={series[index].key} cx={px} cy={py} r={series.length > 60 ? 1.5 : 3.4} fill="var(--surface)" stroke={color} strokeWidth="2" />)}
      {active && <g pointerEvents="none"><line x1={x(activeIndex)} x2={x(activeIndex)} y1={PAD.top} y2={VIEW_H - PAD.bottom} stroke={color} strokeDasharray="4 4" opacity=".6" /><circle cx={x(activeIndex)} cy={y(active.value)} r="6" fill={color} stroke="var(--surface)" strokeWidth="3" /></g>}
      {series.map((point, index) => (index === 0 || index === series.length - 1 || (index % labelEvery === 0 && series.length - 1 - index >= labelEvery * 0.6)) && <text key={point.key} x={x(index)} y={VIEW_H - 9} textAnchor="middle" className="dsh-chart-tick">{point.label}</text>)}
    </svg>
    {active && <div className="dsh-chart-tooltip" role="status" style={{ left: `clamp(100px, ${x(activeIndex) / viewWidth * 100}%, calc(100% - 100px))` }}>
      <span>{prettyDate(active.key)}</span><strong>{format(active.value)}</strong><small>Услуг: {active.count ?? 0}</small>
    </div>}
  </div>;
}

function SalesChart({ rows = [], getValue = (row) => row.value, now = new Date(), loading, error, onRetry, onOpenAll, format = String, orders = [], onOpenOrder }) {
  const [selectedDay, setSelectedDay] = useState(null);
  const dayStats = useMemo(() => salesDayStatistics(rows, selectedDay, getValue), [rows, selectedDay, getValue]);
  const [period, setPeriod] = useState('7');
  const [range, setRange] = useState(() => salesPeriodRange('7', now));
  const series = useMemo(() => salesRangeSeries(rows, range, getValue), [rows, range, getValue]);
  const previous = useMemo(() => salesRangeSeries(rows, previousSalesRange(range), getValue), [rows, range, getValue]);
  const total = seriesTotal(series), delta = percentChange(total, seriesTotal(previous));
  const choose = (key) => { setPeriod(key); setRange(salesPeriodRange(key, now)); };
  const changeRange = (start, end) => {
    if (!start || !end) return;
    setPeriod('custom'); setRange({ start: chartDayKey(start), end: chartDayKey(end) });
  };
  const zoom = (direction, anchor = 0.5) => { setPeriod('custom'); setRange((current) => zoomSalesRange(current, direction, anchor, now)); };
  return <DashboardCard title="Продажи" action={<Button variant="ghost" size="sm" iconRight="arrowRight" onClick={onOpenAll}>Все продажи</Button>}>
    <div className="dsh-chart-controls">
      <div className="dsh-chart-periods" role="group" aria-label="Период продаж">{SALES_PERIODS.map((item) => <button type="button" key={item.key} aria-pressed={period === item.key} onClick={() => choose(item.key)}>{item.label}</button>)}</div>
      <DateRangeField placeholder="Выбрать период" startVal={chartDate(range.start)} endVal={chartDate(range.end)} minDate={null} maxDate={now} allowSameDay requireComplete rangeStartLabel="Далее" onChange={changeRange} />
    </div>
    {error ? <DashboardError sub={error} onRetry={onRetry} /> : loading ? <DashboardSkeleton rows={1} height={260} /> : <>
      <div className="dsh-chart-head"><span className="dsh-chart-total">{format(total)}</span>
        {delta != null && <span className="dsh-kpi-delta" style={{ color: dashToneColor(percentTone(delta)) }}><Icon name="arrowUpRight" style={{ visibility: delta === 0 ? 'hidden' : undefined, transform: delta < 0 ? 'rotate(90deg)' : undefined }} />{formatPercent(delta)}</span>}
      </div>
      <div className="dsh-chart-sub">Общий объём продаж · {rangeDays(range)} дн. · сравнение с предыдущим равным периодом</div>
      <LineChart series={series} format={format} onZoom={zoom} onSelectDay={setSelectedDay} />
      <div className="dsh-chart-footer"><span>{series.some((point) => point.value) ? 'Нажмите на дату — статистика за день · прокрутка изменяет масштаб' : 'Продаж за выбранный период нет · нажмите на дату для просмотра статистики'}</span>
        <div className="dsh-chart-zoom"><button type="button" aria-label="Увеличить масштаб по датам" onClick={() => zoom(-1)}>+</button><button type="button" aria-label="Уменьшить масштаб по датам" onClick={() => zoom(1)}>−</button><button type="button" onClick={() => choose('7')}>Сбросить</button></div>
      </div>
    </>}
    <Drawer open={Boolean(selectedDay)} onClose={() => setSelectedDay(null)} title={`Продажи за ${prettyDate(selectedDay) || ''}`} width="min(680px,96vw)">
      <div className="dsh-sales-day-stats" aria-label="Статистика продаж за день">
        <div><span>Объём продаж</span><strong>{format(dayStats.total)}</strong></div>
        <div><span>Услуг</span><strong>{dayStats.count}</strong></div>
        <div><span>Заказов</span><strong>{dayStats.orderIds.length}</strong></div>
        <div><span>Средняя стоимость услуги</span><strong>{format(dayStats.average)}</strong></div>
      </div>
      {!dayStats.count ? <p className="dsh-sales-day-empty">За этот день продаж нет.</p> : <div className="dsh-sales-day-list">
        <h3>Продажи за день</h3>
        {dayStats.sales.map((row, index) => {
          const order = orders.find((order) => String(order.id) === String(row.orderId || row.order) || String(order.no || order.number) === String(row.order));
          return <div className="dsh-sales-day-row" key={row.id || index}>
            <div><strong>{row.title || row.route || row.kind || 'Услуга'}</strong>{order && <span>{[order.client, `Заказ № ${order.no || order.number}`].filter(Boolean).join(' · ')}</span>}</div>
            <strong>{format(Number(getValue(row)))}</strong>
            {order && onOpenOrder && <Button size="sm" variant="secondary" onClick={() => { setSelectedDay(null); onOpenOrder(order); }}>Открыть заказ</Button>}
          </div>;
        })}
      </div>}
    </Drawer>
  </DashboardCard>;
}
export { LineChart, SalesChart };
