import { useEffect, useRef, useState } from 'react';
import { listAll } from '../../../shared/api/operations.js';
import { Drawer } from '../../../shared/ui/Overlays.jsx';
import { SearchBox } from '../../../shared/ui/SearchBox.jsx';
import { Button } from '../../../shared/ui/Button.jsx';
import { Icon } from '../../../shared/icons/index.jsx';
import { ENTITY_LABELS, entityRow, entitySelection } from '../model/entity-choice.js';

const endpoints = { person: 'persons/', company: 'companies/', order: 'orders/' };
export function EntityPicker({ open, title = 'Клиент или заказ', sub, modes = ['person', 'company', 'order'], initialMode, orderOptions, clientOptions, companyOptions, onClose, onPick }) {
  const [tab, setTab] = useState(initialMode && modes.includes(initialMode) ? initialMode : modes[0]);
  const [query, setQuery] = useState('');
  const [loaded, setLoaded] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [count, setCount] = useState(30);
  const search = useRef(null);
  const supplied = { person: clientOptions, company: companyOptions, order: orderOptions };
  useEffect(() => { if (open) { setTab(initialMode && modes.includes(initialMode) ? initialMode : modes[0]); setQuery(''); setCount(30); } }, [open]);
  useEffect(() => {
    if (!open || !endpoints[tab] || Array.isArray(supplied[tab]) || loaded[tab]) { setLoading(false); setError(''); return; }
    const controller = new AbortController(); setLoading(true); setError('');
    listAll(endpoints[tab], {}, controller.signal).then(rows => { if (!controller.signal.aborted) setLoaded(current => ({ ...current, [tab]: Array.isArray(rows) ? rows : rows.results || [] })); }).catch(e => { if (!controller.signal.aborted && e.name !== 'AbortError') setError(e.message || 'Не удалось загрузить список'); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [open, tab, retry, orderOptions, clientOptions, companyOptions]);
  useEffect(() => { if (open) search.current?.focus({ preventScroll: true }); }, [open, tab]);
  const rows = (supplied[tab] || loaded[tab] || []).map(row => entityRow(tab, row)).filter(row => `${row.name} ${row.hint} ${row.id}`.toLocaleLowerCase('ru').includes(query.toLocaleLowerCase('ru')));
  const pick = row => onPick(entitySelection(tab, row));
  return <Drawer open={open} onClose={onClose} title={title} sub={sub} width="min(640px,96vw)" className="entity-picker-drawer" footer={<><span className="entity-picker-count">{tab !== 'new' ? `Найдено: ${rows.length}` : 'Без существующего заказа'}</span><Button variant="secondary" onClick={onClose}>Закрыть</Button></>}>
    {modes.length > 1 && <div className="seg-toggle entity-picker-modes" role="tablist" aria-label="Что выбрать">{modes.map(mode => <button key={mode} type="button" role="tab" aria-selected={mode === tab} className={`seg-btn${mode === tab ? ' active' : ''}`} onClick={() => { setTab(mode); setQuery(''); setCount(30); setError(''); }}>{ENTITY_LABELS[mode]}</button>)}</div>}
    {tab === 'new' ? <div className="entity-picker-empty"><p>Сначала выберите «Новый заказ». Заказ будет создан только после заполнения и подтверждения формы.</p><Button onClick={() => onPick({ mode: 'new', label: 'Новый заказ' })}>Выбрать новый заказ</Button></div> : <>
      <SearchBox inputRef={search} value={query} onChange={value => { setQuery(value); setCount(30); }} placeholder={tab === 'order' ? 'Номер заказа, клиент, маршрут…' : tab === 'company' ? 'Название, ИНН, контакт…' : 'Имя, телефон, e-mail…'} style={{ width: '100%', marginBottom: 16 }} />
      {loading && <p role="status">Загружаем список…</p>}
      {error && <div role="alert" className="entity-picker-error">{error}<Button variant="secondary" size="sm" onClick={() => setRetry(n => n + 1)}>Повторить</Button></div>}
      <div className="entity-picker-list" aria-busy={loading}>{!loading && rows.slice(0, count).map(row => <button key={row.id} type="button" className="entity-picker-row" onClick={() => pick(row)}><span className="entity-picker-icon"><Icon name={tab === 'order' ? 'briefcase' : tab === 'company' ? 'building' : 'user'} /></span><span><strong>{row.name}</strong><small>{row.hint || (tab === 'person' ? 'Контакты не указаны' : tab === 'company' ? 'Реквизиты не указаны' : 'Клиент не указан')}</small></span><Icon name="chevRight" /></button>)}</div>
      {!loading && !error && !rows.length && <p className="entity-picker-empty">Ничего не найдено. Измените поисковый запрос.</p>}
      {count < rows.length && <Button variant="secondary" onClick={() => setCount(n => n + 30)}>Показать ещё</Button>}
    </>}
  </Drawer>;
}
