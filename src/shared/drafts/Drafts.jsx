import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Icon } from '../icons/index.jsx';
import { createDraftStore } from './store.js';
import { draftsForRoute, DRAFT_STAGES, filterDrafts } from './workspaces.js';
import { Select } from '../ui/Select.jsx';
const DraftContext = createContext(null);
const ScopeContext = createContext('');
export function DraftScope({ name, children }) {
  const parent = useContext(ScopeContext);
  return <ScopeContext.Provider value={[parent, name].filter(Boolean).join('/')}>{children}</ScopeContext.Provider>;
}
const emptyLocations = [];
const emptyStatus = { restored: false, failed: false };

export function DraftProvider({ owner, children }) {
  const store = useMemo(() => {
    if (!owner || typeof window === 'undefined') return null;
    // Keep failures visible when browser storage is blocked.
    const storage = { getItem: (key) => window.localStorage.getItem(key), setItem: (key, value) => window.localStorage.setItem(key, value), removeItem: (key) => window.localStorage.removeItem(key) };
    return createDraftStore(new Proxy(storage, { ownKeys: () => Object.keys(window.localStorage), getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }) }), owner);
  }, [owner]);
  return <DraftContext.Provider value={store}>{children}</DraftContext.Provider>;
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
export function useRecentLocations(kind = 'general') {
  const store = useContext(DraftContext);
  const [local, setLocal] = useState(emptyLocations);
  const subscribe = useCallback((fn) => store ? store.subscribe(fn) : () => {}, [store]);
  const snapshot = useCallback(() => store ? store.read('location-history', kind, emptyLocations) : emptyLocations, [store, kind]);
  const recent = useSyncExternalStore(subscribe, snapshot, () => emptyLocations);
  const remember = (option) => {
    const current = store ? store.read('location-history', kind, emptyLocations) : local;
    const id = (item) => String(item.value || item.id || item.title || item.label || '').trim().toLocaleLowerCase('ru');
    const next = [option, ...current.filter((item) => id(item) !== id(option))].slice(0, 4);
    if (store) store.write('location-history', kind, next); else setLocal(next);
  };
  return [store ? recent : local, remember];
}
export function useDraftControls(scope = '') {
  const store = useContext(DraftContext);
  const prefix = useContext(ScopeContext);
  scope = [prefix, scope].filter(Boolean).join('/');
  return useMemo(() => ({ clear: () => store?.clear(scope), hasWork: (searchKind) => store?.hasWork?.(scope, searchKind) ?? store?.workspaces().some((entry) => !scope || entry.scope === scope || entry.scope.startsWith(scope + '/')) ?? false, has: (field) => store?.has(scope, field) || false }), [store, scope]);
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
// Saved work is part of its workspace, independent of dismissed notifications.
export function DraftWorkspaceList({ route = 'dashboard', className = '', extraEntries = [], showEmpty = false }) {
  const store = useContext(DraftContext);
  const status = useDraftStatus();
  const [pendingDelete, setPendingDelete] = useState(null);
  const [collapsed, setCollapsed] = useDraftState('workspace-display', 'draftsCollapsed', false);
  const [stage, setStage] = useState('');
  const [category, setCategory] = useState('');
  const [service, setService] = useState('');
  const listId = useId();
  const entries = useMemo(() => [...new Map([...draftsForRoute(store?.workspaces?.() || [], route), ...extraEntries].map(entry => [entry.id, entry])).values()].sort((a, b) => b.savedAt - a.savedAt), [store, status, route, extraEntries]);
  const visible = filterDrafts(entries, { stage, service, category });
  const services = [...new Set(entries.flatMap(entry => entry.services))].sort();
  if (!entries.length && !showEmpty) return null;
  return <section className={'card draft-workspace' + (collapsed ? ' is-collapsed' : '') + ' ' + className} aria-label="Черновики">
    <header className="draft-workspace-head"><button type="button" className="draft-workspace-toggle" aria-expanded={!collapsed} aria-controls={listId} onClick={() => { setCollapsed(!collapsed); setPendingDelete(null); }}><span className="draft-workspace-title">Черновики <span>{entries.length}</span></span><span className="draft-workspace-toggle-action">{collapsed ? 'Показать' : 'Свернуть'}<Icon name={collapsed ? 'chevDown' : 'chevUp'} /></span></button>{!collapsed && <p>Сохранённые поиски, формы и предложения. Перед бронированием проверим цену и наличие.</p>}</header>
    <div className="draft-workspace-list" id={listId} hidden={collapsed}>
      <div className="draft-workspace-filters"><Select aria-label="Тип черновика" value={category} onChange={e => setCategory(e.target.value)} options={[{value:'',label:'Все типы'},{value:'services',label:'Подбор услуг'},{value:'proposals',label:'Коммерческие предложения'},{value:'orders',label:'Заказы'},{value:'receipts',label:'Квитанции и импорт'}]} />
        <Select aria-label="Этап черновика" value={stage} onChange={e => setStage(e.target.value)} options={[{ value: '', label: 'Все этапы' }, ...DRAFT_STAGES]} />
        <Select aria-label="Услуга черновика" value={service} onChange={e => setService(e.target.value)} options={[{ value: '', label: 'Все услуги' }, ...services.map(value => ({ value, label: value }))]} />
        <span role="status">Найдено: {visible.length} из {entries.length}</span>
        {(stage || service || category) && <button type="button" onClick={() => { setStage(''); setService(''); setCategory(''); }}>Сбросить</button>}
      </div>
      {!visible.length && <p className="draft-workspace-empty">{entries.length ? 'Нет черновиков по выбранным фильтрам.' : 'Сохранённых черновиков пока нет. Они появятся здесь после сохранения КП, подбора услуг или импорта документов.'}</p>}
      {visible.map((entry) => <div className="draft-recovery-row" key={entry.id}>
        <div><strong>{entry.title}</strong><span className="draft-workspace-stage">{DRAFT_STAGES.find(item => item.value === (entry.stage || 'form'))?.label}</span><span>{[entry.services.join(' · '), entry.count ? `Услуг в подборке: ${entry.count}` : '', `Сохранено ${new Date(entry.savedAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`].filter(Boolean).join(' · ')}</span></div>
        {pendingDelete === entry.id ? <div className="draft-workspace-actions"><span>Удалить черновик?</span><button type="button" className="draft-workspace-delete" onClick={() => { if (entry.onDelete) entry.onDelete(); else store.clear(entry.scope); setPendingDelete(null); }}>Удалить</button><button type="button" onClick={() => setPendingDelete(null)}>Отмена</button></div> : <div className="draft-workspace-actions"><button type="button" onClick={() => entry.onContinue ? entry.onContinue() : store.open(entry)}>Продолжить<Icon name="arrowRight" /></button><button hidden={entry.canDelete === false} type="button" className="draft-workspace-delete" title="Удалить черновик" aria-label={`Удалить черновик: ${entry.title}`} onClick={() => setPendingDelete(entry.id)}><Icon name="trash" /></button></div>}
      </div>)}
    </div>
  </section>;
}

export function DraftSaveWarning() {
  const store = useContext(DraftContext);
  const status = useDraftStatus();
  useEffect(() => { store?.notify(); }, [store]);
  useEffect(() => {
    if (!status.failed) return undefined;
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [status.failed]);
  if (!status.failed) return null;
  return <div className="draft-recovery-notice error" role="alert"><span className="draft-recovery-icon"><Icon name="alertCircle" /></span><div className="draft-recovery-content"><strong>Автосохранение недоступно</strong><span>Не удалось сохранить данные в браузере. Не закрывайте вкладку.</span></div></div>;
}
