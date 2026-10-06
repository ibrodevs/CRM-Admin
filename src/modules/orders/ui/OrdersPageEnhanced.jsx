import { useEffect, useState } from 'react';
import { Icon } from '../../../shared/icons/index.jsx';
import { ActionMenu } from '../../../shared/ui/ActionMenu.jsx';
import { Button } from '../../../shared/ui/Button.jsx';
import { Checkbox } from '../../../shared/ui/Checkbox.jsx';
import { EmptyState } from '../../../shared/ui/EmptyState.jsx';
import { FilterChip } from '../../../shared/ui/FilterChip.jsx';
import { Pill } from '../../../shared/ui/Pill.jsx';
import { SearchBox } from '../../../shared/ui/SearchBox.jsx';
import { Th, useSort } from '../../../shared/ui/Table.jsx';
import { useToast } from '../../../shared/ui/Toast.jsx';
import { Topbar } from '../../../shared/ui/Topbar.jsx';
import { ORDER_OPS_SECTIONS } from '../../../shared/constants/navigation.js';
import { proposalsApi } from '../../proposals/api.js';
import { resolveCurrency } from '../../../shared/lib/money.js';
import { moneyRowsText } from '../model/finance.jsx';
import { OrderCard } from './OrderCard.jsx';
import { OrderCreateModal } from './OrdersPage.jsx';

const PAGE_SIZE = 9;
const orderSelectionKey = (order) => String(order?.id || order?.no || '');

const STATUS_TONE = {
  'Новое': 'teal',
  'В работе': 'blue',
  'Ожидает подтверж.': 'amber',
  'Ожидание оплаты': 'amber',
  'Оплачено': 'green',
  'Завершено': 'green',
  'Требует проверки': 'red',
  'На паузе': 'gray',
  'Отменено': 'red',
  'Нет данных': 'gray',
};

function OrdersMultiSelectList({ orders, onOpen, onCreate, onNavigate, currentUser, selectedIds, setSelectedIds }) {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [filters, setFilters] = useState({ status: '', requestType: '', service: '' });
  const { sort, onSort, apply } = useSort(null);
  const [proposalBusy, setProposalBusy] = useState(false);

  const selectedOrders = orders.filter((order) => selectedIds.has(orderSelectionKey(order)));
  const selectedCount = selectedOrders.length;

  const handleEditClick = () => {
    if (selectedCount !== 1) {
      toast(selectedCount ? 'Для редактирования выберите один заказ' : 'Выберите заказ для редактирования', 'info');
      return;
    }
    onOpen(selectedOrders[0], 'edit');
  };

  const createProposalForOrder = async (order) => {
    const proposal = await proposalsApi.create({
      order: order.id,
      type: 'standard',
      purpose: 'Коммерческое предложение',
      currency: resolveCurrency(order.currency),
      variants: [{ name: 'Основной вариант', items: [] }],
    });
    const prepared = await proposalsApi.prepare(proposal.id, proposal.version);
    await proposalsApi.send(prepared.id, prepared.version);
    return proposal;
  };

  const createAndSendProposal = async () => {
    if (!selectedCount) { toast('Выберите хотя бы один заказ', 'info'); return; }
    setProposalBusy(true);
    try {
      const results = await Promise.allSettled(selectedOrders.map(createProposalForOrder));
      const ok = results.filter((item) => item.status === 'fulfilled').length;
      const failed = results.length - ok;
      if (ok) toast(selectedCount === 1 ? 'КП сформировано и отправлено' : `КП сформированы и отправлены: ${ok}`, 'ok');
      if (failed) toast(`Не удалось сформировать КП для ${failed} заказов`, 'err');
    } finally {
      setProposalBusy(false);
    }
  };

  let rows = orders.filter((o) =>
    (String(o.client || '').toLowerCase().includes(search.toLowerCase()) || String(o.no || '').includes(search)) &&
    (!filters.status || o.status === filters.status) &&
    (!filters.requestType || o.requestType === filters.requestType) &&
    (!filters.service || o.service === filters.service));
  rows = apply(rows, { no: (r) => r.no, sum: (r) => r.sum });
  const pageRows = rows.slice(0, visibleCount);

  const statusOptions = [...new Set(orders.map((order) => order.status).filter(Boolean))];
  const requestTypeOptions = [...new Set(orders.map((order) => order.requestType).filter(Boolean))];
  const serviceOptions = [...new Set(orders.map((order) => order.service).filter(Boolean))];

  const currentUserName = String(currentUser?.name || currentUser?.full_name || '').trim().toLowerCase();
  const ownOrders = orders.filter((order) => (currentUser?.id && String(order.operatorId) === String(currentUser.id))
    || (currentUserName && String(order.operator || '').trim().toLowerCase() === currentUserName)).length;

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [search, filters]);

  const toggleOrder = (order) => {
    const key = orderSelectionKey(order);
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const pageKeys = pageRows.map(orderSelectionKey).filter(Boolean);
  const pageAllSelected = pageKeys.length > 0 && pageKeys.every((key) => selectedIds.has(key));
  const pageSomeSelected = pageKeys.some((key) => selectedIds.has(key));
  const filteredAllSelected = rows.length > 0 && rows.every((order) => selectedIds.has(orderSelectionKey(order)));

  const togglePage = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (pageAllSelected) pageKeys.forEach((key) => next.delete(key));
      else pageKeys.forEach((key) => next.add(key));
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      rows.forEach((order) => next.add(orderSelectionKey(order)));
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  return (
    <div className="fade-in">
      <Topbar title="Заказы">
        <div className="topbar-spacer" />
        <ActionMenu
          trigger={<button className="btn btn-secondary"><Icon name="clipboard" />Операции<Icon name="chevDown" /></button>}
          items={(typeof ORDER_OPS_SECTIONS !== 'undefined' ? ORDER_OPS_SECTIONS : []).map((s) => ({ icon: s.icon, label: s.label, onClick: () => onNavigate && onNavigate(s.key) }))} />
        <Button variant="secondary" icon="edit" disabled={selectedCount !== 1} onClick={handleEditClick}>Редактировать</Button>
        <Button variant="secondary" icon="docs" disabled={!selectedCount || proposalBusy} onClick={createAndSendProposal}>
          {proposalBusy ? 'Формирование…' : `Сформировать КП${selectedCount > 1 ? ` (${selectedCount})` : ''}`}
        </Button>
        <Button variant="primary" icon="plus" onClick={onCreate}>Добавить заказ</Button>
      </Topbar>

      <div className="content">
        <div className="orders-access-summary" aria-label="Количество доступных заказов">
          <div><span>Доступно по роли</span><b>{orders.length}</b><small>{currentUser?.role || 'Текущая роль'}</small></div>
          <div><span>Назначено вам</span><b>{ownOrders}</b><small>{currentUser?.name || currentUser?.full_name || 'Текущий оператор'}</small></div>
          <div><span>По текущему фильтру</span><b>{rows.length}</b><small>из доступных заказов</small></div>
        </div>

        <div className="orders-filters" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
          <FilterChip label="Статус" icon="chev" options={statusOptions} value={filters.status} onChange={(v) => setFilters((f) => ({ ...f, status: v }))} />
          <FilterChip label="Заказчик" icon="chev" options={[...new Set(orders.map((order) => order.client).filter(Boolean))]} value="" onChange={(v) => setSearch(v === '' ? '' : v)} />
          <FilterChip label="Тип заявки" icon="chev" options={requestTypeOptions} value={filters.requestType} onChange={(v) => setFilters((f) => ({ ...f, requestType: v }))} />
          <FilterChip label="Тип услуги" icon="chev" options={serviceOptions} value={filters.service} onChange={(v) => setFilters((f) => ({ ...f, service: v }))} />
          <div className="topbar-spacer" />
          <SearchBox value={search} onChange={setSearch} style={{ width: 280 }} />

          {selectedCount > 0 && (
            <div role="status" aria-live="polite" style={{
              flexBasis: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 12, padding: '10px 12px', border: '1px solid var(--blue)', borderRadius: 12,
              background: 'var(--blue-soft)', color: 'var(--ink)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <span style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--blue)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 28px' }}>
                  <Icon name="check" style={{ width: 15, height: 15 }} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <b style={{ display: 'block', fontSize: 13.5 }}>Выбрано заказов: {selectedCount}</b>
                  <span style={{ display: 'block', marginTop: 1, fontSize: 12, color: 'var(--muted)' }}>Выбор сохраняется при открытии заказа и возвращении к списку.</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {!filteredAllSelected && rows.length > 0 && <Button size="sm" variant="secondary" onClick={selectAllFiltered}>Выбрать все по фильтру ({rows.length})</Button>}
                <Button size="sm" variant="secondary" onClick={clearSelection}>Снять выбор</Button>
              </div>
            </div>
          )}
        </div>

        <div className="table-card">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 46 }} title={pageSomeSelected && !pageAllSelected ? 'Выбрана часть заказов на странице' : 'Выбрать заказы на странице'}>
                  <Checkbox on={pageAllSelected} onChange={togglePage} />
                </th>
                <Th label="№" col="no" sort={sort} onSort={onSort} style={{ width: 80 }} />
                <th>Дата</th><th>Клиент</th><th>Тип заявки</th><th>Статус заказа</th><th>Тип услуги</th>
                <th>Ответственное лицо</th>
                <Th label="Сумма" col="sum" sort={sort} onSort={onSort} />
                <th>Кол-во услуг</th>
              </tr>
            </thead>
            {pageRows.length === 0
              ? <tbody><tr><td colSpan={10}><EmptyState title="Заказы не найдены" sub="Измените параметры поиска или фильтры" /></td></tr></tbody>
              : <tbody>
                {pageRows.map((o) => {
                  const checked = selectedIds.has(orderSelectionKey(o));
                  return (
                    <tr key={o.id} style={{ cursor: 'pointer', background: checked ? 'var(--blue-soft)' : undefined }} onClick={() => onOpen(o)}>
                      <td onClick={(e) => e.stopPropagation()}>
                        <Checkbox on={checked} onChange={() => toggleOrder(o)} />
                      </td>
                      <td className="t-strong">{o.no}</td>
                      <td><span className="order-list-date"><Icon name="calendar" />{o.date || '—'}</span></td>
                      <td className="t-strong">{o.client}</td>
                      <td><Pill tone="blue">{o.requestType}</Pill></td>
                      <td><Pill tone={STATUS_TONE[o.status] || 'gray'}>{o.status}</Pill></td>
                      <td><Pill tone="blue">{o.service}</Pill></td>
                      <td><div className="t-strong">{o.operator}</div><div className="t-sub">{o.operatorRole}</div></td>
                      <td className="t-strong">{moneyRowsText(o.totals || [{ amount: o.sum, currency: o.currency }], o.currency)}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {o.services} <span className="info-dot">i</span>
                          <button className="icon-btn" style={{ color: 'var(--amber)' }} onClick={(e) => { e.stopPropagation(); onNavigate && onNavigate('chats'); }}><Icon name="chat" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>}
          </table>
          {visibleCount < rows.length && <div className="orders-load-more">
            <Button variant="secondary" icon="chevDown" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
              Загрузить ещё ({Math.min(PAGE_SIZE, rows.length - visibleCount)})
            </Button>
            <span>Показано {Math.min(visibleCount, rows.length)} из {rows.length}</span>
          </div>}
        </div>
      </div>
    </div>
  );
}

function OrdersPage({ intent, onConsume, orders, clients = [], companies = [], addOrder, onOrderUpdated, onDetailChange, onOpenChat, onNavigate, currentUser }) {
  const [detail, setDetailRaw] = useState(null);
  const [detailTab, setDetailTab] = useState(null);
  const [detailSvc, setDetailSvc] = useState(null);
  const [svcSearch, setSvcSearch] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createCustomer, setCreateCustomer] = useState(null);
  const [fresh, setFresh] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const setDetail = (o, tab, svc) => {
    setFresh(false);
    setDetailRaw(o);
    setDetailTab(tab || null);
    setDetailSvc(svc || null);
    setSvcSearch(null);
    onDetailChange && onDetailChange(o);
  };

  const handleCreated = (o, searchKind) => {
    onOrderUpdated?.(o);
    setCreateOpen(false);
    setFresh(true);
    setDetailRaw(o);
    setDetailTab('services');
    setDetailSvc(null);
    setSvcSearch(searchKind || null);
    onDetailChange && onDetailChange(o);
  };

  useEffect(() => {
    setSelectedIds((current) => {
      const valid = new Set(orders.map(orderSelectionKey));
      return new Set([...current].filter((key) => valid.has(key)));
    });
  }, [orders]);

  useEffect(() => {
    if (!intent) return;
    if (intent.type === 'create') { setCreateCustomer(intent.customer || null); setCreateOpen(true); }
    if (intent.type === 'open') setDetail(intent.order, intent.tab, intent.svc);
    if (intent.type === 'list') setDetail(null);
    onConsume();
  }, [intent]);

  if (detail) {
    const company = companies.find((item) => String(item.id) === String(detail.client_company));
    return <OrderCard key={detail.id} onOrderUpdated={onOrderUpdated} order={detail} company={company} clients={clients} fresh={fresh} initTab={detailTab} initSvc={detailSvc} initSvcSearch={svcSearch} onBack={() => { setDetail(null); onDetailChange && onDetailChange(null); }} onOpenChat={onOpenChat} />;
  }

  return (
    <>
      <OrdersMultiSelectList
        orders={orders}
        onOpen={setDetail}
        onCreate={() => { setCreateCustomer(null); setCreateOpen(true); }}
        onNavigate={onNavigate}
        currentUser={currentUser}
        selectedIds={selectedIds}
        setSelectedIds={setSelectedIds}
      />
      <OrderCreateModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={handleCreated} initialCustomer={createCustomer} clientOptions={clients} companyOptions={companies} />
    </>
  );
}

export { OrdersMultiSelectList, OrdersPage };
