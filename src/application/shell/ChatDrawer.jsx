import React from 'react';
import { useState, useEffect } from 'react';
import { Icon } from '../../shared/icons/index.jsx';
import { UnifiedBindPicker } from '../../modules/clients/index.js';
import { SearchBox } from '../../shared/ui/SearchBox.jsx';
import { communicationsApi } from '../../modules/chats/api/communicationsApi.js';
import { enrichChatThread } from '../../modules/chats/model/chat-registry.js';
import { Drawer } from '../../shared/ui/Overlays.jsx';
import { EmptyState } from '../../shared/ui/EmptyState.jsx';
import { ChatThread, ChatInfoPanel, ChatTaskDrawer, ChatHistoryDrawer, isBackendThread, isUuid, orderRef, threadUnread, toUiThread } from '../../modules/chats/index.js';

function findMatchingThread(threads, ctx) {
  if (!ctx || !Array.isArray(threads) || !threads.length) return null;
  if (ctx.id && threads.some((t) => String(t.id) === String(ctx.id))) {
    return threads.find((t) => String(t.id) === String(ctx.id));
  }
  const orderNo = String(ctx.no || ctx.orderNo || ctx.order || '');
  const orderId = String(ctx.id || ctx.serverId || ctx.orderId || '');
  const clientName = (ctx.client || ctx.name || '').trim().toLowerCase();

  if (orderNo || orderId) {
    const byOrder = threads.find((t) => {
      const tNo = String(t.order || '');
      const tId = String(t.orderId || '');
      if (orderNo && (tNo === orderNo || tId === orderNo)) return true;
      if (orderId && (tId === orderId || tNo === orderId)) return true;
      return false;
    });
    if (byOrder) return threads.find((thread) => thread.type === 'client' && ((orderNo && (String(thread.order) === orderNo || String(thread.orderId) === orderNo)) || (orderId && (String(thread.orderId) === orderId || String(thread.order) === orderId)))) || byOrder;
    return null;
  }

  if (clientName) {
    const byName = threads.find((t) => {
      const c1 = (t.client || '').trim().toLowerCase();
      const c2 = (t.name || '').trim().toLowerCase();
      return c1 === clientName || c2 === clientName;
    });
    if (byName) return byName;
  }

  return null;
}

function createFallbackThread(ctx) {
  if (!ctx) return null;
  // В заголовок попадает номер заказа, а не его UUID.
  const orderNo = [ctx.no, ctx.orderNo, ctx.order].find((value) => value && !isUuid(value)) || '';
  const orderId = ctx.id || ctx.serverId || ctx.orderId || (isUuid(ctx.order) ? ctx.order : null);
  const name = ctx.client || ctx.name || (orderNo ? `Заказ № ${orderNo}` : 'Клиент');
  return {
    id: ctx.id && !orderNo ? `chat-${ctx.id}` : `order-${orderNo || orderId || Date.now()}`,
    order: orderNo || orderId || '—',
    orderId,
    type: ctx.type || 'client',
    channel: 'CRM',
    name,
    client: ctx.client || ctx.name || name,
    online: '—',
    unread: 0,
    pinned: false,
    connectionStatus: 'Подключено',
    responsibleOperator: ctx.operator || '',
    relatedServices: [],
    participants: [{ name, role: 'Клиент' }],
    messages: [],
    internal: [],
    virtual: true,
  };
}

function GlobalChatDrawer({ open, onClose, contextOrder, initialThreads = [], orders = [], orderServices = [], users = [], clients = [], currentUserId, onOpenOrder }) {
  const [extraThreads, setExtraThreads] = useState([]);
  const [infoOpen, setInfoOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [orderPickerOpen, setOrderPickerOpen] = useState(false);
  const [conversationPickerOpen, setConversationPickerOpen] = useState(false);
  const [conversationSearch, setConversationSearch] = useState('');
  const [members, setMembers] = useState({});
  const sourceThreads = [
    ...initialThreads,
    ...extraThreads.filter((extra) => !initialThreads.some((thread) => String(thread.id) === String(extra.id))),
  ];
  const threads = sourceThreads.map((thread) => enrichChatThread(isBackendThread(thread) ? toUiThread(thread) : thread, { orders, services: orderServices, users, clients, participants: members[thread.id] }));
  // Карточка заказа передаёт тред в формате сервера. Без приведения он принимался
  // за заказ и превращался в заглушку с UUID в заголовке, куда нельзя отправить файл.
  const fromServer = isBackendThread(contextOrder);
  const target = fromServer ? toUiThread(contextOrder) : contextOrder;
  const isThread = fromServer || (target && Object.hasOwn(target, 'orderId'));
  const lookup = (list) => (isThread
    ? list.find((t) => String(t.id) === String(target.id))
    : findMatchingThread(list, target));
  const [activeId, setActiveId] = useState(() => (lookup(threads)?.id || threads[0]?.id || null));

  const targetKey = target ? `${isThread ? 'thread' : 'order'}/${target.id || target.orderId || target.no || target.order || ''}` : '';
  useEffect(() => {
    if (!open) return;
    if (target) {
      const hit = lookup(threads);
      if (hit) {
        setActiveId(hit.id);
      } else {
        const created = isThread ? target : createFallbackThread(target);
        if (created) {
          setExtraThreads((cur) => cur.some((t) => t.id === created.id) ? cur : [...cur, created]);
          setActiveId(created.id);
        }
      }
    } else if (!activeId && threads[0]) {
      setActiveId(threads[0].id);
    }
  }, [open, targetKey]);
  useEffect(() => { setInfoOpen(false); setTaskOpen(false); setHistoryOpen(false); }, [activeId, open]);
  useEffect(() => { if (open && !activeId && threads[0]) setActiveId(threads[0].id); }, [open, activeId, initialThreads]);
  const active = threads.find((t) => String(t.id) === String(activeId)) || threads[0];
  useEffect(() => {
    if (!open || !isUuid(active?.id)) return undefined;
    const controller = new AbortController();
    communicationsApi.participants(active.id, controller.signal).then((payload) => {
      if (!controller.signal.aborted) setMembers((current) => ({ ...current, [active.id]: payload.results || payload }));
    }).catch(() => {});
    return () => controller.abort();
  }, [open, active?.id]);

  const totalUnread = (t) => threadUnread(t);
  const relatedOrder = (t) => orders.find((item) => String(item.id) === String(t?.orderId) || String(item.no) === String(t?.order));
  const goOrder = (t, tab, serviceId) => { const order = relatedOrder(t); if (order) { onClose(); onOpenOrder?.(order, tab, serviceId); } };
  const recipients = active?.orderId ? threads.filter((thread) => String(thread.orderId) === String(active.orderId)) : active?.order && active.order !== '—' ? threads.filter((thread) => thread.order === active.order) : threads;
  const switchThread = (t) => {
    if (!threads.some((thread) => String(thread.id) === String(t.id))) setExtraThreads((current) => [...current, t]);
    setActiveId(t.id);
    setConversationPickerOpen(false);
  };
  const chooseOrder = ({ order }) => {
    if (!order) return;
    const thread = findMatchingThread(threads, order) || createFallbackThread(order);
    switchThread(thread);
    setOrderPickerOpen(false);
  };

  const ord = relatedOrder(active);
  const services = ord ? orderServices.filter((service) => String(service.orderId || service.order) === String(ord.id)) : [];
  const meta = [ord && `Заказ № ${ord.no}`, ord?.operator && `отв. ${ord.operator}`].filter(Boolean).join(' · ');
  return <>
    <Drawer open={open} onClose={onClose} title="Чат" sub={meta} width="min(620px,100vw)" className="chat-conversation-drawer" showDraftNotice={false}>
      {active ? <>
        <div className="chat-drawer-toolbar">
          <button type="button" className="chip chat-switch-trigger" onClick={() => setOrderPickerOpen(true)} title="Выбрать заказ в боковом окне"><Icon name="orders" /><span>{active.order && active.order !== '—' ? '№ ' + orderRef(active.order) : 'Выбрать заказ'}</span><Icon name="chevRight" /></button>
          <div className="chat-drawer-actions">
            {ord && <button type="button" className="icon-btn" title="Открыть заказ" onClick={() => goOrder(active)}><Icon name="orders" /></button>}
            <button type="button" className="icon-btn" title="Информация о чате" onClick={() => setInfoOpen(true)}><Icon name="alertCircle" /></button>
          </div>
        </div>
        <div className="chat-drawer-conversation">
          <ChatThread key={active.id} thread={active} currentUserId={currentUserId} embedded orders={orders} services={services} users={users}
            onOpenOrder={() => goOrder(active)} onOpenService={(id) => goOrder(active, 'services', id)}
            recipients={recipients} onThreadResolved={(resolved) => { setExtraThreads((current) => [...current.filter((thread) => thread.id !== active.id && thread.id !== resolved.id), resolved]); setActiveId(resolved.id); }} onSwitchThread={switchThread} onChooseRecipient={() => { setConversationSearch(''); setConversationPickerOpen(true); }} onOpenTask={() => setTaskOpen(true)} onOpenHistory={() => setHistoryOpen(true)} />
        </div>
      </> : <EmptyState icon="chat" title="Чатов пока нет" />}
    </Drawer>
    {open && <UnifiedBindPicker open={orderPickerOpen} title="Выбрать заказ для чата" sub="Найдите заказ по номеру или клиенту" modes={['order']} orderOptions={orders} onClose={() => setOrderPickerOpen(false)} onPick={chooseOrder} />}
    {open && <Drawer open={conversationPickerOpen} onClose={() => setConversationPickerOpen(false)} title="Переписки заказа" width="min(560px,96vw)">
      <SearchBox value={conversationSearch} onChange={setConversationSearch} placeholder="Клиент, поставщик или маршрут…" style={{ width: '100%', marginBottom: 12 }} />
      <div className="chat-conversation-picker">{recipients.filter((thread) => [thread.name, thread.client, thread.route, thread.channel].join(' ').toLocaleLowerCase('ru').includes(conversationSearch.toLocaleLowerCase('ru'))).map((thread) => <button type="button" key={thread.id} className={'chat-conversation-option' + (thread.id === active?.id ? ' is-active' : '')} onClick={() => switchThread(thread)}>
        <strong>{thread.name}</strong><span>{[thread.type === 'supplier' ? 'Поставщик' : thread.type === 'internal' || thread.type === 'operator' ? 'Сотрудники' : 'Клиент', thread.channel, thread.route].filter(Boolean).join(' · ')}</span><span>{thread.last || 'Сообщений пока нет'}</span>{totalUnread(thread) > 0 && <b>Новых сообщений: {totalUnread(thread)}</b>}
      </button>)}</div>
      {!recipients.length && <EmptyState icon="chat" title="Переписок пока нет" />}
    </Drawer>}
    {open && active && <>
      <Drawer open={infoOpen} onClose={() => setInfoOpen(false)} title="Информация о чате" width="min(460px,100vw)" showDraftNotice={false}>
        <ChatInfoPanel thread={active} orders={orders} orderServices={services} users={users} onOpenOrder={() => goOrder(active)} onOpenService={(id) => goOrder(active, 'services', id)} onOpenTask={() => setTaskOpen(true)} onOpenHistory={() => setHistoryOpen(true)} />
      </Drawer>
      <ChatTaskDrawer open={taskOpen} onClose={() => setTaskOpen(false)} thread={active} orders={orders} users={users} />
      <ChatHistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} thread={active} />
    </>}
  </>;

}

export { findMatchingThread, createFallbackThread, GlobalChatDrawer };
