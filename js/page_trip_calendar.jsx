import { useEffect, useState } from 'react';
import { Icon } from './icons';
import { Button, DateRangeField, Drawer, FilterChip, Pill, useToast } from './ui';
import { CURRENT_USER, ORDER_STATUS, SERVICE_KIND } from './data';
import { TRIPS, TRIP_CRIT, TRIP_NOW, controlCenterFeed, critMax, crossTripConflicts, trDay, trDayTime, trHumanIn, trSameDay, trStartOfDay, trTime, tripConflicts, tripCriticality, tripEvents, tripFilterSets, tripForceMajeures, tripUnpaid } from './data/trips';
import { Topbar } from './layout';
import { ServiceCardSendPanel } from './page_services';
import { CAL_EVENT_TYPES, CalDayMenu, CalEventChip, CalEventCreator, CalEventPanel, calEventsOn, calendarEventToUi, hydrateCalendarEvents } from './page_calendar_events';
import { calendarApi, ordersApi, workspaceActionsApi } from './api/resources';
import { toUiOrder } from './api/adapters';






const TC_WEEKDAYS = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
const TC_MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const TC_MONTHS_NOM = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];


function tcWeekStart(d) {
  const s = trStartOfDay(d);
  const wd = (s.getDay() + 6) % 7;
  s.setDate(s.getDate() - wd);
  return s;
}
function tcAddDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function tcTripActiveOn(trip, day) {
  const d0 = trStartOfDay(day), d1 = tcAddDays(d0, 1);
  return trip.start < d1 && trip.end >= d0;
}
function tcTripActiveInRange(trip, start, end) {
  if (!start && !end) return true;
  const d0 = trStartOfDay(start || end);
  const d1 = tcAddDays(trStartOfDay(end || start), 1);
  return trip.start < d1 && trip.end >= d0;
}
function tcTone(crit) { return TRIP_CRIT[crit] ? TRIP_CRIT[crit].tone : 'gray'; }
function tcCrit(crit) { return TRIP_CRIT[crit] || { label: crit && crit !== 'info' ? String(crit) : 'Информация', tone: 'gray', rank: 0 }; }


function CritDot({ crit, size = 8 }) {
  return <span title={TRIP_CRIT[crit] ? TRIP_CRIT[crit].label : ''} style={{ display: 'inline-block', width: size, height: size, borderRadius: '50%', background: 'var(--' + tcTone(crit) + ')', flex: '0 0 auto' }} />;
}


function SvcGlyph({ kind, size = 26 }) {
  const k = SERVICE_KIND[kind] || { icon: 'route', color: 'var(--muted)' };
  return (
    <span className="tc-glyph" style={{ width: size, height: size, background: k.img ? '#fff' : k.color, border: k.img ? '1px solid var(--line)' : 'none' }} title={kind}>
      {k.img ? <img src={k.img} alt={kind} /> : <Icon name={k.icon} style={{ width: size * 0.55, height: size * 0.55 }} />}
    </span>
  );
}


function TripCard({ trip, compact, onOpen }) {
  const events = tripEvents(trip);
  const conflicts = tripConflicts(trip);
  const fms = tripForceMajeures(trip);
  const crit = tripCriticality(trip);
  const kinds = Array.from(new Set(trip.services.map((s) => s.kind)));
  const topEvent = events[0];
  return (
    <button type="button" className={'tc-card tone-' + tcTone(crit) + (compact ? ' tc-card-compact' : '')} onClick={() => onOpen(trip)}>
      <div className="tc-card-head">
        <span className="tc-card-route">{trip.routeLabel}</span>
        {crit !== 'info' && <CritDot crit={crit} />}
      </div>
      <div className="tc-card-sub">
        {trip.isGroup || trip.group ? <Icon name="users" style={{ width: 13, height: 13, verticalAlign: -2 }} /> : null}
        {' '}{trip.company && trip.company !== '—' ? trip.company : trip.client}
        {trip.group ? ' · группа ' + trip.group.bookings : ' · ' + trip.pax + ' пасс.'}
      </div>
      {!compact && (
        <div className="tc-card-dates">
          <Icon name="calendar" style={{ width: 12, height: 12 }} /> {trDay(trip.start)}–{trDay(trip.end)}
          <span className="tc-card-op"><Icon name="user" style={{ width: 12, height: 12 }} /> {trip.operator}</span>
        </div>
      )}
      <div className="tc-card-kinds">
        {kinds.map((k) => <SvcGlyph key={k} kind={k} size={compact ? 18 : 22} />)}
        <span className="tc-card-status"><Pill tone={ORDER_STATUS[trip.status] || 'gray'}>{trip.status}</Pill></span>
      </div>

      {(fms.length > 0 || conflicts.length > 0 || topEvent) && (
        <div className="tc-card-markers">
          {fms.length > 0 && <span className="tc-marker tc-marker-fm"><Icon name={fms[0].icon} style={{ width: 12, height: 12 }} />{fms[0].typeLabel}</span>}
          {conflicts.length > 0 && <span className="tc-marker tc-marker-conf"><Icon name="alertTriangle" style={{ width: 12, height: 12 }} />Конфликт{conflicts.length > 1 ? ' ×' + conflicts.length : ''}</span>}
          {topEvent && fms.length === 0 && conflicts.length === 0 && (
            <span className={'tc-marker tone-' + tcTone(topEvent.crit)}><Icon name={topEvent.icon} style={{ width: 12, height: 12 }} />{topEvent.label} · {trHumanIn(topEvent.at)}</span>
          )}
        </div>
      )}
    </button>
  );
}


function TripWeekChip({ trip, onOpen }) {
  const crit = tripCriticality(trip);
  const kinds = Array.from(new Set(trip.services.map((s) => s.kind)));
  const fms = tripForceMajeures(trip);
  const conflicts = tripConflicts(trip);
  const who = trip.company && trip.company !== '—' ? trip.company : trip.client;
  const paxLabel = trip.group ? 'группа ' + trip.group.bookings : trip.pax + ' пасс.';
  return (
    <button type="button" className={'tc-wchip tone-' + tcTone(crit)} onClick={() => onOpen(trip)} title={trip.routeLabel + ' · ' + who}>
      <span className="tc-wchip-l1">
        {crit !== 'info' && <CritDot crit={crit} size={7} />}
        <span className="tc-wchip-route">{trip.routeLabel}</span>
        {(fms.length > 0 || conflicts.length > 0) && (
          <Icon name="alertTriangle" style={{ width: 12, height: 12, color: 'var(--' + (fms.length ? 'red' : 'amber') + ')', flexShrink: 0 }} />
        )}
      </span>
      <span className="tc-wchip-l2">
        {kinds.slice(0, 4).map((k) => <SvcGlyph key={k} kind={k} size={15} />)}
        <span className="tc-wchip-sub">{who} · {paxLabel}</span>
        <span className="tc-wchip-status"><Pill tone={ORDER_STATUS[trip.status] || 'gray'}>{trip.status}</Pill></span>
      </span>
    </button>
  );
}

function WeekView({ anchor, trips, onOpen, onPickDay, onOpenEvent, evtTick }) {
  const start = tcWeekStart(anchor);
  const days = Array.from({ length: 7 }, (_, i) => tcAddDays(start, i));
  return (
    <div className="tc-week">
      {days.map((day) => {
        const isToday = trSameDay(day, TRIP_NOW);
        const dayTrips = trips.filter((t) => tcTripActiveOn(t, day))
          .sort((a, b) => tcCrit(tripCriticality(b)).rank - tcCrit(tripCriticality(a)).rank);
        const dayEvents = calEventsOn(day);
        return (
          <div key={day.toISOString()} className={'tc-week-col' + (isToday ? ' is-today' : '')}>
            <button type="button" className="tc-week-head" title="Клик — создать событие" style={{ cursor: 'pointer', border: 'none', width: '100%', font: 'inherit' }} onClick={(e) => onPickDay(day, e)}>
              <span className="tc-wd">{TC_WEEKDAYS[(day.getDay() + 6) % 7]}</span>
              <span className="tc-dn">{day.getDate()}</span>
              {isToday && <span className="tc-today-badge">сегодня</span>}
              <Icon name="plus" style={{ width: 13, height: 13, color: 'var(--muted-2)', marginLeft: 'auto' }} />
            </button>
            <div className="tc-week-body">
              {dayTrips.length === 0 && dayEvents.length === 0 && <div className="tc-empty-day">—</div>}
              {dayTrips.map((t) => <TripWeekChip key={t.id} trip={t} onOpen={onOpen} />)}
              {dayEvents.map((ev) => <CalEventChip key={ev.id} evt={ev} onOpen={onOpenEvent} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}


function DayView({ anchor, trips, onOpen, onPickDay, onOpenEvent, evtTick }) {
  const dayTrips = trips.filter((t) => tcTripActiveOn(t, anchor))
    .sort((a, b) => tcCrit(tripCriticality(b)).rank - tcCrit(tripCriticality(a)).rank);

  const schedule = [];
  dayTrips.forEach((t) => tripEvents(t).forEach((e) => { if (trSameDay(e.at, anchor)) schedule.push({ trip: t, ...e }); }));
  schedule.sort((a, b) => a.at - b.at);
  const dayEvents = calEventsOn(anchor);
  return (
    <div className="tc-day">
      <div className="tc-day-list">
        {dayTrips.length === 0 && <DashDetailEmptyLite title="На этот день поездок нет" />}
        {dayTrips.map((t) => <TripCard key={t.id} trip={t} onOpen={onOpen} />)}
      </div>
      <div className="tc-day-schedule">
        <div className="tc-day-schedule-h" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>События дня
          <Button size="sm" variant="secondary" icon="plus" onClick={(e) => onPickDay(anchor, e)}>Создать</Button>
        </div>
        {schedule.length === 0 && dayEvents.length === 0 && <div className="tc-empty-day" style={{ padding: 14 }}>Событий не запланировано</div>}
        {dayEvents.map((ev) => {
          const t = CAL_EVENT_TYPES[ev.type];
          return (
            <button key={ev.id} type="button" className="tc-sched-row" onClick={() => onOpenEvent(ev)} style={{ opacity: ev.done ? 0.55 : 1 }}>
              <span className="tc-sched-time">{ev.time || '—'}</span>
              <span className="tc-sched-ic" style={{ color: 'var(--' + t.tone + ')' }}><Icon name={t.icon} style={{ width: 15, height: 15 }} /></span>
              <span className="tc-sched-main"><b>{ev.title}</b><span className="tc-sched-sub">{t.l}{ev.order ? ' · заказ № ' + ev.order : ''}</span></span>
            </button>
          );
        })}
        {schedule.map((e, i) => (
          <button key={i} type="button" className="tc-sched-row" onClick={() => onOpen(e.trip)}>
            <span className="tc-sched-time">{trTime(e.at)}</span>
            <CritDot crit={e.crit} />
            <span className="tc-sched-ic"><Icon name={e.icon} style={{ width: 15, height: 15 }} /></span>
            <span className="tc-sched-main"><b>{e.label}</b><span className="tc-sched-sub">{e.trip.routeLabel} · {e.trip.client}</span></span>
          </button>
        ))}
      </div>
    </div>
  );
}


function DayListPopover({ day, pos, trips, events, onOpenTrip, onOpenEvent, onOpenDayView, onClose }) {
  const total = trips.length + events.length;
  const W = 320;
  const x = Math.min(Math.max(8, pos.x - W / 2), window.innerWidth - W - 8);
  const y = Math.min(pos.y + 10, window.innerHeight - 420);
  const dateLabel = day.getDate() + ' ' + TC_MONTHS[day.getMonth()] + ' ' + day.getFullYear();
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60 }} onMouseDown={onClose}>
      <div style={{ position: 'fixed', left: x, top: Math.max(8, y), width: W, maxHeight: 'min(70vh, 460px)', display: 'flex', flexDirection: 'column', background: '#fff', border: '1px solid var(--line)', borderRadius: 14, boxShadow: '0 12px 40px rgba(16,23,38,.18)', overflow: 'hidden' }}
        onMouseDown={(e) => e.stopPropagation()}>
        <div style={{ padding: '11px 14px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>{dateLabel}</span>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>· {total} {trPlural(total)}</span>
          <div style={{ flex: 1 }} />
          <button type="button" onClick={onClose} title="Закрыть" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--muted-2)', display: 'inline-flex' }}><Icon name="x" style={{ width: 16, height: 16 }} /></button>
        </div>
        <div style={{ padding: 10, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {trips.map((t) => <TripCard key={t.id} trip={t} compact onOpen={onOpenTrip} />)}
          {events.map((ev) => <CalEventChip key={ev.id} evt={ev} onOpen={onOpenEvent} />)}
          {total === 0 && <div style={{ fontSize: 13, color: 'var(--muted)', padding: '10px 4px' }}>Нет событий на этот день</div>}
        </div>
        <div style={{ padding: 10, borderTop: '1px solid var(--line)' }}>
          <Button size="sm" variant="secondary" icon="calendar" style={{ width: '100%' }} onClick={onOpenDayView}>Открыть день целиком</Button>
        </div>
      </div>
    </div>
  );
}

function trPlural(n) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return 'событий';
  if (b > 1 && b < 5) return 'события';
  if (b === 1) return 'событие';
  return 'событий';
}

function MonthView({ anchor, trips, onOpen, onPickDay, onOpenEvent, onOpenDay, evtTick }) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = tcWeekStart(first);
  const cells = Array.from({ length: 42 }, (_, i) => tcAddDays(gridStart, i));
  return (
    <div className="tc-month">
      <div className="tc-month-grid tc-month-head">{TC_WEEKDAYS.map((w) => <div key={w} className="tc-month-wd">{w}</div>)}</div>
      <div className="tc-month-grid">
        {cells.map((day) => {
          const inMonth = day.getMonth() === anchor.getMonth();
          const isToday = trSameDay(day, TRIP_NOW);
          const dayTrips = trips.filter((t) => tcTripActiveOn(t, day));
          const dayEvents = calEventsOn(day);
          const crit = dayTrips.reduce((c, t) => critMax(c, tripCriticality(t)), 'info');
          return (
            <button key={day.toISOString()} type="button" title="Клик — создать событие" className={'tc-month-cell' + (inMonth ? '' : ' is-out') + (isToday ? ' is-today' : '')} onClick={(e) => onPickDay(day, e)}>
              <span className="tc-month-dn">{day.getDate()}</span>
              {(dayTrips.length > 0 || dayEvents.length > 0) && (
                <span className="tc-month-mini">
                  {dayTrips.slice(0, 2).map((t) => (
                    <span key={t.id} className="tc-month-chip" style={{ borderLeft: '3px solid var(--' + tcTone(tripCriticality(t)) + ')' }}
                      onClick={(e) => { e.stopPropagation(); onOpen(t); }}>{t.routeLabel}</span>
                  ))}
                  {dayEvents.slice(0, 3).map((ev) => <CalEventChip key={ev.id} evt={ev} onOpen={onOpenEvent} />)}
                  {(dayTrips.length + dayEvents.length) > 5 && (
                    <span role="button" tabIndex={0} className="tc-month-more" title="Показать все события дня"
                      onClick={(e) => { e.stopPropagation(); onOpenDay(day, e, dayTrips, dayEvents); }}>
                      +{dayTrips.length + dayEvents.length - 5}
                    </span>
                  )}
                </span>
              )}
              {dayTrips.length > 0 && crit !== 'info' && <span className="tc-month-dot"><CritDot crit={crit} size={7} /></span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}


function TimelineView({ anchor, trips, onOpen }) {
  const start = tcWeekStart(anchor);
  const days = Array.from({ length: 7 }, (_, i) => tcAddDays(start, i));
  const rangeStart = start, rangeEnd = tcAddDays(start, 7);
  const totalMs = rangeEnd - rangeStart;
  const pct = (d) => Math.max(0, Math.min(100, ((d - rangeStart) / totalMs) * 100));
  const nowPct = pct(TRIP_NOW);
  const rows = trips.filter((t) => t.start < rangeEnd && t.end >= rangeStart);
  return (
    <div className="tc-timeline">
      <div className="tc-tl-axis">
        <div className="tc-tl-rowlabel" />
        <div className="tc-tl-track">
          {days.map((d) => <div key={d.toISOString()} className={'tc-tl-daycol' + (trSameDay(d, TRIP_NOW) ? ' is-today' : '')}><span>{TC_WEEKDAYS[(d.getDay() + 6) % 7]} {d.getDate()}</span></div>)}
        </div>
      </div>
      <div className="tc-tl-body">
        {TRIP_NOW >= rangeStart && TRIP_NOW < rangeEnd && <div className="tc-tl-now" style={{ left: 'calc(180px + (100% - 180px) * ' + nowPct / 100 + ')' }} title="Сейчас" />}
        {rows.length === 0 && <DashDetailEmptyLite title="На этой неделе поездок нет" />}
        {rows.map((t) => {
          const crit = tripCriticality(t);
          const l = pct(t.start < rangeStart ? rangeStart : t.start);
          const r = pct(t.end > rangeEnd ? rangeEnd : t.end);
          const events = tripEvents(t).filter((e) => e.at >= rangeStart && e.at < rangeEnd);
          return (
            <div key={t.id} className="tc-tl-row">
              <div className="tc-tl-rowlabel" title={t.routeLabel}>
                <CritDot crit={crit} />
                <span className="tc-tl-rl-main">{t.routeLabel}<span className="tc-tl-rl-sub">{t.client}</span></span>
              </div>
              <div className="tc-tl-track">
                {days.map((d, i) => <div key={i} className={'tc-tl-daycol' + (trSameDay(d, TRIP_NOW) ? ' is-today' : '')} />)}
                <button type="button" className={'tc-tl-bar tone-' + tcTone(crit)} style={{ left: l + '%', width: Math.max(2, r - l) + '%' }} onClick={() => onOpen(t)}>
                  <span className="tc-tl-bar-lbl">{t.services.map((s) => s.kind === 'Гостиница' ? '🏨' : '').join('')}{trDay(t.start)}–{trDay(t.end)}</span>
                </button>
                {events.map((e, i) => <span key={i} className="tc-tl-ev" style={{ left: pct(e.at) + '%', background: 'var(--' + tcTone(e.crit) + ')' }} title={e.label + ' · ' + trTime(e.at)} />)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


function ControlCenter({ trips, onOpen }) {
  const feed = controlCenterFeed(trips, TRIP_NOW, 8);
  const cross = crossTripConflicts(trips);
  return (
    <div className="tc-control">
      <div className="tc-control-head">
        <Icon name="alertCircle" style={{ width: 18, height: 18, color: 'var(--blue)' }} />
        <span>Требуют внимания в ближайшие часы — оператору не нужно просматривать календарь вручную.</span>
      </div>
      {feed.length === 0 && cross.length === 0 && <DashDetailEmptyLite title="В ближайшие часы событий, требующих внимания, нет" />}
      <div className="tc-control-list">
        {feed.map((e, i) => (
          <button key={i} type="button" className={'tc-control-row tone-' + tcTone(e.crit)} onClick={() => onOpen(e.trip)}>
            <span className="tc-control-when">{e.when}</span>
            <span className="tc-control-ic" style={{ background: 'var(--' + tcTone(e.crit) + ')' }}><Icon name={e.icon} style={{ width: 16, height: 16 }} /></span>
            <span className="tc-control-main">
              <b>{e.label}</b>
              <span className="tc-control-sub">{e.trip.routeLabel} · {e.trip.client} · оператор {e.trip.operator}</span>
            </span>
            <Pill tone={tcTone(e.crit)}>{tcCrit(e.crit).label}</Pill>
            <span className="tc-control-time">{trTime(e.at)}</span>
          </button>
        ))}
        {cross.map((c, i) => (
          <button key={'x' + i} type="button" className="tc-control-row tone-amber" onClick={() => onOpen(c.a)}>
            <span className="tc-control-when">конфликт</span>
            <span className="tc-control-ic" style={{ background: 'var(--amber)' }}><Icon name="alertTriangle" style={{ width: 16, height: 16 }} /></span>
            <span className="tc-control-main"><b>Пересечение поездок</b><span className="tc-control-sub">{c.text}</span></span>
            <Pill tone="amber">Высокий</Pill><span className="tc-control-time" />
          </button>
        ))}
      </div>
    </div>
  );
}


function TripDetailPanel({ trip, onClose, onOpenOrder }) {
  const toast = useToast();
  const [cardFor, setCardFor] = useState(null);
  const [actionBusy, setActionBusy] = useState('');
  if (!trip) return null;
  const events = tripEvents(trip);
  const conflicts = tripConflicts(trip);
  const fms = tripForceMajeures(trip);
  const crit = tripCriticality(trip);

  const timeline = trip.services.slice().sort((a, b) => a.start - b.start);


  const svcToItem = (s) => ({
    id: (trip.id + '-' + s.kind + '-' + (s.title || '')).replace(/[^0-9A-Za-zА-Яа-я]+/g, '_'),
    order: trip.orderNo, client: trip.client, title: s.title, sub: s.sub, tags: [], status: s.status,
    supplier: s.supplier, currency: s.currency || (s.kind === 'Аэроэкспресс' ? 'RUB' : 'USD'),
    details: { route: (s.from && s.to) ? (s.from + ' → ' + s.to) : (s.title || '') },
    info: [
      { l: 'Маршрут', v: (s.from && s.to) ? (s.from + ' → ' + s.to) : (s.title || '') },
      { l: 'Дата', v: trDayTime(s.start) },
      { l: 'Поставщик', v: s.supplier },
      { l: 'Пассажиров', v: s.pax },
    ].filter((r) => r.v != null && r.v !== ''),
  });


  const scenarioFor = (s) => {
    const replace = ['Авиа', 'ЖД', 'Гостиница', 'Трансфер'].includes(s.kind) ? 'service_unavailable' : 'cancellation';
    const fm = fms.find((f) => f.service === s.title);
    if (fm) {
      if (fm.type === 'flight_cancel' || fm.type === 'hotel_cancel') return 'cancellation';
      if (fm.type === 'flight_delay' || fm.type === 'dep_time_change') return s.kind === 'Гостиница' ? replace : 'delay';
      return replace;
    }
    if (s.delayed) return s.kind === 'Гостиница' ? replace : 'delay';
    return replace;
  };
  const openCard = (s) => setCardFor({ item: svcToItem(s), kind: s.kind, scenario: scenarioFor(s) });
  const affectedService = () => (fms[0] && trip.services.find((s) => s.title === fms[0].service)) || trip.services.find((s) => s.delayed) || trip.services[0];
  const paxObjs = (trip.paxNames || []).filter((n) => !/^…/.test(n)).map((n) => ({ name: n }));
  const performTripAction = async (action, success) => {
    setActionBusy(action);
    try {
      await workspaceActionsApi.execute(action, {
        resourceType: 'trip', resourceId: String(trip.serverId || trip.id),
        payload: { order_number: trip.orderNo, route: trip.routeLabel, client: trip.client },
      });
      toast(success, 'ok');
    } catch (error) { toast(error.message, 'err'); }
    finally { setActionBusy(''); }
  };
  return (
    <>
    <Drawer open={!!trip} onClose={onClose} width="min(560px,96vw)"
      title={trip.routeLabel}
      sub={(trip.company && trip.company !== '—' ? trip.company + ' · ' : '') + trip.client + ' · ' + trDay(trip.start) + '–' + trDay(trip.end)}
      footer={<>
        <Button variant="ghost" icon="orders" onClick={() => { onClose(); onOpenOrder && onOpenOrder(trip.orderNo); }}>Открыть заказ №{trip.orderNo}</Button>
        <div style={{ flex: 1 }} />
        <Button variant="secondary" onClick={onClose}>Закрыть</Button>
      </>}>
      <div className="tc-panel">

        <div className="tc-panel-top">
          <Pill tone={ORDER_STATUS[trip.status] || 'gray'}>{trip.status}</Pill>
          {crit !== 'info' && <Pill tone={tcTone(crit)}>{tcCrit(crit).label}</Pill>}
          <span className="tc-panel-op"><Icon name="user" style={{ width: 14, height: 14 }} /> {trip.operator}</span>
          <span className="tc-panel-op"><Icon name="users" style={{ width: 14, height: 14 }} /> {trip.group ? 'группа ' + trip.group.bookings : trip.pax + ' пасс.'}</span>
        </div>


        {fms.length > 0 && (
          <div className="tc-panel-sec tc-panel-fm">
            <div className="tc-panel-sec-h"><Icon name="alertCircle" style={{ width: 16, height: 16, color: 'var(--red)' }} />Форс-мажоры</div>
            {fms.map((f, i) => (
              <div key={i} className="tc-fm-row">
                <div className="tc-fm-top">
                  <span className="tc-fm-typeic" style={{ background: 'var(--' + tcTone(f.crit) + ')' }}><Icon name={f.icon} style={{ width: 13, height: 13 }} /></span>
                  <b>{f.event}</b><Pill tone={tcTone(f.crit)}>{tcCrit(f.crit).label}</Pill>
                </div>
                <div className="tc-fm-type">Вид форс-мажора: <b>{f.typeLabel}</b></div>
                {f.whatChanged && <div className="tc-fm-body">{f.whatChanged}</div>}
                <div className="tc-fm-meta">Услуга: {f.service} · получено {trDayTime(f.at)}{f.source ? ' · ' + f.source : ''}</div>
              </div>
            ))}
          </div>
        )}


        {conflicts.length > 0 && (
          <div className="tc-panel-sec tc-panel-conf">
            <div className="tc-panel-sec-h"><Icon name="alertTriangle" style={{ width: 16, height: 16, color: 'var(--amber)' }} />Конфликты и проверки</div>
            {conflicts.map((c, i) => (
              <div key={i} className="tc-conf-row"><CritDot crit={c.crit} /><span>{c.text}</span></div>
            ))}
          </div>
        )}


        {events.length > 0 && (
          <div className="tc-panel-sec">
            <div className="tc-panel-sec-h"><Icon name="clock" style={{ width: 16, height: 16, color: 'var(--blue)' }} />Ожидаемые события</div>
            {events.map((e, i) => (
              <div key={i} className="tc-ev-row">
                <span className="tc-ev-ic" style={{ background: 'var(--' + tcTone(e.crit) + ')' }}><Icon name={e.icon} style={{ width: 14, height: 14 }} /></span>
                <span className="tc-ev-main"><b>{e.label}</b><span className="tc-ev-sub">{trDayTime(e.at)} · {trHumanIn(e.at)}</span></span>
                <Pill tone={tcTone(e.crit)}>{tcCrit(e.crit).label}</Pill>
              </div>
            ))}
          </div>
        )}


        <div className="tc-panel-sec">
          <div className="tc-panel-sec-h"><Icon name="route" style={{ width: 16, height: 16, color: 'var(--blue)' }} />Маршрут и услуги</div>
          <div className="tc-svc-timeline">
            {timeline.map((s, i) => (
              <div key={i} className="tc-svc-item">
                <SvcGlyph kind={s.kind} size={34} />
                <div className="tc-svc-body">
                  <div className="tc-svc-title">{s.title} <Pill tone={ORDER_STATUS[s.status] || 'gray'}>{s.status}</Pill>
                    <button type="button" className="tc-svc-replace" onClick={() => openCard(s)} title="Подобрать замену и оформить"><Icon name="refund" style={{ width: 13, height: 13 }} />Заменить</button>
                  </div>
                  <div className="tc-svc-sub">{s.sub}</div>
                  <div className="tc-svc-meta">
                    <span><Icon name="calendar" style={{ width: 12, height: 12 }} /> {trDayTime(s.start)}{s.end && s.kind !== 'Трансфер' ? ' → ' + (trSameDay(s.start, s.end) ? trTime(s.end) : trDayTime(s.end)) : ''}</span>
                    <span><Icon name="api" style={{ width: 12, height: 12 }} /> {s.supplier}</span>
                    {!s.paid && <Pill tone="amber">Не оплачено</Pill>}
                    {!s.ticketed && <Pill tone="blue">Не выписано</Pill>}
                    {s.delayed && <Pill tone="red">Задержка</Pill>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>


        {trip.paxNames && trip.paxNames.length > 0 && (
          <div className="tc-panel-sec">
            <div className="tc-panel-sec-h"><Icon name="users" style={{ width: 16, height: 16, color: 'var(--blue)' }} />Пассажиры {trip.group ? '· группа ' + trip.group.bookings : '· ' + trip.pax}</div>
            <div className="tc-pax-list">
              {trip.paxNames.map((p, i) => <span key={i} className="tc-pax-chip"><Icon name="user" style={{ width: 12, height: 12 }} />{p}</span>)}
            </div>
            {trip.group && (
              <div className="tc-group-stats">
                <span>Бронирований: <b>{trip.group.bookings}</b></span>
                <span>Выписано: <b>{trip.group.issued}</b></span>
                <span className={trip.group.noSeat ? 'tc-gs-warn' : ''}>Без мест: <b>{trip.group.noSeat}</b></span>
              </div>
            )}
          </div>
        )}


        {trip.docs && trip.docs.length > 0 && (
          <div className="tc-panel-sec">
            <div className="tc-panel-sec-h"><Icon name="docs" style={{ width: 16, height: 16, color: 'var(--blue)' }} />Документы</div>
            {trip.docs.map((d, i) => (
              <div key={i} className="tc-doc-row"><Icon name="docs" style={{ width: 14, height: 14, color: 'var(--muted)' }} /><span>{d.name}</span><span className="tc-doc-status">{d.status}</span></div>
            ))}
          </div>
        )}


        <div className="tc-panel-sec">
          <div className="tc-panel-sec-h"><Icon name="clipboard" style={{ width: 16, height: 16, color: 'var(--blue)' }} />Действия оператора</div>
          <div className="tc-action-hint">Подбор альтернатив (авто/вручную), карточка предложения, сборка КП и отправка клиенту — в одном окне.</div>
          <div className="tc-actions">
            <Button size="sm" icon="refund" onClick={() => openCard(affectedService())}>Подобрать альтернативу и оформить</Button>
            <Button size="sm" variant="secondary" icon="chat" disabled={!!actionBusy} onClick={() => performTripAction('travel.notify_client', 'Уведомление клиенту поставлено на отправку')}>Уведомить клиента</Button>
            <Button size="sm" variant="secondary" icon="users" disabled={!!actionBusy} onClick={() => performTripAction('travel.delegate', 'Поездка передана на делегирование')}>Делегировать</Button>
            <Button size="sm" variant="secondary" icon="check" disabled={!!actionBusy} onClick={() => performTripAction('travel.processed', 'Поездка отмечена обработанной')}>Отметить обработанным</Button>
          </div>
        </div>
      </div>
    </Drawer>
    {cardFor && (
      <ServiceCardSendPanel item={cardFor.item} kind={cardFor.kind} participants={paxObjs}
        orderNo={trip.orderNo} currency={cardFor.item.currency} serviceId={cardFor.item.id}
        initialScenario={cardFor.scenario}
        onSent={() => { setCardFor(null); toast('Карточка предложения отправлена клиенту', 'ok'); }}
        onClose={() => setCardFor(null)} />
    )}
    </>
  );
}


function DashDetailEmptyLite({ title }) {
  return <div className="tc-empty"><Icon name="calendar" style={{ width: 30, height: 30, color: 'var(--muted-2)' }} /><div>{title}</div></div>;
}


function TripCalendarPage({ role, feed, orders = [], clients = [], companies = [], users = [], onOpenOrder }) {
  const sourceTrips = Array.isArray(feed?.trips) ? feed.trips.map((item) => {
    const order = orders.find((entry) => entry.id === item.order);
    return {
      ...item, id: item.id, orderNo: item.order_number, client: order?.client || '—', company: order?.client || '—',
      operator: order?.operator || '—', status: item.status, routeLabel: item.title,
      start: new Date(item.starts_at), end: new Date(item.ends_at || item.starts_at), criticality: item.criticality || 'info',
      isGroup: order?.requestType === 'Групповая', pax: 0, paxNames: [], services: [], fm: [], docs: [],
    };
  }) : TRIPS;
  const calendarNow = sourceTrips[0]?.start || new Date();
  const [view, setView] = useState('day');
  const [control, setControl] = useState(false);
  const [anchor, setAnchor] = useState(new Date(calendarNow));
  const [dateFrom, setDateFrom] = useState(new Date(calendarNow));
  const [dateTo, setDateTo] = useState(new Date(calendarNow));
  useEffect(() => {
    if (!feed?.trips?.length) return;
    const first = new Date(feed.trips[0].starts_at);
    setAnchor(first); setDateFrom(first); setDateTo(first);
  }, [feed]);
  useEffect(() => {
    window.CALENDAR_ORDERS = orders;
    hydrateCalendarEvents(feed?.events || [], orders, users);
    setEvtTick((value) => value + 1);
  }, [feed?.events, orders, users]);
  const [sel, setSel] = useState(null);
  const [dayMenu, setDayMenu] = useState(null);
  const [creator, setCreator] = useState(null);
  const [evtSel, setEvtSel] = useState(null);
  const [evtTick, setEvtTick] = useState(0);
  const [dayList, setDayList] = useState(null);
  const [f, setF] = useState({ scope: 'all', operator: '', company: '', client: '', kind: '', supplier: '', status: '', onlyFm: false, onlyConflict: false, onlyUnpaid: false, onlyToday: false });
  const openDayMenu = (day, e) => setDayMenu({ day, pos: { x: (e && e.clientX) || 200, y: (e && e.clientY) || 200 } });
  const openDayList = (day, e, dayTrips, dayEvents) => setDayList({ day, pos: { x: (e && e.clientX) || 200, y: (e && e.clientY) || 200 }, trips: dayTrips, events: dayEvents });
  const sets = tripFilterSets(sourceTrips);
  const me = (typeof CURRENT_USER !== 'undefined' && CURRENT_USER.name) || 'Даниель';

  const trips = sourceTrips.filter((t) => {
    if (f.scope === 'my' && t.operator !== me && !me.startsWith(t.operator) && !t.operator.startsWith(me.split(' ')[0])) return false;
    if (f.operator && t.operator !== f.operator) return false;
    if (f.company && t.company !== f.company) return false;
    if (f.client && t.client !== f.client) return false;
    if (f.kind && !t.services.some((s) => s.kind === f.kind)) return false;
    if (f.supplier && !t.services.some((s) => s.supplier === f.supplier)) return false;
    if (f.status && t.status !== f.status) return false;
    if (f.onlyFm && tripForceMajeures(t).length === 0) return false;
    if (f.onlyConflict && tripConflicts(t).length === 0) return false;
    if (f.onlyUnpaid && !tripUnpaid(t)) return false;
    if (f.onlyToday && !tcTripActiveOn(t, calendarNow)) return false;
    if (!tcTripActiveInRange(t, dateFrom, dateTo)) return false;
    return true;
  });

  const VIEWS = [['day', 'День'], ['month', 'Месяц']];
  const shift = (dir) => {
    if (view === 'month') {
      const next = new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1);
      const last = new Date(next.getFullYear(), next.getMonth() + 1, 0);
      setAnchor(next); setDateFrom(next); setDateTo(last);
    } else {
      const next = tcAddDays(anchor, dir);
      setAnchor(next); setDateFrom(next); setDateTo(next);
    }
  };
  const setCalendarRange = (from, to) => {
    const start = from || to || new Date(calendarNow);
    setDateFrom(start);
    setDateTo(to || start);
    setAnchor(start);
  };
  const changeView = (nextView) => {
    setView(nextView);
    setControl(false);
    if (nextView === 'month') {
      const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
      const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
      setDateFrom(first);
      setDateTo(last);
      return;
    }
    setDateFrom(anchor);
    setDateTo(anchor);
  };
  const goToday = () => {
    const today = new Date(calendarNow);
    setAnchor(today); setDateFrom(today); setDateTo(today);
  };
  const rangeLabel = () => {
    if (view === 'month') return TC_MONTHS_NOM[anchor.getMonth()] + ' ' + anchor.getFullYear();
    return anchor.getDate() + ' ' + TC_MONTHS[anchor.getMonth()] + ' ' + anchor.getFullYear();
  };


  const counts = { fm: 0, conf: 0, unpaid: 0, crit: 0 };
  trips.forEach((t) => { if (tripForceMajeures(t).length) counts.fm++; if (tripConflicts(t).length) counts.conf++; if (tripUnpaid(t)) counts.unpaid++; if (tripCriticality(t) === 'critical') counts.crit++; });

  const toggle = (key) => setF((s) => ({ ...s, [key]: !s[key] }));
  const persistCalendarEvent = async (event) => {
    const kind = { order: 'order_trip', reminder: 'reminder', task: 'task', control: 'control' }[event.type] || event.type;
    let linkedOrder = orders.find((item) => item.no === event.order);
    if (event.type === 'order' && !linkedOrder) {
      const selectedName = event.form.contact || event.form.pax;
      const client = clients.find((item) => item.name === selectedName);
      const company = companies.find((item) => item.name === selectedName);
      if (!client && !company) throw new Error('Выберите клиента или существующий заказ');
      const createdOrder = await ordersApi.create({
        request_type: 'individual', client_person: client?.id || null, client_company: company?.id || null,
        planned_start: event.date.toISOString().slice(0, 10),
        planned_end: event.endStr ? event.endStr.split('.').reverse().join('-') : null,
        purpose: event.form.direction || 'Поездка из календаря', base_currency: 'USD', source: 'calendar',
      });
      linkedOrder = toUiOrder(createdOrder);
      window.__addOrder && window.__addOrder(linkedOrder);
    }
    const assignee = users.find((user) => (user.full_name || user.name) === event.resp);
    const priority = { 'Высокий': 'high', 'Средний': 'normal', 'Низкий': 'low' }[event.form?.priority || event.priority] || 'normal';
    const saved = await calendarApi.createEvent({
      kind, title: event.title || (linkedOrder ? `Заказ № ${linkedOrder.no}` : 'Событие календаря'),
      description: event.comment || '', starts_at: event.date.toISOString(),
      ends_at: event.endStr ? new Date(event.endStr.split('.').reverse().join('-') + 'T23:59:00').toISOString() : null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, order: linkedOrder?.id || null,
      assignee: assignee?.id || null, scope: event.scope === 'На весь заказ' ? 'tenant' : event.scope?.includes('Группе') ? 'team' : 'personal',
      priority, notification_method: event.form?.notify || event.notify || '', recurrence_rule: event.repeat === 'Не повторять' ? '' : event.repeat || '',
      criterion: event.criterion || '', action_on_problem: event.actionOnProblem || '',
    });
    return calendarEventToUi(saved, linkedOrder ? [linkedOrder, ...orders] : orders, users);
  };

  return (
    <>
      <Topbar title="Календарь поездок" sub="Единый оперативный центр контроля поездок">
        <div className="topbar-spacer" />
        <Button variant="secondary" icon="plus" onClick={(e) => openDayMenu(anchor, e)}>Создать событие</Button>
        <Button variant={control ? 'primary' : 'secondary'} icon="alertCircle" onClick={() => setControl((c) => !c)}>Центр контроля</Button>
      </Topbar>
      <div className="content fade-in tc-page">

        <div className="tc-toolbar">
          <div className="tc-viewseg">
            {VIEWS.map(([k, l]) => <button key={k} className={view === k ? 'on' : ''} onClick={() => changeView(k)}>{l}</button>)}
          </div>
          {!control && <>
            <div className="tc-nav">
              <button onClick={() => shift(-1)} title="Назад"><Icon name="chevLeft" /></button>
              <button className="tc-today-btn" onClick={goToday}>Сегодня</button>
              <button onClick={() => shift(1)} title="Вперёд"><Icon name="chevRight" /></button>
            </div>
            <div className="tc-date-range">
              <Icon name="calendar" />
              <DateRangeField startVal={dateFrom} endVal={dateTo} onChange={setCalendarRange} placeholder="Дата от — до" rangeStartLabel="До" />
            </div>
            <span className="tc-range">{rangeLabel()}</span>
          </>}
          <div style={{ flex: 1 }} />

          <div className="tc-summary">
            {counts.crit > 0 && <span className="tc-sum tone-red"><CritDot crit="critical" />{counts.crit} критич.</span>}
            {counts.fm > 0 && <span className="tc-sum tone-red"><Icon name="alertCircle" style={{ width: 13, height: 13 }} />{counts.fm} форс-мажор</span>}
            {counts.conf > 0 && <span className="tc-sum tone-amber"><Icon name="alertTriangle" style={{ width: 13, height: 13 }} />{counts.conf} конфликт</span>}
            <span className="tc-sum tone-blue"><Icon name="route" style={{ width: 13, height: 13 }} />{trips.length} поездок</span>
          </div>
        </div>


        <div className="tc-filters">
          <div className="tc-scope">
            <button className={f.scope === 'my' ? 'on' : ''} onClick={() => setF((s) => ({ ...s, scope: 'my' }))}>Мои поездки</button>
            <button className={f.scope === 'all' ? 'on' : ''} onClick={() => setF((s) => ({ ...s, scope: 'all' }))}>Все поездки</button>
          </div>
          <FilterChip label="Оператор" value={f.operator} options={sets.operators} onChange={(v) => setF((s) => ({ ...s, operator: v }))} />
          <FilterChip label="Компания" value={f.company} options={sets.companies} onChange={(v) => setF((s) => ({ ...s, company: v }))} />
          <FilterChip label="Клиент" value={f.client} options={sets.clients} onChange={(v) => setF((s) => ({ ...s, client: v }))} />
          <FilterChip label="Вид услуги" value={f.kind} options={sets.kinds} onChange={(v) => setF((s) => ({ ...s, kind: v }))} />
          <FilterChip label="Поставщик" value={f.supplier} options={sets.suppliers} onChange={(v) => setF((s) => ({ ...s, supplier: v }))} />
          <FilterChip label="Статус" value={f.status} options={sets.statuses} onChange={(v) => setF((s) => ({ ...s, status: v }))} />
          <div style={{ flexBasis: '100%', height: 0 }} />
          <button className={'tc-toggle' + (f.onlyFm ? ' on' : '')} onClick={() => toggle('onlyFm')}>Форс-мажоры</button>
          <button className={'tc-toggle' + (f.onlyConflict ? ' on' : '')} onClick={() => toggle('onlyConflict')}>Конфликты</button>
          <button className={'tc-toggle' + (f.onlyUnpaid ? ' on' : '')} onClick={() => toggle('onlyUnpaid')}>Неоплаченные</button>
          <button className={'tc-toggle' + (f.onlyToday ? ' on' : '')} onClick={() => toggle('onlyToday')}>Сегодня</button>
        </div>


        <div className="tc-viewport">
          {control ? <ControlCenter trips={trips} onOpen={setSel} />
            : view === 'month' ? <MonthView anchor={anchor} trips={trips} onOpen={setSel} onPickDay={openDayMenu} onOpenEvent={setEvtSel} onOpenDay={openDayList} evtTick={evtTick} />
            : <DayView anchor={anchor} trips={trips} onOpen={setSel} onPickDay={openDayMenu} onOpenEvent={setEvtSel} evtTick={evtTick} />}
        </div>
      </div>
      <TripDetailPanel trip={sel} onClose={() => setSel(null)} onOpenOrder={onOpenOrder} />
      {dayMenu && <CalDayMenu day={dayMenu.day} pos={dayMenu.pos} onClose={() => setDayMenu(null)}
        onPick={(type) => { setCreator({ type, day: dayMenu.day }); setDayMenu(null); }} />}
      {dayList && <DayListPopover day={dayList.day} pos={dayList.pos} trips={dayList.trips} events={dayList.events}
        onClose={() => setDayList(null)}
        onOpenTrip={(t) => { setDayList(null); setSel(t); }}
        onOpenEvent={(ev) => { setDayList(null); setEvtSel(ev); }}
        onOpenDayView={() => { setAnchor(new Date(dayList.day)); setView('day'); setControl(false); setDayList(null); }} />}
      {creator && <CalEventCreator type={creator.type} day={creator.day} orders={orders} clients={clients} users={users} onPersist={persistCalendarEvent} onClose={() => setCreator(null)}
        onCreated={(ev) => { setEvtTick((t) => t + 1); setEvtSel(ev); }} />}
      {evtSel && <CalEventPanel evt={evtSel} onClose={() => setEvtSel(null)} onChanged={() => setEvtTick((t) => t + 1)} onOpenOrder={onOpenOrder}
        onComplete={(event) => calendarApi.complete(event.id)}
        onReschedule={(event, next) => calendarApi.reschedule(event.id, { starts_at: next.toISOString() })} />}
    </>
  );
}

Object.assign(window, { TripCalendarPage });



export { TC_WEEKDAYS, TC_MONTHS, TC_MONTHS_NOM, tcWeekStart, tcAddDays, tcTripActiveOn, tcTone, CritDot, SvcGlyph, TripCard, WeekView, DayView, MonthView, TimelineView, ControlCenter, TripDetailPanel, DashDetailEmptyLite, TripCalendarPage };
