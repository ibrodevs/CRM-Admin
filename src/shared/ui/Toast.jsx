import { useState, useEffect, useRef, createContext, useContext, useCallback } from 'react';
import { Icon } from '../icons/index.jsx';

const ToastCtx = createContext(() => {});
const useToast = () => useContext(ToastCtx);
// Bound memory, not the height of the popup. Persistent events also live in the notification center.
const MAX_TOASTS = 100;
const VISIBLE_TOAST_TIMERS = 3;
const TOAST_ICON = { ok: 'checkCircle', info: 'bell', warn: 'alertCircle', err: 'alertCircle' };
const TOAST_URGENCY = { err: 'Срочно', warn: 'Важно' };

function ToastItem({ t, onClose, onNav, paused: parentPaused = false }) {
  const total = t.duration || ((t.kind === 'err' || t.kind === 'warn') ? 6000 : 4500);
  const [hovered, setHovered] = useState(false);
  const paused = parentPaused || hovered;
  const remain = useRef(total);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (paused) return undefined;
    const started = Date.now();
    const timer = setTimeout(() => closeRef.current(t.id), Math.max(0, remain.current));
    return () => { clearTimeout(timer); remain.current = Math.max(0, remain.current - (Date.now() - started)); };
  }, [paused, t.id]);
  const act = () => {
    if (t.action?.onClick) t.action.onClick();
    else if (t.action?.route) onNav(t.action.route);
    onClose(t.id);
  };
  const urgency = TOAST_URGENCY[t.kind] || (t.kind === 'ok' ? 'Успешно' : 'Информация');
  return (
    <article className={'toast ' + t.kind} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <span className="toast-ic" aria-hidden="true"><Icon name={TOAST_ICON[t.kind] || 'bell'} /></span>
      <div className="toast-body">
        <div className="toast-meta">{urgency && <span className="toast-urgency">{urgency}</span>}
          {t.createdAt && <time dateTime={new Date(t.createdAt).toISOString()}>{new Date(t.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</time>}
        </div>
        {t.title && <div className="toast-title">{t.title}</div>}
        <div className="toast-msg">{t.msg}</div>
        {t.action && <button type="button" className="toast-link" onClick={act}>{t.action.label}<Icon name="arrowRight" /></button>}
      </div>
      <button type="button" className="toast-dismiss" onClick={() => onClose(t.id)} title="Скрыть уведомление" aria-label="Скрыть уведомление"><Icon name="x" /></button>
    </article>
  );
}

function ToastStack({ toasts, onClose, onClear, onNav }) {
  const [collapsed, setCollapsed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [visibleIds, setVisibleIds] = useState(() => new Set());
  const listRef = useRef(null);
  useEffect(() => {
    if (!toasts.length || !listRef.current) return undefined;
    if (typeof IntersectionObserver === 'undefined') { setVisibleIds(null); return undefined; }
    const ids = new Set(toasts.map((item) => String(item.id)));
    const observer = new IntersectionObserver((entries) => {
      setVisibleIds((previous) => {
        const next = new Set([...(previous || [])].filter((id) => ids.has(id)));
        entries.forEach((entry) => {
          const id = entry.target.dataset.toastId;
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) next.add(id);
          else next.delete(id);
        });
        return previous && next.size === previous.size && [...next].every((id) => previous.has(id)) ? previous : next;
      });
    }, { root: listRef.current, threshold: [0, 0.5] });
    [...listRef.current.children].forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [toasts]);
  const dismiss = (id) => {
    // Removing the focused button need not dispatch blur in the browser.
    setFocused(false);
    if (toasts.length === 1) setHovered(false);
    onClose(id);
  };
  const clear = () => { setFocused(false); setHovered(false); setCollapsed(false); onClear(); };
  if (!toasts.length) return null;
  const paused = collapsed || hovered || focused;
  const urgency = toasts.some((item) => item.kind === 'err') ? 'err' : toasts.some((item) => item.kind === 'warn') ? 'warn' : 'info';
  return <section className={'toast-wrap toast-center' + (collapsed ? ' is-collapsed' : '')} aria-label="Всплывающие уведомления" data-urgency={urgency}
    onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)}
    onFocusCapture={() => setFocused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    <header className="toast-center-header">
      <span className="toast-center-bell" aria-hidden="true"><Icon name="bell" /></span>
      <h2>Уведомления</h2>
      <span className="toast-center-count" aria-live="polite" aria-atomic="true" aria-label={`Уведомлений в блоке: ${toasts.length}`}>{toasts.length}</span>
      <button type="button" className="toast-center-control" aria-label={collapsed ? 'Развернуть уведомления' : 'Свернуть уведомления'} title={collapsed ? 'Развернуть' : 'Свернуть'} aria-expanded={!collapsed}
        onClick={() => setCollapsed((value) => !value)}><Icon name={collapsed ? 'chevUp' : 'chevDown'} /></button>
      <button type="button" className="toast-center-control" aria-label="Скрыть все всплывающие уведомления" title="Скрыть все" onClick={clear}><Icon name="x" /></button>
    </header>
    <div ref={listRef} className="toast-center-list" hidden={collapsed} role="list" aria-label="Последние события">
      {[...toasts].reverse().map((t, index) => <div key={t.id} className="toast-slot" role="listitem" data-toast-id={t.id}>
        <ToastItem t={t} onClose={dismiss} onNav={onNav} paused={paused || index >= VISIBLE_TOAST_TIMERS || (visibleIds !== null && !visibleIds.has(String(t.id)))} />
      </div>)}
    </div>
    <footer className="toast-center-footer" hidden={collapsed}>
      <span>{toasts.length > VISIBLE_TOAST_TIMERS ? 'Прокрутите список' : 'Последние события'}</span>
      <button type="button" className="toast-center-open" onClick={() => onNav('notifications')}>Все уведомления<Icon name="arrowRight" /></button>
    </footer>
  </section>;
}

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, kind = 'ok', opts = {}) => {
    const id = opts.id || Math.random().toString(36).slice(2);
    setToasts((current) => current.some((item) => item.id === id) ? current
      : [...current, { id, msg, kind, title: opts.title, action: opts.action, duration: opts.duration, createdAt: Date.now() }].slice(-MAX_TOASTS));
  }, []);
  const remove = useCallback((id) => setToasts((current) => current.filter((item) => item.id !== id)), []);
  const clear = useCallback(() => setToasts([]), []);
  const nav = useCallback((route) => { if (window.__toastNav) window.__toastNav(route); }, []);
  return <ToastCtx.Provider value={push}>
    {children}
    <ToastStack toasts={toasts} onClose={remove} onClear={clear} onNav={nav} />
  </ToastCtx.Provider>;
}

export { ToastCtx, useToast, MAX_TOASTS, VISIBLE_TOAST_TIMERS, TOAST_ICON, TOAST_URGENCY, ToastItem, ToastStack, ToastProvider };
