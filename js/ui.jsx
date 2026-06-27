// ===== Shared UI primitives =====
const { useState, useEffect, useRef, createContext, useContext, useCallback } = React;

/* ---------- Toast system ---------- */
const ToastCtx = createContext(() => {});
const useToast = () => useContext(ToastCtx);

const MAX_TOASTS = 3; // keep the toast stack short so it never buries the top bar
function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, kind = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, kind }].slice(-MAX_TOASTS));
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3400);
  }, []);
  const icoName = (k) => (k === 'ok' ? 'checkCircle' : k === 'err' ? 'alertCircle' : 'bell');
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className={'toast ' + t.kind}>
            <Icon name={icoName(t.kind)} className={'t-ico ' + t.kind} />
            <span className="t-msg">{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- Button ---------- */
function Button({ variant = 'primary', size, icon, iconRight, children, className = '', ...rest }) {
  const cls = ['btn', 'btn-' + variant, size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '', className]
    .filter(Boolean).join(' ');
  return (
    <button className={cls} {...rest}>
      {icon && <Icon name={icon} />}
      {children}
      {iconRight && <Icon name={iconRight} />}
    </button>
  );
}

/* ---------- Status pill ---------- */
const PILL_TONE = {
  green: 'pill-green', red: 'pill-red', teal: 'pill-teal',
  amber: 'pill-amber', blue: 'pill-blue', gray: 'pill-gray',
};
function Pill({ tone = 'gray', children }) {
  return <span className={'pill ' + (PILL_TONE[tone] || 'pill-gray')}>{children}</span>;
}

/* Accent badge for deadlines / time-limits — a pill with a clock icon so it reads as urgent,
   not as a line of plain text. */
function TimeLimitBadge({ tone = 'red', icon = 'clock', children }) {
  return (
    <span className={'pill ' + (PILL_TONE[tone] || 'pill-red')} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <Icon name={icon} style={{ width: 13, height: 13 }} />{children}
    </span>
  );
}

/* Russian plural picker: plural(n, ['предложение','предложения','предложений']) */
function plural(n, forms) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}

/* ---------- Toggle / Checkbox / Radio ---------- */
function Toggle({ on, onChange, style }) {
  return <button type="button" className={'toggle' + (on ? ' on' : '')} style={style} onClick={() => onChange(!on)} />;
}
function Checkbox({ on, onChange, style }) {
  return (
    <button type="button" className={'checkbox' + (on ? ' on' : '')} style={style} onClick={() => onChange(!on)}>
      {on && <Icon name="check" strokeWidth={3} />}
    </button>
  );
}
function Radio({ on, onChange }) {
  return <button type="button" className={'radio' + (on ? ' on' : '')} onClick={() => onChange(true)} />;
}

/* ---------- Field / Input ---------- */
function Field({ label, required, hint, error, children }) {
  return (
    <div className="field">
      {label && <label className="label">{label}{required && <span className="req"> *</span>}</label>}
      {hint && <div className="hint">{hint}</div>}
      {children}
      {error && <div className="err-text"><Icon name="alertCircle" style={{ width: 14, height: 14 }} />{error}</div>}
    </div>
  );
}
function Input({ error, leadIcon, trailIcon, onTrail, ...rest }) {
  if (leadIcon || trailIcon) {
    return (
      <div className="input-wrap">
        {leadIcon && <Icon name={leadIcon} className="lead" />}
        <input className={'input' + (trailIcon ? ' has-trail' : '') + (error ? ' err' : '')} {...rest} />
        {trailIcon && <Icon name={trailIcon} className="trail" onClick={onTrail} />}
      </div>
    );
  }
  return <input className={'input' + (error ? ' err' : '')} {...rest} />;
}
function Select({ options, error, placeholder, ...rest }) {
  return (
    <select className={'select' + (error ? ' err' : '')} {...rest}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => {
        const val = typeof o === 'string' ? o : o.value;
        const lab = typeof o === 'string' ? o : o.label;
        return <option key={val} value={val}>{lab}</option>;
      })}
    </select>
  );
}
function SearchBox({ value, onChange, placeholder = 'Поиск', style }) {
  return (
    <div className="search" style={style}>
      <Icon name="search" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

/* ---------- Avatar ---------- */
function Avatar({ src, name = '', size = 40 }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  if (src) return <img className="avatar" src={src} alt={name} style={{ width: size, height: size }} />;
  return <span className="avatar-ph" style={{ width: size, height: size, fontSize: size * 0.36 }}>{initials}</span>;
}

/* ---------- Modal ---------- */
function Modal({ open, onClose, children, size, className = '' }) {
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === 'Escape') onClose && onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose && onClose(); }}>
      <div className={'modal ' + (size === 'sm' ? 'modal-sm ' : '') + className}>{children}</div>
    </div>
  );
}
function ModalHeader({ title, sub, onClose }) {
  return (
    <div className="modal-head">
      <div>
        <h2 className="modal-title">{title}</h2>
        {sub && <div className="modal-sub">{sub}</div>}
      </div>
      {onClose && <button className="modal-close" onClick={onClose}><Icon name="x" /></button>}
    </div>
  );
}

/* ---------- Drawer (slide-over) ---------- */
function Drawer({ open, onClose, title, children, footer }) {
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === 'Escape') onClose && onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="drawer-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose && onClose(); }}>
      <div className="drawer scroll">
        <div className="drawer-head">
          <h2 className="modal-title" style={{ fontSize: 24 }}>{title}</h2>
          <button className="modal-close" onClick={onClose}><Icon name="x" /></button>
        </div>
        <div className="drawer-body">{children}</div>
        {footer && <div className="drawer-foot">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------- Confirm dialog ---------- */
function ConfirmDialog({ open, title = 'Вы уверены?', message, confirmLabel = 'Удалить', confirmVariant = 'danger', onConfirm, onCancel }) {
  return (
    <Modal open={open} onClose={onCancel} size="sm">
      <div className="modal-pad" style={{ padding: '26px 28px' }}>
        <div className="modal-head" style={{ marginBottom: 8 }}>
          <h2 className="modal-title" style={{ fontSize: 22 }}>{title}</h2>
          <button className="modal-close" onClick={onCancel}><Icon name="x" /></button>
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 15, margin: '0 0 22px' }}>{message}</div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button variant="secondary" onClick={onCancel} style={{ flex: 1 }}>Отменить</Button>
          <Button variant={confirmVariant} onClick={onConfirm} style={{ flex: 1 }}>{confirmLabel}</Button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------- Tabs ---------- */
function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs">
      {tabs.map((t) => (
        <button key={t.key} className={'tab' + (value === t.key ? ' active' : '')} onClick={() => onChange(t.key)}>
          {t.label}
          {t.count != null && <span className="tab-count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ---------- Filter chip with dropdown ---------- */
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
          {options.map((o) => {
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

/* ---------- Pagination ---------- */
function Pagination({ page, pages, onPage }) {
  return (
    <div className="pagination">
      <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Назад</Button>
      <div className="page-info">Страница {page} из {pages}</div>
      <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Вперед</Button>
    </div>
  );
}

/* ---------- Sortable column header ---------- */
function Th({ label, col, sort, onSort, sortable = true, style }) {
  if (!sortable) return <th style={style}>{label}</th>;
  const active = sort && sort.col === col;
  return (
    <th className="sortable" style={style} onClick={() => onSort(col)}>
      <span className="th-in">{label}
        <Icon name={active ? (sort.dir === 'asc' ? 'chevUp' : 'chevDown') : 'chevDown'}
          style={{ opacity: active ? 0.9 : 0.35 }} />
      </span>
    </th>
  );
}
function useSort(initial) {
  const [sort, setSort] = useState(initial || null);
  const onSort = (col) => setSort((s) => (s && s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' }));
  const apply = (rows, accessors) => {
    if (!sort) return rows;
    const acc = accessors[sort.col] || ((r) => r[sort.col]);
    const sorted = [...rows].sort((a, b) => {
      const x = acc(a), y = acc(b);
      if (typeof x === 'number' && typeof y === 'number') return x - y;
      return String(x).localeCompare(String(y), 'ru');
    });
    return sort.dir === 'asc' ? sorted : sorted.reverse();
  };
  return { sort, onSort, apply };
}

/* ---------- Empty / Skeleton ---------- */
function EmptyState({ icon = 'inbox', title = 'Нет данных', sub }) {
  return (
    <div className="empty">
      <Icon name={icon} strokeWidth={1.5} />
      <div className="e-title">{title}</div>
      {sub && <div className="e-sub">{sub}</div>}
    </div>
  );
}
function SkeletonRows({ rows = 6, cols = 6 }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: cols }).map((__, j) => (
            <td key={j}><div className="sk" style={{ height: 16, width: j === 0 ? '40%' : '70%' }} /></td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

/* ---------- Dropdown menu (actions) ----------
   Rendered through a body portal with fixed positioning so it never gets clipped by an
   ancestor's overflow:hidden (cards, drawers) and flips above the trigger when there isn't
   enough room below (e.g. a composer pinned to the bottom of the screen). */
function ActionMenu({ items, trigger }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null); // {top,left} in viewport coords, computed after measuring
  const wrapRef = useRef(null);  // wrapper (outside-click anchor)
  const trigRef = useRef(null);  // trigger box (measured for placement)
  const menuRef = useRef(null);  // the floating menu

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if ((wrapRef.current && wrapRef.current.contains(e.target)) || (menuRef.current && menuRef.current.contains(e.target))) return;
      setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    const dismiss = () => setOpen(false); // a scroll/resize would invalidate the anchored position
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

  // measure the menu, then place it: right-aligned to the trigger, flipped up if it would
  // overflow the bottom, and clamped inside the viewport on both axes.
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

/* ============ Calendar / Date Picker ============ */

const CAL_MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const CAL_DAYS  = ['ВС','ПН','ВТ','СР','ЧТ','ПТ','СБ'];

function fmtDate(d) {
  if (!d || !(d instanceof Date)) return '';
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
  const [phase, setPhase] = useState('start'); // 'start' | 'end'

  const prevMo = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMo = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  // Build 42-cell grid (6 rows × 7 cols), week starts Sunday
  const cells = [];
  const firstDow   = new Date(year, month, 1).getDay();   // 0=Sun
  const daysInMo   = new Date(year, month + 1, 0).getDate();
  const prevMonDays = new Date(year, month, 0).getDate();
  for (let i = firstDow - 1; i >= 0; i--) {
    const pm = month === 0 ? 11 : month - 1;
    const py = month === 0 ? year - 1 : year;
    cells.push({ d: new Date(py, pm, prevMonDays - i), cur: false });
  }
  for (let d = 1; d <= daysInMo; d++) cells.push({ d: new Date(year, month, d), cur: true });
  let nxt = 1;
  while (cells.length < 42) {
    const nm = month === 11 ? 0 : month + 1;
    const ny = month === 11 ? year + 1 : year;
    cells.push({ d: new Date(ny, nm, nxt++), cur: false });
  }

  // Effective range (includes hover preview)
  const effEnd = selE || (mode === 'range' && phase === 'end' && selS && hover ? hover : null);
  const rS = selS && effEnd ? (selS <= effEnd ? selS : effEnd) : null;
  const rE = selS && effEnd ? (selS <= effEnd ? effEnd : selS) : null;

  const handleClick = ({ d, cur }) => {
    if (!cur) return;
    // ТЗ #10 — a click on a day drops it straight into the field; no extra «Выбрать» press needed
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
      // second click closes the range range automatically when auto-confirm is on
      if (autoConfirm) onConfirm(new Date(s), new Date(e));
    }
  };

  const periodText = selS ? (selE && mode === 'range' ? `${fmtDate(selS)}-${fmtDate(selE)}` : fmtDate(selS)) : '';

  const BG = 'var(--blue-soft)';
  const SOLO = sameDayEq(rS, rE);

  return (
    <div style={{ background: '#fff', borderRadius: 20, padding: '22px 18px 16px', boxShadow: '0 16px 48px rgba(16,23,38,.22)', width: 302, userSelect: 'none' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <button type="button" onClick={prevMo} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--blue)', padding: '6px', borderRadius: 8, display: 'flex' }}>
          <Icon name="chevLeft" style={{ width: 20, height: 20 }} />
        </button>
        <span style={{ fontWeight: 700, fontSize: 17, color: 'var(--ink)' }}>{CAL_MONTHS[month]}</span>
        <button type="button" onClick={nextMo} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--blue)', padding: '6px', borderRadius: 8, display: 'flex' }}>
          <Icon name="chevRight" style={{ width: 20, height: 20 }} />
        </button>
      </div>

      {/* Weekday headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 2 }}>
        {CAL_DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 12.5, fontWeight: 700, color: 'var(--blue)', padding: '3px 0 6px' }}>{d}</div>
        ))}
      </div>

      {/* Days */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
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
              onMouseEnter={() => { if (cur && mode === 'range' && phase === 'end' && selS) setHover(new Date(d)); }}
              onMouseLeave={() => setHover(null)}
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

      {/* Period text */}
      <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', margin: '10px 0 14px', minHeight: 18 }}>
        {periodText ? (mode === 'range' ? `Выбранный период: ${periodText}` : periodText) : ' '}
      </div>

      {/* Buttons — for a range, picking only the «туда» date offers «Только туда» (ТЗ #10) */}
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

/* Single date picker field */
function DateField({ label, value, onChange, placeholder = 'Выбрать дату', required, error, style, autoConfirm = true }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => {
      if (!ref.current) return;
      // allow clicks inside the portal popup too
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
      setPos({ top: r.bottom + 6, left: r.left });
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

/* Date range picker field */
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
      setPos({ top: r.bottom + 6, left: r.left });
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

Object.assign(window, {
  ToastProvider, useToast, Button, Pill, TimeLimitBadge, plural, Toggle, Checkbox, Radio,
  Field, Input, Select, SearchBox, Avatar, Modal, ModalHeader, Drawer,
  ConfirmDialog, Tabs, FilterChip, Pagination, Th, useSort,
  EmptyState, SkeletonRows, ActionMenu,
  fmtDate, CalendarPicker, DateField, DateRangeField,
});
