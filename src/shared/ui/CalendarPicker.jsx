import { useState, useEffect, useRef, useMemo } from 'react';
import { Icon } from '../icons/index.jsx';
import { Button } from './Button.jsx';
import { calendarMonths } from './calendar-months.js';
import { completeDateRange, parseCalendarDate, dateWithinBounds } from './date-range.js';

const CAL_MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

const CAL_DAYS  = ['ПН','ВТ','СР','ЧТ','ПТ','СБ','ВС'];

function fmtDate(d) {
  if (!d || !(d instanceof Date) || Number.isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getFullYear()).slice(2)}`;
}

function sameDayEq(a, b) {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function CalendarPicker({ mode = 'range', startVal = null, endVal = null, onConfirm, onClose, autoConfirm = false, rangeStartLabel = 'Далее', minDate = null, maxDate = null, requireComplete = false, allowSameDay = false }) {
  const now = new Date();
  const minimum = parseCalendarDate(minDate);
  const maximum = parseCalendarDate(maxDate);
  const valid = (date) => dateWithinBounds(date, minimum, maximum);
  const initial = parseCalendarDate(startVal) || now;
  const base = minimum && initial < minimum ? minimum : maximum && initial > maximum ? maximum : initial;
  const [view, setView] = useState('days');
  const [yearPage, setYearPage] = useState(Math.max(minimum?.getFullYear() ?? -Infinity, Math.floor(base.getFullYear() / 12) * 12));
  const [month, setMonth] = useState(base.getMonth());
  const [year, setYear] = useState(base.getFullYear());
  const [selS, setSelS] = useState(valid(startVal) ? parseCalendarDate(startVal) : null);
  const [selE, setSelE] = useState(valid(endVal) && valid(startVal) ? parseCalendarDate(endVal) : null);
  const [hover, setHover] = useState(null);
  const [phase, setPhase] = useState(mode === 'range' && valid(startVal) && !valid(endVal) ? 'end' : 'start');
  const [visibleMonths, setVisibleMonths] = useState(2);
  const monthsRef = useRef(null);

  const prevMo = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMo = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };
  useEffect(() => {
    setVisibleMonths(2);
    setHover(null);
    if (monthsRef.current) monthsRef.current.scrollTop = 0;
  }, [month, year]);
  const months = useMemo(() => calendarMonths(year, month, mode === 'range' ? visibleMonths : 1), [year, month, mode, visibleMonths]);

  const effEnd = selE || (mode === 'range' && phase === 'end' && selS && hover ? hover : null);
  const rS = selS ? (effEnd && effEnd < selS ? effEnd : selS) : null;
  const rE = selS ? (effEnd && effEnd > selS ? effEnd : selS) : null;
  const handleClick = (d) => {
    if (!valid(d)) return;
    if (mode === 'single') {
      setSelS(new Date(d)); setSelE(null);
      if (autoConfirm) onConfirm(new Date(d));
      return;
    }
    if (phase === 'start' || !valid(selS)) {
      setSelS(new Date(d)); setSelE(null); setPhase('end');
    } else {
      if (requireComplete && !allowSameDay && sameDayEq(d, selS)) return;
      let s = selS, e = new Date(d);
      if (e < s) { const t = s; s = e; e = t; }
      setSelS(new Date(s)); setSelE(new Date(e)); setPhase('start');
      if (autoConfirm) onConfirm(new Date(s), new Date(e));
    }
  };
  const readableDate = (d) => d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  const periodText = selS ? (selE && mode === 'range' ? `${readableDate(selS)} — ${readableDate(selE)}` : readableDate(selS)) : '';
  const BG = 'var(--blue-soft)';
  const SOLO = sameDayEq(rS, rE);

  const monthAvailable = (y, m) => (!minimum || new Date(y, m + 1, 0) >= minimum) && (!maximum || new Date(y, m, 1) <= maximum);
  const yearAvailable = (y) => monthAvailable(y, 0) || monthAvailable(y, 11) || (minimum?.getFullYear() === y);
  const navigate = (delta) => {
    if (view === 'years') setYearPage((page) => page + delta * 12);
    else if (view === 'months') setYear((value) => value + delta);
    else if (delta < 0) prevMo();
    else nextMo();
  };
  const navigationAvailable = (delta) => view === 'years'
    ? (delta < 0 ? !minimum || yearPage > minimum.getFullYear() : !maximum || yearPage + 11 < maximum.getFullYear())
    : view === 'months' ? yearAvailable(year + delta) : monthAvailable(year, month + delta);
  const confirm = () => {
    if (!valid(selS) || (selE && !valid(selE))) return;
    if (requireComplete && !completeDateRange(selS, selE, { minDate, maxDate, allowSameDay })) return;
    onConfirm(selS, mode === 'range' ? selE : undefined);
  };
  return (
    <div className="calendar-picker" role="dialog" aria-label={mode === 'range' ? 'Выбор периода' : 'Выбор даты'}>
      <div className="calendar-picker-header">
        <button type="button" className="calendar-nav" aria-label={view === 'years' ? 'Предыдущие годы' : view === 'months' ? 'Предыдущий год' : 'Предыдущий месяц'} disabled={!navigationAvailable(-1)} onClick={() => navigate(-1)}><Icon name="chevLeft" /></button>
        <button type="button" className="calendar-period" aria-label="Выбрать месяц" aria-expanded={view === 'months'} onClick={() => setView((current) => current === 'months' ? 'days' : 'months')}>{CAL_MONTHS[month]}<Icon name="chevDown" /></button>
        <button type="button" className="calendar-period calendar-year" aria-label="Выбрать год" aria-expanded={view === 'years'} onClick={() => { setYearPage(Math.max(minimum?.getFullYear() ?? -Infinity, Math.floor(year / 12) * 12)); setView((current) => current === 'years' ? 'days' : 'years'); }}>{year}<Icon name="chevDown" /></button>
        <button type="button" className="calendar-nav" aria-label={view === 'years' ? 'Следующие годы' : view === 'months' ? 'Следующий год' : 'Следующий месяц'} disabled={!navigationAvailable(1)} onClick={() => navigate(1)}><Icon name="chevRight" /></button>
      </div>
      {view === 'months' && <div className="calendar-period-grid" role="group" aria-label="Месяцы">
        {CAL_MONTHS.map((name, index) => <button type="button" key={name} disabled={!monthAvailable(year, index)} aria-pressed={month === index} onClick={() => { setMonth(index); setView('days'); }}>{name}</button>)}
      </div>}
      {view === 'years' && <section className="calendar-years" aria-label="Годы">
        <div className="calendar-years-label">{yearPage} — {yearPage + 11}</div>
        <div className="calendar-period-grid">{Array.from({ length: 12 }, (_, index) => yearPage + index).map((value) => <button type="button" key={value} disabled={!yearAvailable(value)} aria-pressed={year === value} onClick={() => {
          setYear(value);
          if (!monthAvailable(value, month)) setMonth(minimum?.getFullYear() === value ? minimum.getMonth() : maximum.getMonth());
          setView('days');
        }}>{value}</button>)}</div>
      </section>}
      {view === 'days' && <>
      {mode === 'range' && <div style={{ flexShrink: 0, fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>Прокрутите вниз для выбора следующего месяца</div>}
      <div ref={monthsRef} className="calendar-months scroll" tabIndex={0} role="region" aria-label="Месяцы календаря"
        onMouseLeave={() => { if (hover) setHover(null); }}
        style={{ overflowY: 'auto', minHeight: 0, maxHeight: 330, overscrollBehavior: 'contain', touchAction: 'pan-y', scrollbarGutter: 'stable' }}>
        {months.map(({ year: shownYear, month: shownMonth, cells }) => (
          <section key={`${shownYear}-${shownMonth}`} aria-label={`${CAL_MONTHS[shownMonth]} ${shownYear}`} style={{ paddingBottom: 12 }}>
            <div style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--surface)', paddingTop: 2 }}>
            <h3 style={{ margin: '4px 0 10px', textAlign: 'center', fontSize: 15, color: 'var(--ink)' }}>{CAL_MONTHS[shownMonth]} {shownYear}</h3>
            <div aria-hidden="true" style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 2 }}>
              {CAL_DAYS.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: 'var(--blue)', padding: '3px 0 6px' }}>{d}</div>)}
            </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
              {cells.map((d, i) => {
                // Adjacent months have their own labelled section, never duplicate day numbers.
                if (!d) return <span key={i} aria-hidden="true" style={{ height: 38 }} />;
                const disabled = !valid(d);
                const isSt = rS && sameDayEq(d, rS);
                const isEn = rE && sameDayEq(d, rE);
                const inR = rS && rE && d > rS && d < rE;
                const isSel = mode === 'single' && selS && sameDayEq(d, selS);
                const circle = isSt || isEn || isSel;
                let cellBg = 'transparent';
                if (inR) cellBg = BG;
                else if (isSt && !SOLO) cellBg = `linear-gradient(to right, transparent 50%, ${BG} 50%)`;
                else if (isEn && !SOLO) cellBg = `linear-gradient(to left, transparent 50%, ${BG} 50%)`;
                return <button type="button" key={i} disabled={disabled} aria-label={readableDate(d)} aria-pressed={Boolean(circle || inR)}
                  onClick={() => handleClick(d)}
                  onMouseEnter={() => { if (!disabled && mode === 'range' && phase === 'end' && selS && !sameDayEq(hover, d)) setHover(new Date(d)); }}
                  style={{ border: 'none', padding: 0, fontFamily: 'inherit', height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', background: cellBg, cursor: disabled ? 'default' : 'pointer' }}>
                  <span style={{ width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: circle ? 'var(--blue)' : 'transparent', color: circle ? '#fff' : (disabled ? 'var(--faint)' : 'var(--ink)'), fontWeight: circle ? 700 : 400, fontSize: 14 }}>{d.getDate()}</span>
                </button>;
              })}
            </div>
          </section>
        ))}
        {mode === 'range' && (!maximum || months.at(-1).cells.filter(Boolean).at(-1) < maximum) && <button type="button" onClick={() => setVisibleMonths((count) => count + 2)}
          style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 8, padding: 10, background: 'var(--surface)', color: 'var(--blue)', cursor: 'pointer', fontFamily: 'inherit' }}>Показать ещё месяцы</button>}
      </div>
      <div style={{ flexShrink: 0, textAlign: 'center', fontSize: 13, color: 'var(--muted)', margin: '10px 0', minHeight: 18 }} aria-live="polite">
        {mode === 'range' && !selE ? (selS ? (requireComplete && !allowSameDay ? 'Выберите дату выезда' : 'Выберите конец периода') : (requireComplete && !allowSameDay ? 'Выберите дату заезда' : 'Выберите начало периода')) : periodText ? (mode === 'range' ? `Выбранный период: ${periodText}` : periodText) : 'Выберите дату'}
        {mode === 'range' && selS && !selE && <div>Начало: {readableDate(selS)}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>
        <Button variant="primary" style={{ width: '100%', marginBottom: 6 }}
          onClick={confirm}
          disabled={!valid(selS) || Boolean(selE && !valid(selE)) || (requireComplete && !completeDateRange(selS, selE, { minDate, maxDate, allowSameDay }))}>
          {mode === 'range' && selS && !selE ? rangeStartLabel : 'Далее'}
        </Button>
      </div>
      </>}
      <div className="calendar-close">
        <button type="button" onClick={onClose} style={{ width: '100%', border: 'none', background: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 14, padding: '5px 0', fontFamily: 'inherit' }}>Закрыть</button>
      </div>
    </div>
  );
}


export { CAL_MONTHS, CAL_DAYS, fmtDate, sameDayEq, CalendarPicker };
