import { useState, useEffect, useRef, createContext, useContext, useCallback } from 'react';
import { Icon } from '../icons/index.jsx';

const ToastCtx = createContext(() => {});

const useToast = () => useContext(ToastCtx);

const MAX_TOASTS = 3;

const TOAST_ICON = { ok: 'checkCircle', info: 'bell', warn: 'alertCircle', err: 'alertCircle' };

const TOAST_URGENCY = { err: 'Срочно', warn: 'Важно' };

function ToastItem({ t, onClose, onNav }) {
  const total = t.duration || ((t.kind === 'err' || t.kind === 'warn') ? 6000 : 4500);
  const [paused, setPaused] = useState(false);
  const remain = useRef(total);
  const startRef = useRef(0);
  useEffect(() => {
    if (paused) return;
    startRef.current = Date.now();
    const id = setTimeout(() => onClose(t.id), remain.current);
    return () => { clearTimeout(id); remain.current -= (Date.now() - startRef.current); };
  }, [paused]);
  const act = () => {
    if (t.action && t.action.onClick) t.action.onClick();
    else if (t.action && t.action.route) onNav(t.action.route);
    onClose(t.id);
  };
  const urgency = TOAST_URGENCY[t.kind];
  return (
    <div className={'toast ' + t.kind} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <span className="toast-ic"><Icon name={TOAST_ICON[t.kind] || 'bell'} style={{ width: 20, height: 20 }} /></span>
      <div className="toast-body">
        {urgency && <div className="toast-urgency">{urgency}</div>}
        {t.title && <div className="toast-title">{t.title}</div>}
        <div className="toast-msg">{t.msg}</div>
        {t.action && <button type="button" className="toast-link" onClick={act}>{t.action.label}<Icon name="arrowRight" style={{ width: 14, height: 14 }} /></button>}
      </div>
      <button type="button" className="toast-ring" onClick={() => onClose(t.id)} title="Скрыть" aria-label="Скрыть">
        <svg viewBox="0 0 26 26" className="toast-ring-svg">
          <circle cx="13" cy="13" r="10" className="toast-ring-bg" />
          <circle cx="13" cy="13" r="10" className="toast-ring-fg" style={{ animationDuration: total + 'ms', animationPlayState: paused ? 'paused' : 'running' }} />
        </svg>
        <Icon name="x" className="toast-ring-x" />
      </button>
    </div>
  );
}

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, kind = 'ok', opts = {}) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, kind, title: opts.title, action: opts.action, duration: opts.duration }].slice(-MAX_TOASTS));
  }, []);
  const remove = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const nav = useCallback((r) => { if (window.__toastNav) window.__toastNav(r); }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className="toast-slot">
            <ToastItem t={t} onClose={remove} onNav={nav} />
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export { ToastCtx, useToast, MAX_TOASTS, TOAST_ICON, TOAST_URGENCY, ToastItem, ToastProvider };
