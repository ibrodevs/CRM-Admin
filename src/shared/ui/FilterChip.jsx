import { useState, useEffect, useRef } from 'react';
import { Icon } from '../icons/index';

function FilterChip({ label, options, value, onChange, icon = 'filter' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const cur = options.find((o) => (o.value ?? o) === value);
  const curLabel = value ? (cur ? (cur.label ?? cur) : value) : label;
  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button className={'chip' + (value ? '' : '')} onClick={() => setOpen((o) => !o)}>
        {curLabel}
        <Icon name={icon === 'filter' ? 'filter' : 'chevDown'} />
      </button>
      {open && (
        <div className="dropdown" style={{ top: 48, left: 0 }}>
          <div className="dropdown-item" onClick={() => { onChange(''); setOpen(false); }}>
            <span style={{ width: 17 }} />Все
          </div>
          <div className="dropdown-sep" />
          {options.filter((o) => (o?.value ?? o) !== '' && (o?.value ?? o) != null).map((o) => {
            const val = o.value ?? o, lab = o.label ?? o;
            return (
              <div key={val} className="dropdown-item" onClick={() => { onChange(val); setOpen(false); }}>
                {value === val ? <Icon name="check" /> : <span style={{ width: 17 }} />}{lab}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { FilterChip };
