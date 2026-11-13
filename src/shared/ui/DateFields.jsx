import { CAL_MONTHS, CAL_DAYS, fmtDate, sameDayEq, CalendarPicker } from './CalendarPicker.jsx';
import { DateField } from './CalendarField.jsx';
import { FloatingPanel } from './FloatingPanel.jsx';
import { scrollPopoverOption } from './scroll-popover-option.js';
import { localDay, parseCalendarDate, dateWithinBounds, completeDateRange } from './date-range.js';
import { useState, useEffect, useRef } from 'react';
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

function DateRangeField({ label, startVal, endVal, onChange, placeholder = 'Выбрать период', style, autoConfirm = true, rangeStartLabel = 'Далее', minDate = new Date(), maxDate = null, requireComplete = false, allowSameDay = false, error = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const toggle = () => setOpen((current) => !current);
  const start = parseCalendarDate(startVal);
  const end = parseCalendarDate(endVal);
  const display = start ? (end ? `${fmtDate(start)} — ${fmtDate(end)}` : fmtDate(start)) : '';
  return (
    <div ref={ref} style={{ position: 'relative', minWidth: 0, maxWidth: '100%', ...style }}>
      {label && <label className="label" style={{ display: 'block', marginBottom: 7 }}>{label}</label>}
      <button type="button" aria-label={label || placeholder} aria-expanded={open} aria-invalid={Boolean(error)} className={'input' + (error ? ' err' : '')}
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', minWidth: 0, maxWidth: '100%' }}
        onClick={toggle}>
        <Icon name="calendar" style={{ width: 18, height: 18, color: 'var(--muted-2)', flexShrink: 0 }} />
        <span title={display || placeholder} style={{ color: display ? 'var(--ink)' : 'var(--faint)', fontSize: 15, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {display || placeholder}
        </span>
      </button>
      {open && (
        <FloatingPanel anchorRef={ref} width={320} maxHeight={580} closeOnScroll className="calendar-floating" onClose={() => setOpen(false)}>
          <CalendarPicker mode="range" startVal={startVal || null} endVal={endVal || null}
            autoConfirm={autoConfirm} rangeStartLabel={rangeStartLabel} minDate={minDate} maxDate={maxDate} requireComplete={requireComplete} allowSameDay={allowSameDay}
            onConfirm={(s, e) => {
              if (!dateWithinBounds(s, minDate, maxDate) || (e && !dateWithinBounds(e, minDate, maxDate))) return;
              if (requireComplete && !completeDateRange(s, e, { minDate, maxDate, allowSameDay })) return;
              onChange(s, e); setOpen(false);
            }}
            onClose={() => setOpen(false)} />
        </FloatingPanel>
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
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      [hourRef.current, minRef.current].forEach((list) => {
        scrollPopoverOption(list, list?.querySelector('[data-sel="1"]'));
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);
  const toggle = () => setOpen((current) => !current);
  const emit = (h, mi) => { onChange && onChange(pad(h) + ':' + pad(mi)); };
  const col = { flex: 1, maxHeight: 210, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3, padding: '2px 6px' };
  const cell = (active) => ({ padding: '7px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14,
    fontWeight: active ? 800 : 600, background: active ? 'var(--blue)' : 'transparent', color: active ? '#fff' : 'var(--ink)', fontFamily: 'inherit' });
  return (
    <div style={{ position: 'relative', ...style }}>
      {label && <label className="label" style={{ display: 'block', marginBottom: 7 }}>{label}{required && <span className="req"> *</span>}</label>}
      <button ref={ref} type="button" aria-label={label || 'Выбрать время'} aria-haspopup="dialog" aria-expanded={open} className={'input' + (error ? ' err' : '')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }} onClick={toggle}>
        <Icon name="clock" style={{ width: 18, height: 18, color: 'var(--muted-2)', flexShrink: 0 }} />
        <span style={{ color: m ? 'var(--ink)' : 'var(--faint)', fontSize: 15, flex: 1 }}>{m ? pad(hour) + ':' + pad(minute) : placeholder}</span>
        <Icon name="chevDown" style={{ width: 16, height: 16, color: 'var(--muted-2)' }} />
      </button>
      {error && <div className="err-text"><Icon name="alertCircle" style={{ width: 14, height: 14 }} />{error}</div>}
      {open && (
        <FloatingPanel anchorRef={ref} onClose={() => setOpen(false)} closeOnScroll width={224} maxHeight={300} role="dialog" aria-label={label || 'Выбор времени'} style={{ userSelect: 'none' }}>
          <div>
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
        </FloatingPanel>
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
