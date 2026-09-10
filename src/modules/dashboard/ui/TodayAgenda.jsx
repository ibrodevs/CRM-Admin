import { Button } from '../../../shared/ui/Button.jsx';
import { Icon } from '../../../shared/icons/index.jsx';
import { DashboardCard, DashboardEmpty, DashboardError, DashboardSkeleton, dashToneColor, dashToneSoft } from './DashboardCard.jsx';
import { RU_WEEKDAYS, addDays, ruFullDate, sameDay, weekDays } from '../model/dashboard-metrics.js';

function WeekStrip({ anchor, selected, today, onSelect, onShiftWeek }) {
  const days = weekDays(anchor);
  return (
    <div className="dsh-week">
      <button type="button" className="dsh-week-nav" onClick={() => onShiftWeek(-7)} aria-label="Предыдущая неделя"><Icon name="chevLeft" /></button>
      <div className="dsh-week-grid">
        {RU_WEEKDAYS.map((label) => <span key={label} className="dsh-week-name">{label}</span>)}
        {days.map((day) => (
          <button key={day.toISOString()} type="button" onClick={() => onSelect(day)}
            className={'dsh-week-day' + (sameDay(day, selected) ? ' is-selected' : '') + (sameDay(day, today) ? ' is-today' : '')}>
            {day.getDate()}
          </button>
        ))}
      </div>
      <button type="button" className="dsh-week-nav" onClick={() => onShiftWeek(7)} aria-label="Следующая неделя"><Icon name="chevRight" /></button>
    </div>
  );
}

function AgendaItem({ item, onClick }) {
  return (
    <button type="button" className="dsh-agenda-item" onClick={onClick} disabled={!onClick}
      style={{ background: dashToneSoft(item.tone), borderColor: 'transparent' }}>
      <span className="dsh-agenda-time" style={{ color: dashToneColor(item.tone) }}>{item.time || '—'}</span>
      <span className="dsh-agenda-ic" style={{ background: dashToneColor(item.tone) }}><Icon name={item.icon} /></span>
      <span className="dsh-agenda-main">
        <span className="dsh-row-title">{item.title}</span>
        {item.sub && <span className="dsh-row-sub">{item.sub}</span>}
      </span>
    </button>
  );
}

function TodayAgenda({ day, today, items = [], loading, error, onRetry, onSelectDay, onOpenItem, onOpenCalendar }) {
  const isToday = sameDay(day, today);
  const body = () => {
    if (error) return <DashboardError sub={error} onRetry={onRetry} />;
    if (loading) return <DashboardSkeleton rows={4} height={56} />;
    if (!items.length) return <DashboardEmpty icon="check" title={isToday ? 'На сегодня событий нет' : 'На этот день событий нет'} />;
    return <div className="dsh-agenda">{items.map((item) => <AgendaItem key={item.id} item={item} onClick={onOpenItem ? () => onOpenItem(item) : undefined} />)}</div>;
  };
  return (
    <DashboardCard
      title={isToday ? 'Сегодня' : 'Расписание'}
      action={<span className="dsh-card-date">{ruFullDate(day)}</span>}
      footer={<Button variant="secondary" size="sm" icon="calendar" className="btn-block" onClick={onOpenCalendar}>Открыть календарь поездок</Button>}
    >
      <WeekStrip anchor={day} selected={day} today={today}
        onSelect={onSelectDay} onShiftWeek={(shift) => onSelectDay(addDays(day, shift))} />
      <div className="dsh-agenda-list">{body()}</div>
    </DashboardCard>
  );
}

export { AgendaItem, TodayAgenda, WeekStrip };
