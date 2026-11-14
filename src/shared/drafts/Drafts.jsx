import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import ReactDOM from 'react-dom';
import { Icon } from '../icons/index.jsx';
import { createDraftStore } from './store.js';
const DraftContext = createContext(null);
const ScopeContext = createContext('');
const DraftNoticeTargetContext = createContext(null);
export function DraftScope({ name, children }) {
  const parent = useContext(ScopeContext);
  return <ScopeContext.Provider value={[parent, name].filter(Boolean).join('/')}>{children}</ScopeContext.Provider>;
}
const emptyStatus = { restored: false, failed: false };

export function DraftNoticeSlot({ active = true, priority = 0 }) {
  const register = useContext(DraftNoticeTargetContext);
  const ref = useRef(null);
  useEffect(() => {
    if (!active || !register || !ref.current) return undefined;
    return register(ref.current, priority);
  }, [active, priority, register]);
  return <div ref={ref} className="draft-notice-slot" />;
}

export function DraftProvider({ owner, children }) {
  const [targets, setTargets] = useState([]);
  const register = useCallback((node, priority) => {
    const entry = { node, priority };
    setTargets((current) => [...current, entry]);
    return () => setTargets((current) => current.filter((item) => item !== entry));
  }, []);
  const target = targets.reduce((top, item) => !top || item.priority >= top.priority ? item : top, null)?.node;

  const store = useMemo(() => {
    if (!owner || typeof window === 'undefined') return null;
    // Keep failures visible when browser storage is blocked.
    const storage = { getItem: (key) => window.localStorage.getItem(key), setItem: (key, value) => window.localStorage.setItem(key, value), removeItem: (key) => window.localStorage.removeItem(key) };
    return createDraftStore(new Proxy(storage, { ownKeys: () => Object.keys(window.localStorage), getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }) }), owner);
  }, [owner]);
  return <DraftContext.Provider value={store}><DraftNoticeTargetContext.Provider value={register}>{children}<DraftRecoveryNotice store={store} target={target} /></DraftNoticeTargetContext.Provider></DraftContext.Provider>;
}

export function useDraftState(scope, field, initial) {
  const store = useContext(DraftContext);
  const prefix = useContext(ScopeContext);
  scope = [prefix, scope].filter(Boolean).join('/');
  const fallback = useMemo(() => typeof initial === 'function' ? initial() : initial, [store, scope, field]);
  const subscribe = useCallback((fn) => store ? store.subscribe(fn) : () => {}, [store]);
  const snapshot = useCallback(() => store ? store.read(scope, field, fallback) : fallback, [store, scope, field, fallback]);
  const value = useSyncExternalStore(subscribe, snapshot, () => fallback);
  const [local, setLocal] = useState(fallback);
  const set = useCallback((next) => {
    if (!store) { setLocal(next); return; }
    const current = store.read(scope, field, fallback);
    store.write(scope, field, typeof next === 'function' ? next(current) : next);
  }, [store, scope, field, fallback]);
  return [store ? value : local, set];
}
export function useDraftControls(scope = '') {
  const store = useContext(DraftContext);
  const prefix = useContext(ScopeContext);
  scope = [prefix, scope].filter(Boolean).join('/');
  return useMemo(() => ({ clear: () => store?.clear(scope), has: (field) => store?.has(scope, field) || false }), [store, scope]);
}
export function useDraftNavigation(handler) {
  const store = useContext(DraftContext);
  const current = useRef(handler);
  current.current = handler;
  useEffect(() => store?.setOpener?.((entry) => current.current(entry, store)), [store]);
}
export function useDraftStatus() {
  const store = useContext(DraftContext);
  return useSyncExternalStore(store?.subscribe || (() => () => {}), store?.status || (() => emptyStatus), () => emptyStatus);
}
function DraftRecoveryNotice({ store, target }) {
  const status = useSyncExternalStore(store?.subscribe || (() => () => {}), store?.status || (() => emptyStatus), () => emptyStatus);
  const [confirmClear, setConfirmClear] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const entries = useMemo(() => !status.failed && status.restored ? store?.workspaces?.() || [] : [], [store, status]);
  const open = (entry) => { if (store.open(entry) !== false) store.dismiss(); };
  const savedTime = (entry) => new Date(entry.savedAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const describe = (entry) => [entry.services.join(' · ') || (entry.type === 'order' ? 'Данные и оформление услуг заказа' : 'Параметры поиска и введённые данные'), entry.count ? `Услуг в подборке: ${entry.count}` : '', `Сохранено ${savedTime(entry)}`].filter(Boolean).join(' · ');
  useEffect(() => { store?.notify(); }, [store]);
  useEffect(() => {
    if (!status.failed) return undefined;
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [status.failed]);
  if (!store || !target || (!entries.length && !status.failed && !confirmClear)) return null;
  return ReactDOM.createPortal(<div className="draft-recovery-block"><section className={'draft-recovery-notice' + (status.failed ? ' error' : '')} role="status" aria-label="Автосохранённые формы">
    <span className="draft-recovery-icon"><Icon name={status.failed ? 'alertCircle' : confirmClear ? 'trash' : 'checkCircle'} /></span>
    <div className="draft-recovery-content">
      <strong>{status.failed ? 'Автосохранение недоступно' : confirmClear ? 'Удалить все черновики форм?' : entries.length === 1 ? entries[0].title : `Сохранённые черновики форм · ${entries.length}`}</strong>
      <span>{status.failed ? 'Не удалось сохранить данные в браузере. Не закрывайте вкладку.' : confirmClear ? 'Будут удалены автосохранённые формы этого аккаунта в этом браузере.' : entries.length === 1 ? describe(entries[0]) : entries.map((entry) => entry.title).join(' · ')}</span>
    </div>
    {!status.failed && <div className="draft-recovery-actions">{confirmClear ? <><button type="button" className="draft-recovery-delete" onClick={() => { store.clear(); setConfirmClear(false); setExpanded(false); }}>Удалить</button><button type="button" onClick={() => setConfirmClear(false)}>Отмена</button></> : <>
      <button type="button" className="draft-recovery-open" onClick={() => entries.length === 1 ? open(entries[0]) : setExpanded((value) => !value)}>{entries.length === 1 ? 'Открыть черновик' : expanded ? 'Свернуть список' : 'Показать черновики'}</button>
      <button type="button" onClick={() => setConfirmClear(true)}>Очистить все</button>
      <button type="button" className="draft-recovery-dismiss" aria-label="Скрыть сообщение о сохранённых формах" title="Скрыть сообщение" onClick={() => store.dismiss()}><Icon name="x" /></button>
    </>}</div>}
  </section>
  {expanded && !confirmClear && !status.failed && <div className="draft-recovery-list" aria-label="Сохранённые формы">
    {entries.map((entry) => <div className="draft-recovery-row" key={entry.id}><div><strong>{entry.title}</strong><span>{describe(entry)}</span></div><button type="button" onClick={() => open(entry)}>Открыть<Icon name="arrowRight" /></button></div>)}
    <p>Это автосохранение рабочих форм в этом браузере. Черновики квитанций и документов находятся в соответствующих разделах. Перед бронированием проверяются цена и наличие.</p>
  </div>}
  </div>, target);
}
