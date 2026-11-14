import { useRef, useState } from 'react';
import { Drawer } from '../../../shared/ui/Overlays.jsx';
import { Button } from '../../../shared/ui/Button.jsx';
import { Icon } from '../../../shared/icons/index.jsx';

export function PassengerPickerField({ label = 'Пассажиры', title = label, summary, total, children, doneDisabled = false, className = '', triggerClassName = '', style }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef(null);
  const close = () => { setOpen(false); trigger.current?.focus(); };
  return <div className={`av-field passenger-picker-field ${className}`} style={style}>
    {label && <span className="label">{label}</span>}
    <button ref={trigger} type="button" className={`input passenger-picker-trigger ${triggerClassName}`} aria-label={title} title={`Открыть боковую панель: ${title}`} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
      <Icon name="users" /><span title={summary}>{summary}</span><Icon name="panelRight" />
    </button>
    <Drawer open={open} title={title} onClose={close} width="min(620px,100vw)" className="free-booking passenger-picker-panel"
      footer={<Button icon="check" style={{ width: '100%' }} disabled={doneDisabled} onClick={close}>Готово{total != null ? ` · ${total}` : ''}</Button>}>
      <div className="passenger-picker-content">{children}</div>
    </Drawer>
  </div>;
}

export function PassengerCounterRow({ label, description, value, onChange, min = 0, max = Infinity, icon = 'user', tone = 'blue' }) {
  return <div className="pcp-row">
    <span className={`pcp-ic ${tone}`}><Icon name={icon} /></span>
    <div className="pcp-row-body"><div className="l">{label}</div>{description && <div className="s">{description}</div>}</div>
    <div className="pcp-stepper">
      <button type="button" aria-label={`Уменьшить: ${label}`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>−</button>
      <span className="n" aria-live="polite">{value}</span>
      <button type="button" aria-label={`Добавить: ${label}`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>+</button>
    </div>
  </div>;
}

export function PassengerCountField({ label = 'Пассажиры', value = 1, onChange, style, min = 0, max = Infinity }) {
  const count = Math.max(min, Number(value) || 0);
  return <PassengerPickerField label={label} summary={String(count)} total={count} style={style}>
    <div className="pcp-shell"><div className="pcp">
      <div className="pcp-sec-head"><span className="t">{label}</span><span className="pcp-total">Всего: {count}</span></div>
      <PassengerCounterRow label={label} value={count} min={min} max={max} onChange={onChange} icon="users" />
    </div></div>
  </PassengerPickerField>;
}
