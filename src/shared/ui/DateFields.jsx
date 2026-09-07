import { useState, useEffect, useRef, useMemo } from 'react';
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

const CAL_DAYS  = ['ВС','ПН','ВТ','СР','ЧТ','ПТ','СБ'];

function fmtDate(d) {
  if (!d || !(d instanceof Date) || Number.isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getFullYear()).slice(2)}`;
}

function sameDayEq(a, b) {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function CalendarPicker({ mode = 'range', startVal = null, endVal = null, onConfirm, onClose, autoConfirm = false, rangeStartLabel = 'Далее' }) {
  const now = new Date();
  const [month, setMonth] = useState(startVal ? startVal.getMonth() : now.getMonth());
  const [year,  setYear]  = useState(startVal ? startVal.getFullYear() : now.getFullYear());
  const [selS,  setSelS]  = useState(startVal);
  const [selE,  setSelE]  = useState(endVal);
  const [hover, setHover] = useState(null);
  const [phase, setPhase] = useState('start');

  const prevMo = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMo = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };




  const cells = useMemo(() => {
    const out = [];
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMo = new Date(year, month + 1, 0).getDate();
    const prevMonDays = new Date(year, month, 0).getDate();
    for (let i = firstDow - 1; i >= 0; i--) {
      const pm = month === 0 ? 11 : month - 1;
      const py = month === 0 ? year - 1 : year;
      out.push({ d: new Date(py, pm, prevMonDays - i), cur: false });
    }
    for (let d = 1; d <= daysInMo; d++) out.push({ d: new Date(year, month, d), cur: true });
    let nxt = 1;
    while (out.length < 42) {
      const nm = month === 11 ? 0 : month + 1;
      const ny = month === 11 ? year + 1 : year;
      out.push({ d: new Date(ny, nm, nxt++), cur: false });
    }
    return out;
  }, [year, month]);


  const effEnd = selE || (mode === 'range' && phase === 'end' && selS && hover ? hover : null);
  const rS = selS && effEnd ? (selS <= effEnd ? selS : effEnd) : null;
  const rE = selS && effEnd ? (selS <= effEnd ? effEnd : selS) : null;

  const handleClick = ({ d, cur }) => {
    if (!cur) return;

    if (mode === 'single') {
      setSelS(new Date(d)); setSelE(null);
      if (autoConfirm) onConfirm(new Date(d));
      return;
    }
    if (phase === 'start' || !selS) {
      setSelS(new Date(d)); setSelE(null); setPhase('end');
    } else {
      let s = selS, e = new Date(d);
      if (e < s) { const t = s; s = e; e = t; }
      setSelS(new Date(s)); setSelE(new Date(e)); setPhase('start');

      if (autoConfirm) onConfirm(new Date(s), new Date(e));
    }
  };

  const periodText = selS ? (selE && mode === 'range' ? `${fmtDate(selS)}-${fmtDate(selE)}` : fmtDate(selS)) : '';

  const BG = 'var(--blue-soft)';
  const SOLO = sameDayEq(rS, rE);

  return (
    <div style={{ background: '#fff', borderRadius: 20, padding: '22px 18px 16px', boxShadow: '0 16px 48px rgba(16,23,38,.22)', width: 302, userSelect: 'none' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <button type="button" onClick={prevMo} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--blue)', padding: '6px', borderRadius: 8, display: 'flex' }}>
          <Icon name="chevLeft" style={{ width: 20, height: 20 }} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, minWidth: 178 }}>
          <select aria-label="Месяц" value={month} onChange={(e) => setMonth(Number(e.target.value))}
            style={{ border: '1px solid var(--line)', borderRadius: 9, background: '#fff', color: 'var(--ink)', fontWeight: 700, fontSize: 14, padding: '6px 8px', cursor: 'pointer', fontFamily: 'inherit' }}>
            {CAL_MONTHS.map((name, index) => <option key={name} value={index}>{name}</option>)}
          </select>
          <select aria-label="Год" value={year} onChange={(e) => setYear(Number(e.target.value))}
            style={{ border: '1px solid var(--line)', borderRadius: 9, background: '#fff', color: 'var(--ink)', fontWeight: 800, fontSize: 14, padding: '6px 8px', cursor: 'pointer', fontFamily: 'inherit' }}>
            {Array.from(new Set([...Array.from({ length: 101 }, (_, i) => now.getFullYear() - 80 + i), year]))
              .sort((a, b) => a - b)
              .map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </div>
        <button type="button" onClick={nextMo} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--blue)', padding: '6px', borderRadius: 8, display: 'flex' }}>
          <Icon name="chevRight" style={{ width: 20, height: 20 }} />
        </button>
      </div>


      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 2 }}>
        {CAL_DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: 'var(--blue)', padding: '3px 0 6px' }}>{d}</div>
        ))}
      </div>


      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}
        onMouseLeave={() => { if (hover) setHover(null); }}>
        {cells.map(({ d, cur }, i) => {
          const isSt  = cur && rS && sameDayEq(d, rS);
          const isEn  = cur && rE && sameDayEq(d, rE);
          const inR   = cur && rS && rE && d > rS && d < rE;
          const isSel = mode === 'single' && cur && selS && sameDayEq(d, selS);
          const circle = isSt || isEn || isSel;

          let cellBg = 'transparent';
          if (inR)               cellBg = BG;
          else if (isSt && !SOLO) cellBg = `linear-gradient(to right, transparent 50%, ${BG} 50%)`;
          else if (isEn && !SOLO) cellBg = `linear-gradient(to left,  transparent 50%, ${BG} 50%)`;

          return (
            <div key={i}
              onClick={() => handleClick({ d, cur })}
              onMouseEnter={() => { if (cur && mode === 'range' && phase === 'end' && selS && !sameDayEq(hover, d)) setHover(new Date(d)); }}
              style={{ height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', background: cellBg, cursor: cur ? 'pointer' : 'default' }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: circle ? 'var(--blue)' : 'transparent',
                color: circle ? '#fff' : (!cur ? 'var(--faint)' : 'var(--ink)'),
                fontWeight: circle ? 700 : 400,
                fontSize: 14, transition: 'background .1s',
              }}>{d.getDate()}</div>
            </div>
          );
        })}
      </div>


      <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', margin: '10px 0 14px', minHeight: 18 }}>
        {periodText ? (mode === 'range' ? `Выбранный период: ${periodText}` : periodText) : ' '}
      </div>


      {(() => {
        const rangeOnlyStart = mode === 'range' && selS && !selE;
        const label = rangeOnlyStart ? rangeStartLabel : 'Далее';
        return (
          <Button variant="primary" style={{ width: '100%', marginBottom: 8 }}
            onClick={() => { if (!selS) return; rangeOnlyStart ? onConfirm(selS, null) : onConfirm(selS, mode === 'range' ? selE : undefined); }}
            disabled={!selS}>
            {label}
          </Button>
        );
      })()}
      <button type="button" onClick={onClose}
        style={{ width: '100%', border: 'none', background: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 15, padding: '6px 0', fontFamily: 'inherit' }}>
        Закрыть
      </button>
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


      const calH = 460, calW = 312, vh = window.innerHeight;
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

function DateRangeField({ label, startVal, endVal, onChange, placeholder = 'Выбрать период', style, autoConfirm = true, rangeStartLabel = 'Далее' }) {
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


      const calH = 460, calW = 312, vh = window.innerHeight;
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
      <div className="input"
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
        onClick={toggle}>
        <Icon name="calendar" style={{ width: 18, height: 18, color: 'var(--muted-2)', flexShrink: 0 }} />
        <span style={{ color: display ? 'var(--ink)' : 'var(--faint)', fontSize: 15, flex: 1 }}>
          {display || placeholder}
        </span>
      </div>
      {open && ReactDOM.createPortal(
        <div id="__calr_portal__" style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}>
          <CalendarPicker mode="range" startVal={startVal || null} endVal={endVal || null}
            autoConfirm={autoConfirm} rangeStartLabel={rangeStartLabel}
            onConfirm={(s, e) => { onChange(s, e); setOpen(false); }}
            onClose={() => setOpen(false)} />
        </div>,
        document.body
      )}
    </div>
  );
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
          <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 18px 54px rgba(16,23,38,.22)', border: '1px solid var(--line)', width: 224, userSelect: 'none', overflow: 'hidden' }}>
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
  fmtDate, CalendarPicker, DateField, DateRangeField, TimeField,
});

export { CAL_MONTHS, CAL_DAYS, fmtDate, sameDayEq, CalendarPicker, DateField, DateRangeField, TimeField };
