import { useRef, useState } from 'react';
import { FloatingPanel } from './FloatingPanel.jsx';
import { CalendarPicker, fmtDate } from './CalendarPicker.jsx';
import { Icon } from '../icons/index.jsx';
import { dateWithinBounds, parseCalendarDate } from './date-range.js';

export function DateField({ label, id, 'aria-label': ariaLabel, value, onChange, placeholder = 'Выбрать дату', required, error, style, autoConfirm = true, minDate = new Date(), maxDate = null, triggerProps = {}, formatValue = fmtDate }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const parsed = parseCalendarDate(value);
  const invalid = Boolean(error || triggerProps['aria-invalid']);
  const choose = (date) => {
    if (!dateWithinBounds(date, minDate, maxDate)) return;
    onChange(date);
    setOpen(false);
  };
  return <div style={{ position: 'relative', ...style }}>
    {label && <label className="label" style={{ display: 'block', marginBottom: 7 }}>{label}{required && <span className="req"> *</span>}</label>}
    <button {...triggerProps} id={id || triggerProps.id} ref={ref} type="button" aria-label={ariaLabel || label || placeholder} aria-haspopup="dialog" aria-expanded={open} aria-invalid={invalid} className={'input' + (invalid ? ' err' : '') + (triggerProps.className ? ' ' + triggerProps.className : '')}
      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', ...triggerProps.style }} disabled={triggerProps.disabled || triggerProps.readOnly} onClick={() => setOpen((current) => !current)}>
      <Icon name="calendar" style={{ width: 18, height: 18, color: 'var(--muted-2)', flexShrink: 0 }} />
      <span style={{ color: parsed ? 'var(--ink)' : 'var(--faint)', fontSize: 15, flex: 1 }}>{parsed ? formatValue(parsed) : placeholder}</span>
      <Icon name="chevDown" style={{ width: 16, height: 16, color: 'var(--muted-2)' }} />
    </button>
    {error && <div className="err-text"><Icon name="alertCircle" style={{ width: 14, height: 14 }} />{error}</div>}
    {open && <FloatingPanel anchorRef={ref} width={320} maxHeight={580} closeOnScroll className="calendar-floating" onClose={() => setOpen(false)}>
      <CalendarPicker mode="single" startVal={parsed} minDate={minDate} maxDate={maxDate} autoConfirm={autoConfirm} onConfirm={choose} onClose={() => setOpen(false)} />
    </FloatingPanel>}
  </div>;
}
