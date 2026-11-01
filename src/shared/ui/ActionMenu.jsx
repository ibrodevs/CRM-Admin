import { useRef, useState } from 'react';
import { Icon } from '../icons/index.jsx';
import { FloatingPanel } from './FloatingPanel.jsx';

function ActionMenu({ items, trigger }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  return <div style={{ position: 'relative' }}>
    <span ref={triggerRef} style={{ display: 'inline-flex' }} onClick={(event) => { event.stopPropagation(); setOpen((value) => !value); }}>{trigger}</span>
    {open && <FloatingPanel anchorRef={triggerRef} onClose={() => setOpen(false)} className="dropdown" width={280} align="end">
      {items.map((item, index) => item.sep ? <div key={index} className="dropdown-sep" /> :
        <div key={index} className={'dropdown-item' + (item.danger ? ' danger' : '')} onClick={(event) => { event.stopPropagation(); setOpen(false); item.onClick?.(); }}>
          {item.icon && <Icon name={item.icon} />}{item.label}
        </div>)}
    </FloatingPanel>}
  </div>;
}

export { ActionMenu };
