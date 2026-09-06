import React from 'react';
import { useState, useEffect } from 'react';
import { Icon } from '../../shared/icons/index';
import { ActionMenu, EmptyState } from '../../shared/ui/index';
import { ChatThread, threadUnread } from '../../modules/chats/ui/ChatsPage';

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
  const orderNo = ctx.no || ctx.orderNo || ctx.order || '';
  const orderId = ctx.id || ctx.serverId || ctx.orderId || null;
  const name = ctx.client || ctx.name || (orderNo ? `Заказ № ${orderNo}` : 'Клиент');
  return {
    id: ctx.id && !orderNo ? `chat-${ctx.id}` : `order-${orderNo || orderId || Date.now()}`,
    order: orderNo || orderId || '—',
    orderId,
    type: ctx.type || 'client',
    channel: 'MAX',
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

function GlobalChatDrawer({ open, onClose, contextOrder, initialThreads = [], orders = [], currentUserId, onOpenOrder }) {
  const [extraThreads, setExtraThreads] = useState([]);
  const threads = [...initialThreads, ...extraThreads];
  const matched = findMatchingThread(threads, contextOrder);
  const [activeId, setActiveId] = useState(() => (matched?.id || threads[0]?.id || null));

  useEffect(() => {
    if (!open) return;
    if (contextOrder) {
      const hit = findMatchingThread(threads, contextOrder);
      if (hit) {
        setActiveId(hit.id);
      } else {
        const created = createFallbackThread(contextOrder);
        if (created) {
          setExtraThreads((cur) => cur.some((t) => t.id === created.id) ? cur : [...cur, created]);
          setActiveId(created.id);
        }
      }
    } else if (!activeId && threads[0]) {
      setActiveId(threads[0].id);
    }
  }, [open, contextOrder, initialThreads]);
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;

  const active = threads.find((t) => t.id === activeId) ||
    threads[0];
  if (!active) return (
    <div className="drawer-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="shell-drawer" style={{ width: 'min(480px,96vw)' }}><button className="modal-close" onClick={onClose}><Icon name="x" /></button><EmptyState icon="chat" title="Чатов пока нет" /></div>
    </div>
  );
  const totalUnread = (t) => threadUnread(t);
  const goOrder = (t) => { const o = orders.find((x) => x.no === t.order); onClose(); o && onOpenOrder(o); };
  const recipients = threads.filter((thread) => thread.order === active.order);
  const switchThread = (t) => {
    if (t.virtual) { const real = { ...t, virtual: false }; setExtraThreads((cur) => [...cur, real]); setActiveId(real.id); }
    else setActiveId(t.id);
  };

  const ord = orders.find((x) => x.no === active.order);
  const meta = [active.client || active.name, ord && ord.requestType, (ord && ord.operator) && ('отв. ' + ord.operator)].filter(Boolean);

  return (
    <div className="drawer-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="shell-drawer" style={{ width: 'min(480px,96vw)' }}>
        <div className="drawer-head" style={{ padding: '14px 22px', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
              <h2 className="modal-title" style={{ fontSize: 20 }}>Чат</h2>
              <ActionMenu
                trigger={<button className="chip" style={{ height: 34 }}>№ {active.order}<Icon name="chevDown" /></button>}
                items={threads.map((t) => ({ icon: 'chat', label: '№ ' + t.order + ' · ' + t.name + (totalUnread(t) ? '  (' + totalUnread(t) + ')' : ''), onClick: () => setActiveId(t.id) }))} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button className="icon-btn" title="Открыть заказ" onClick={() => goOrder(active)}><Icon name="orders" /></button>
              <button className="modal-close" onClick={onClose}><Icon name="x" /></button>
            </div>
          </div>
          {meta.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 13, color: 'var(--muted)' }}>
              {meta.map((m, i) => (
                <React.Fragment key={i}>{i > 0 && <span style={{ color: 'var(--faint)' }}>·</span>}<span>{m}</span></React.Fragment>
              ))}
            </div>
          )}
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <ChatThread thread={active} currentUserId={currentUserId} embedded onOpenOrder={() => goOrder(active)} recipients={recipients} onSwitchThread={switchThread} />
        </div>
      </div>
    </div>
  );
}

export { findMatchingThread, createFallbackThread, GlobalChatDrawer };
