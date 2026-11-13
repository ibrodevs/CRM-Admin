import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import ReactDOM from 'react-dom';
import { createDraftStore } from './store.js';
const DraftContext = createContext(null);
const ScopeContext = createContext('');
export function DraftScope({ name, children }) {
  const parent = useContext(ScopeContext);
  return <ScopeContext.Provider value={[parent, name].filter(Boolean).join('/')}>{children}</ScopeContext.Provider>;
}
const emptyStatus = { restored: false, failed: false };

export function DraftProvider({ owner, children }) {
  const store = useMemo(() => {
    if (!owner || typeof window === 'undefined') return null;
    // Keep failures visible when browser storage is blocked.
    const storage = { getItem: (key) => window.localStorage.getItem(key), setItem: (key, value) => window.localStorage.setItem(key, value), removeItem: (key) => window.localStorage.removeItem(key) };
    return createDraftStore(new Proxy(storage, { ownKeys: () => Object.keys(window.localStorage), getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }) }), owner);
  }, [owner]);
  return <DraftContext.Provider value={store}>{children}<DraftRecoveryNotice store={store} /></DraftContext.Provider>;
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
export function useDraftStatus() {
  const store = useContext(DraftContext);
  return useSyncExternalStore(store?.subscribe || (() => () => {}), store?.status || (() => emptyStatus), () => emptyStatus);
}
function DraftRecoveryNotice({ store }) {
  const status = useSyncExternalStore(store?.subscribe || (() => () => {}), store?.status || (() => emptyStatus), () => emptyStatus);
  const [confirmClear, setConfirmClear] = useState(false);
  useEffect(() => { store?.notify(); }, [store]);
  useEffect(() => {
    if (!status.failed) return undefined;
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [status.failed]);
  if (!store || (!status.restored && !status.failed && !confirmClear)) return null;
  return ReactDOM.createPortal(<div className={'draft-recovery-notice' + (status.failed ? ' error' : '')} role="status">
    <span>{status.failed ? 'Не удалось сохранить черновик в браузере. Не закрывайте вкладку.' : confirmClear ? 'Удалить сохранённые черновики этого аккаунта в этом браузере?' : 'Черновик восстановлен. Перед бронированием проверим актуальную цену и наличие.'}</span>
    {!status.failed && <div>{confirmClear ? <><button type="button" onClick={() => { store.clear(); setConfirmClear(false); }}>Удалить</button><button type="button" onClick={() => setConfirmClear(false)}>Отмена</button></> : <><button type="button" onClick={() => store.dismiss()}>Продолжить</button><button type="button" onClick={() => setConfirmClear(true)}>Очистить черновики</button></>}</div>}
  </div>, document.body);
}
