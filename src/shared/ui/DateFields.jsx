import { completeDateRange, localDay } from './date-range.js';
import { useState, useEffect, useRef, useMemo } from 'react';
import { calendarMonths } from './calendar-months.js';
import ReactDOM from 'react-dom';
import { Icon } from '../icons/index.jsx';
import { useToast, ToastProvider } from './Toast.jsx';
import { Button } from './Button.jsx';
import { Pill, TimeLimitBadge } from './Pill.jsx';
import { plural } from './plural.js';
import { Toggle } from './Toggle.jsx';
import { Checkbox } from './Checkbox.jsx';
import { Radio } from './Radio.jsx';
import { Field } from './Field.jsx';
import { LocationAutocomplete, Input } from './Input.jsx';
import { Select } from './Select.jsx';
import { SearchBox } from './SearchBox.jsx';
import { Combobox } from './Combobox.jsx';
import { Avatar } from './Avatar.jsx';
import { isPrintGuardActive, holdOverlaysDuringPrint, printOverlayScope, Modal, ModalHeader, Drawer, ConfirmDialog } from './Overlays.jsx';
import { Tabs } from './Tabs.jsx';
import { FilterChip } from './FilterChip.jsx';
import { Pagination } from './Pagination.jsx';
import { Th, useSort } from './Table.jsx';
import { EmptyState, SkeletonRows } from './EmptyState.jsx';
import { ActionMenu } from './ActionMenu.jsx';

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

function CalendarPicker({ mode = 'range', startVal = null, endVal = null, onConfirm, onClose, autoConfirm = false, rangeStartLabel = 'Далее', minDate = null, requireComplete = false, allowSameDay = false }) {
  const now = new Date();
  const minimum = localDay(minDate);
  const [month, setMonth] = useState(startVal ? startVal.getMonth() : now.getMonth());
  const [year, setYear] = useState(startVal ? startVal.getFullYear() : now.getFullYear());
  const [selS, setSelS] = useState(startVal);
  const [selE, setSelE] = useState(endVal);
  const [hover, setHover] = useState(null);
  const [phase, setPhase] = useState(mode === 'range' && startVal && !endVal ? 'end' : 'start');
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
    if (minimum && d < minimum) return;
    if (mode === 'single') {
      setSelS(new Date(d)); setSelE(null);
      if (autoConfirm) onConfirm(new Date(d));
      return;
    }
    if (phase === 'start' || !selS) {
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

  return (
    <div role="dialog" aria-label={mode === 'range' ? 'Выбор периода' : 'Выбор даты'} style={{ background: 'var(--surface)', borderRadius: 20, padding: '18px 14px 12px', boxShadow: 'var(--shadow-pop)', width: 'min(320px, calc(100vw - 16px))', maxHeight: 'calc(100dvh - 16px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', userSelect: 'none', border: '1px solid var(--line)' }}>
      <div style={{ display: 'flex', flexShrink: 0, alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button type="button" aria-label="Предыдущий месяц" onClick={prevMo} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--blue)', padding: 6, borderRadius: 8, display: 'flex' }}>
          <Icon name="chevLeft" style={{ width: 20, height: 20 }} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, minWidth: 0 }}>
          <select aria-label="Месяц" value={month} onChange={(e) => setMonth(Number(e.target.value))}
            style={{ border: '1px solid var(--line)', borderRadius: 9, background: 'var(--surface)', color: 'var(--ink)', fontWeight: 700, fontSize: 14, padding: '6px 8px', minWidth: 0, cursor: 'pointer', fontFamily: 'inherit' }}>
            {CAL_MONTHS.map((name, index) => <option key={name} value={index}>{name}</option>)}
          </select>
          <select aria-label="Год" value={year} onChange={(e) => setYear(Number(e.target.value))}
            style={{ border: '1px solid var(--line)', borderRadius: 9, background: 'var(--surface)', color: 'var(--ink)', fontWeight: 800, fontSize: 14, padding: '6px 8px', cursor: 'pointer', fontFamily: 'inherit' }}>
            {Array.from(new Set([...Array.from({ length: 101 }, (_, i) => now.getFullYear() - 80 + i), year]))
              .sort((a, b) => a - b)
              .map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </div>
        <button type="button" aria-label="Следующий месяц" onClick={nextMo} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--blue)', padding: 6, borderRadius: 8, display: 'flex' }}>
          <Icon name="chevRight" style={{ width: 20, height: 20 }} />
        </button>
      </div>
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
                const disabled = Boolean(minimum && d < minimum);
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
        {mode === 'range' && <button type="button" onClick={() => setVisibleMonths((count) => count + 2)}
          style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 8, padding: 10, background: 'var(--surface)', color: 'var(--blue)', cursor: 'pointer', fontFamily: 'inherit' }}>Показать ещё месяцы</button>}
      </div>
      <div style={{ flexShrink: 0, textAlign: 'center', fontSize: 13, color: 'var(--muted)', margin: '10px 0', minHeight: 18 }} aria-live="polite">
        {mode === 'range' && !selE ? (selS ? (requireComplete && !allowSameDay ? 'Выберите дату выезда' : 'Выберите конец периода') : (requireComplete && !allowSameDay ? 'Выберите дату заезда' : 'Выберите начало периода')) : periodText ? (mode === 'range' ? `Выбранный период: ${periodText}` : periodText) : 'Выберите дату'}
        {mode === 'range' && selS && !selE && <div>Начало: {readableDate(selS)}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>
        <Button variant="primary" style={{ width: '100%', marginBottom: 6 }}
          onClick={() => { if (!selS) return; const onlyStart = mode === 'range' && !selE; onlyStart ? onConfirm(selS, null) : onConfirm(selS, mode === 'range' ? selE : undefined); }}
          disabled={!selS || Boolean(minimum && selS < minimum) || (requireComplete && !completeDateRange(selS, selE, { minDate, allowSameDay }))}>
          {mode === 'range' && selS && !selE ? rangeStartLabel : 'Далее'}
        </Button>
        <button type="button" onClick={onClose} style={{ width: '100%', border: 'none', background: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 14, padding: '5px 0', fontFamily: 'inherit' }}>Закрыть</button>
      </div>
    </div>
  );
}

function DateField({ label, value, onChange, placeholder = 'Выбрать дату', required, error, style, autoConfirm = true }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => {
      if (!ref.current) return;

      const portal = document.getElementById('__cal_portal__');
      if (ref.current.contains(e.target) || (portal && portal.contains(e.target))) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const toggle = () => {
    if (!open && ref.current) {
      const r = ref.current.getBoundingClientRect();


      const calH = 580, calW = 320, vh = window.innerHeight;
      let top = r.bottom + 6;
      if (top + calH > vh - 8) {
        const above = r.top - calH - 6;
        top = above >= 8 ? above : Math.max(8, vh - calH - 8);
      }
      const left = Math.max(8, Math.min(r.left, window.innerWidth - calW - 8));
      setPos({ top, left });
    }
    setOpen(o => !o);
  };
  return (
    <div ref={ref} style={{ position: 'relative', ...style }}>
      {label && <label className="label" style={{ display: 'block', marginBottom: 7 }}>{label}{required && <span className="req"> *</span>}</label>}
      <div className={'input' + (error ? ' err' : '')}
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
        onClick={toggle}>
        <Icon name="calendar" style={{ width: 18, height: 18, color: 'var(--muted-2)', flexShrink: 0 }} />
        <span style={{ color: value ? 'var(--ink)' : 'var(--faint)', fontSize: 15, flex: 1 }}>
          {value ? fmtDate(value) : placeholder}
        </span>
      </div>
      {error && <div className="err-text"><Icon name="alertCircle" style={{ width: 14, height: 14 }} />{error}</div>}
      {open && ReactDOM.createPortal(
        <div id="__cal_portal__" style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}>
          <CalendarPicker mode="single" startVal={value || null} autoConfirm={autoConfirm}
            onConfirm={(d) => { onChange(d); setOpen(false); }}
            onClose={() => setOpen(false)} />
        </div>,
        document.body
      )}
    </div>
  );
}

function DateRangeField({ label, startVal, endVal, onChange, placeholder = 'Выбрать период', style, autoConfirm = true, rangeStartLabel = 'Далее', minDate = null, requireComplete = false, allowSameDay = false, error = false }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => {
      if (!ref.current) return;
      const portal = document.getElementById('__calr_portal__');
      if (ref.current.contains(e.target) || (portal && portal.contains(e.target))) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const toggle = () => {
    if (!open && ref.current) {
      const r = ref.current.getBoundingClientRect();


      const calH = 580, calW = 320, vh = window.innerHeight;
      let top = r.bottom + 6;
      if (top + calH > vh - 8) {
        const above = r.top - calH - 6;
        top = above >= 8 ? above : Math.max(8, vh - calH - 8);
      }
      const left = Math.max(8, Math.min(r.left, window.innerWidth - calW - 8));
      setPos({ top, left });
    }
    setOpen(o => !o);
  };
  const display = startVal
    ? (endVal ? `${fmtDate(startVal)} — ${fmtDate(endVal)}` : fmtDate(startVal))
    : '';
  return (
    <div ref={ref} style={{ position: 'relative', ...style }}>
      {label && <label className="label" style={{ display: 'block', marginBottom: 7 }}>{label}</label>}
      <button type="button" aria-label={label || placeholder} aria-expanded={open} aria-invalid={Boolean(error)} className={'input' + (error ? ' err' : '')}
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}
        onClick={toggle}>
        <Icon name="calendar" style={{ width: 18, height: 18, color: 'var(--muted-2)', flexShrink: 0 }} />
        <span style={{ color: display ? 'var(--ink)' : 'var(--faint)', fontSize: 15, flex: 1 }}>
          {display || placeholder}
        </span>
      </button>
      {open && ReactDOM.createPortal(
        <div id="__calr_portal__" style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}>
          <CalendarPicker mode="range" startVal={startVal || null} endVal={endVal || null}
            autoConfirm={autoConfirm} rangeStartLabel={rangeStartLabel} minDate={minDate} requireComplete={requireComplete} allowSameDay={allowSameDay}
            onConfirm={(s, e) => { onChange(s, e); setOpen(false); }}
            onClose={() => setOpen(false)} />
        </div>,
        document.body
      )}
    </div>
  );
}

// Travel searches require a complete, future range; same-day return is valid.
function TripDateRangeField(props) {
  const today = localDay(new Date());
  return <DateRangeField placeholder="Туда — обратно" {...props} minDate={today} requireComplete allowSameDay />;
}

// Шаблонизированный выбор времени: только выбор из списка (часы + минуты), без произвольного ввода.
function TimeField({ label, value, onChange, placeholder = 'чч:мм', required, error, style, minuteStep = 5 }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef(null);
  const hourRef = useRef(null);
  const minRef = useRef(null);
  const m = String(value || '').match(/^(\d{1,2}):(\d{1,2})$/);
  const hour = m ? Math.max(0, Math.min(23, parseInt(m[1], 10))) : null;
  const minute = m ? Math.max(0, Math.min(59, parseInt(m[2], 10))) : null;
  const pad = (n) => String(n).padStart(2, '0');
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: Math.ceil(60 / minuteStep) }, (_, i) => i * minuteStep);
  useEffect(() => {
    const h = (e) => {
      if (!ref.current) return;
      const portal = document.getElementById('__time_portal__');
      if (ref.current.contains(e.target) || (portal && portal.contains(e.target))) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      [hourRef.current, minRef.current].forEach((el) => {
        if (el) { const sel = el.querySelector('[data-sel="1"]'); if (sel) sel.scrollIntoView({ block: 'center' }); }
      });
    }, 0);
    return () => clearTimeout(t);
  }, [open]);
  const toggle = () => {
    if (!open && ref.current) {
      const r = ref.current.getBoundingClientRect();
      const boxH = 280, boxW = 232, vh = window.innerHeight;
      let top = r.bottom + 6;
      if (top + boxH > vh - 8) { const above = r.top - boxH - 6; top = above >= 8 ? above : Math.max(8, vh - boxH - 8); }
      setPos({ top, left: Math.max(8, Math.min(r.left, window.innerWidth - boxW - 8)) });
    }
    setOpen((o) => !o);
  };
  const emit = (h, mi) => { onChange && onChange(pad(h) + ':' + pad(mi)); };
  const col = { flex: 1, maxHeight: 210, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3, padding: '2px 6px' };
  const cell = (active) => ({ padding: '7px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14,
    fontWeight: active ? 800 : 600, background: active ? 'var(--blue)' : 'transparent', color: active ? '#fff' : 'var(--ink)', fontFamily: 'inherit' });
  return (
    <div ref={ref} style={{ position: 'relative', ...style }}>
      {label && <label className="label" style={{ display: 'block', marginBottom: 7 }}>{label}{required && <span className="req"> *</span>}</label>}
      <div className={'input' + (error ? ' err' : '')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }} onClick={toggle}>
        <Icon name="clock" style={{ width: 18, height: 18, color: 'var(--muted-2)', flexShrink: 0 }} />
        <span style={{ color: m ? 'var(--ink)' : 'var(--faint)', fontSize: 15, flex: 1 }}>{m ? pad(hour) + ':' + pad(minute) : placeholder}</span>
        <Icon name="chevDown" style={{ width: 16, height: 16, color: 'var(--muted-2)' }} />
      </div>
      {error && <div className="err-text"><Icon name="alertCircle" style={{ width: 14, height: 14 }} />{error}</div>}
      {open && ReactDOM.createPortal(
        <div id="__time_portal__" style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 16, boxShadow: 'var(--shadow-pop)', border: '1px solid var(--line)', width: 224, userSelect: 'none', overflow: 'hidden' }}>
            <div style={{ display: 'flex', textAlign: 'center', fontSize: 11, fontWeight: 800, color: 'var(--blue)', padding: '10px 6px 4px', letterSpacing: '.04em' }}>
              <div style={{ flex: 1 }}>ЧАСЫ</div><div style={{ flex: 1 }}>МИНУТЫ</div>
            </div>
            <div style={{ display: 'flex', gap: 4, padding: '0 6px' }}>
              <div ref={hourRef} style={col} className="scroll">
                {hours.map((h) => <button key={h} type="button" data-sel={h === hour ? '1' : undefined} style={cell(h === hour)} onClick={() => emit(h, minute == null ? 0 : minute)}>{pad(h)}</button>)}
              </div>
              <div style={{ width: 1, background: 'var(--line)' }} />
              <div ref={minRef} style={col} className="scroll">
                {minutes.map((mi) => <button key={mi} type="button" data-sel={mi === minute ? '1' : undefined} style={cell(mi === minute)} onClick={() => emit(hour == null ? 9 : hour, mi)}>{pad(mi)}</button>)}
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} style={{ width: '100%', border: 'none', borderTop: '1px solid var(--line)', background: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 13.5, padding: '9px 0', fontFamily: 'inherit' }}>Готово</button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

Object.assign(window, {
  ToastProvider, useToast, Button, Pill, TimeLimitBadge, plural, Toggle, Checkbox, Radio,
  Field, Input, LocationAutocomplete, Select, SearchBox, Combobox, Avatar, Modal, ModalHeader, Drawer,
  printOverlayScope, holdOverlaysDuringPrint, isPrintGuardActive,
  ConfirmDialog, Tabs, FilterChip, Pagination, Th, useSort,
  EmptyState, SkeletonRows, ActionMenu,
  fmtDate, CalendarPicker, DateField, DateRangeField, TripDateRangeField, TimeField,
});

export { CAL_MONTHS, CAL_DAYS, fmtDate, sameDayEq, CalendarPicker, DateField, DateRangeField, TripDateRangeField, TimeField };
