import React from 'react';
import { useState, useEffect } from 'react';
import { Icon } from '../../shared/icons/index.jsx';
import { ActionMenu } from '../../shared/ui/ActionMenu.jsx';
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
    if (byOrder) return byOrder;
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

function GlobalChatDrawer({ open, onClose, contextOrder, initialThreads = [], orders = [], orderServices = [], users = [], currentUserId, onOpenOrder }) {
  const [extraThreads, setExtraThreads] = useState([]);
  const [infoOpen, setInfoOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const threads = [
    ...initialThreads,
    ...extraThreads.filter((extra) => !initialThreads.some((thread) => String(thread.id) === String(extra.id))),
  ];
  // Карточка заказа передаёт тред в формате сервера. Без приведения он принимался
  // за заказ и превращался в заглушку с UUID в заголовке, куда нельзя отправить файл.
  const fromServer = isBackendThread(contextOrder);
  const target = fromServer ? toUiThread(contextOrder) : contextOrder;
  const isThread = fromServer || (target && Object.hasOwn(target, 'orderId'));
  const lookup = (list) => (isThread
    ? list.find((t) => String(t.id) === String(target.id))
    : findMatchingThread(list, target));
  const [activeId, setActiveId] = useState(() => (lookup(threads)?.id || threads[0]?.id || null));

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
  }, [open, contextOrder, initialThreads]);
  useEffect(() => { setInfoOpen(false); setTaskOpen(false); setHistoryOpen(false); }, [activeId, open]);
  const active = threads.find((t) => t.id === activeId) || threads[0];

  const totalUnread = (t) => threadUnread(t);
  const relatedOrder = (t) => orders.find((item) => String(item.id) === String(t?.orderId) || String(item.no) === String(t?.order));
  const goOrder = (t, tab, serviceId) => { const order = relatedOrder(t); if (order) { onClose(); onOpenOrder?.(order, tab, serviceId); } };
  const recipients = active?.order && active.order !== '—' ? threads.filter((thread) => thread.order === active.order) : active ? [active] : [];
  const switchThread = (t) => {
    if (t.virtual) { const real = { ...t, virtual: false }; setExtraThreads((cur) => [...cur, real]); setActiveId(real.id); }
    else setActiveId(t.id);
  };

  const ord = relatedOrder(active);
  const services = ord ? orderServices.filter((service) => String(service.orderId || service.order) === String(ord.id)) : [];
  const meta = [ord && `Заказ № ${ord.no}`, ord?.operator && `отв. ${ord.operator}`].filter(Boolean).join(' · ');
  return <>
    <Drawer open={open} onClose={onClose} title="Чат" sub={meta} width="min(620px,100vw)" className="chat-conversation-drawer" showDraftNotice={false}>
      {active ? <>
        <div className="chat-drawer-toolbar">
          <ActionMenu trigger={<button type="button" className="chip chat-switch-trigger"><span>{active.order && active.order !== '—' ? '№ ' + orderRef(active.order) : active.name}</span><Icon name="chevDown" /></button>}
            items={threads.map((thread) => ({ icon: 'chat', label: thread.name + (totalUnread(thread) ? ` (${totalUnread(thread)})` : ''), onClick: () => setActiveId(thread.id) }))} />
          <div className="chat-drawer-actions">
            {ord && <button type="button" className="icon-btn" title="Открыть заказ" onClick={() => goOrder(active)}><Icon name="orders" /></button>}
            <button type="button" className="icon-btn" title="Информация о чате" onClick={() => setInfoOpen(true)}><Icon name="alertCircle" /></button>
          </div>
        </div>
        <div className="chat-drawer-conversation">
          <ChatThread thread={active} currentUserId={currentUserId} embedded orders={orders} services={services} users={users}
            onOpenOrder={() => goOrder(active)} onOpenService={(id) => goOrder(active, 'services', id)}
            recipients={recipients} onSwitchThread={switchThread} onOpenTask={() => setTaskOpen(true)} onOpenHistory={() => setHistoryOpen(true)} />
        </div>
      </> : <EmptyState icon="chat" title="Чатов пока нет" />}
    </Drawer>
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
