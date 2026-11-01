import { FloatingPanel, containsFloatingTarget } from './FloatingPanel.jsx';
import { useState, useEffect, useRef } from 'react';
import { Icon } from '../icons/index.jsx';

function FilterChip({ label, options, value, onChange, icon = 'filter' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !containsFloatingTarget(ref.current, e.target)) setOpen(false); };
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
        <FloatingPanel anchorRef={ref} onClose={() => setOpen(false)} className="dropdown" width={240}>
          {/* Отметка выбранного стоит справа: колонка под галочку слева
              оставляла пустую полосу вдоль всего списка. */}
          <div className={'dropdown-item' + (value ? '' : ' is-selected')} onClick={() => { onChange(''); setOpen(false); }}>
            Все{!value && <Icon name="check" className="dropdown-item-mark" />}
          </div>
          <div className="dropdown-sep" />
          {options.filter((o) => (o?.value ?? o) !== '' && (o?.value ?? o) != null).map((o) => {
            const val = o.value ?? o, lab = o.label ?? o;
            const selected = value === val;
            return (
              <div key={val} className={'dropdown-item' + (selected ? ' is-selected' : '')} onClick={() => { onChange(val); setOpen(false); }}>
                {lab}{selected && <Icon name="check" className="dropdown-item-mark" />}
              </div>
            );
          })}
        </FloatingPanel>
      )}
    </div>
  );
}

export { FilterChip };
