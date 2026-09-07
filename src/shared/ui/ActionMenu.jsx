import React from 'react';
import { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Icon } from '../icons/index.jsx';

function ActionMenu({ items, trigger }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const wrapRef = useRef(null);
  const trigRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if ((wrapRef.current && wrapRef.current.contains(e.target)) || (menuRef.current && menuRef.current.contains(e.target))) return;
      setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    const dismiss = () => setOpen(false);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', dismiss);
    window.addEventListener('scroll', dismiss, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('scroll', dismiss, true);
    };
  }, [open]);



  React.useLayoutEffect(() => {
    if (!open || !trigRef.current || !menuRef.current) return;
    const t = trigRef.current.getBoundingClientRect();
    const m = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight, gap = 6, pad = 8;
    let left = t.right - m.width;
    if (left < pad) left = t.left;
    left = Math.min(Math.max(pad, left), Math.max(pad, vw - m.width - pad));
    let top = t.bottom + gap;
    if (top + m.height > vh - pad) {
      const above = t.top - m.height - gap;
      top = above >= pad ? above : Math.max(pad, vh - m.height - pad);
    }
    setPos((p) => (p && Math.abs(p.top - top) < 0.5 && Math.abs(p.left - left) < 0.5) ? p : { top, left });
  }, [open, items]);

  return (
    <div style={{ position: 'relative' }} ref={wrapRef}>
      <span ref={trigRef} style={{ display: 'inline-flex' }} onClick={(e) => { e.stopPropagation(); setPos(null); setOpen((o) => !o); }}>{trigger}</span>
      {open && ReactDOM.createPortal(
        <div ref={menuRef} className="dropdown" style={{ position: 'fixed', top: pos ? pos.top : 0, left: pos ? pos.left : 0, right: 'auto', zIndex: 9999, visibility: pos ? 'visible' : 'hidden' }}>
          {items.map((it, i) => it.sep
            ? <div key={i} className="dropdown-sep" />
            : (
              <div key={i} className={'dropdown-item' + (it.danger ? ' danger' : '')}
                onClick={(e) => { e.stopPropagation(); setOpen(false); it.onClick && it.onClick(); }}>
                {it.icon && <Icon name={it.icon} />}{it.label}
              </div>
            ))}
        </div>,
        document.body
      )}
    </div>
  );
}

export { ActionMenu };
