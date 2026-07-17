import React, { useState, useEffect, useRef } from 'react';
import { Icon } from './icons';
import { ActionMenu, Button } from './ui';
import { AIR_SERVICES, CHAT_THREADS, CHAT_TYPE_LABEL, CLIENTS_DB, COMPANIES_DB, DOCUMENTS, ORDERS, PERMISSIONS, PROPOSALS, ROLES, SUPPLIERS } from './data';
import { SLA_QUEUE, companyStaffStore } from './data/access-control';
import { NAV_ITEMS, Topbar } from './layout';
import { NotificationsCenter } from './page_notifications';
import { PAX_GROUPS } from './pax_unify';
import { ChatThread, chatRecipients, getThreadForOrder, threadUnread } from './page_chats';
import { ShiftControl } from './page_shifts';






const SERVICE_LABELS = { flights: 'Авиабилеты', rail: 'ЖД билеты', hotels: 'Гостиницы', transfers: 'Трансферы', buses: 'Автобусы', tours: 'Туры' };

const ORDER_OPS_LABELS = { documents: 'Документы', fulfillment: 'Оформление', returns: 'Возвраты и обмены' };
const ROUTE_LABELS = (() => {
  const m = { dashboard: 'Главное', profile: 'Мой профиль', account: 'Настройки аккаунта', ...SERVICE_LABELS, ...ORDER_OPS_LABELS };
  NAV_ITEMS.forEach((it) => {
    if (it.group) { m[it.group] = it.label; it.children.forEach((c) => { m[c.key] = c.label; }); }
    else m[it.key] = it.label;
  });
  return m;
})();
const SERVICE_PARENT = { flights: 1, rail: 1, hotels: 1, transfers: 1, buses: 1, tours: 1 };
const ORDER_OPS_PARENT = { documents: 1, fulfillment: 1, returns: 1 };


const NAV_PERM = {
  orders: 'Просмотр заказов',
  flights: 'Поиск и бронирование услуг', rail: 'Поиск и бронирование услуг', hotels: 'Поиск и бронирование услуг',
  transfers: 'Поиск и бронирование услуг', buses: 'Поиск и бронирование услуг', tours: 'Поиск и бронирование услуг',
  offers: 'Коммерческие предложения',
  finance: 'Просмотр финансов',
  documents: 'Просмотр документов',
  receipts: 'Просмотр документов',
  fulfillment: 'Проведение оплат',
  returns: 'Возвраты и штрафы',
  settings: 'Настройки системы',
};
function roleIdx(role) { return ROLES.indexOf(role); }
function roleHasPerm(role, permKey) {
  const i = roleIdx(role);
  if (i < 0) return true;
  for (const g of PERMISSIONS) for (const it of g.items) if (it.k === permKey) return !!it.r[i];
  return true;
}
function roleCanSee(role, navKey) { const p = NAV_PERM[navKey]; return p ? roleHasPerm(role, p) : true; }

function RoleSwitcher({ role, onRole }) {
  return (
    <ActionMenu
      trigger={<button className="chip" style={{ height: 36 }} title="Текущая роль — интерфейс адаптируется"><Icon name="user" />{role}<Icon name="chevDown" /></button>}
      items={ROLES.map((r) => ({ icon: r === role ? 'check' : 'user', label: 'Войти как: ' + r, onClick: () => onRole(r) }))} />
  );
}

function AccessDenied({ onNavigate }) {
  return (
    <>
      <Topbar title="Нет доступа" />
      <div className="content">
        <div className="card card-pad" style={{ maxWidth: 560, margin: '40px auto', textAlign: 'center', padding: '44px 36px' }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: 'var(--red-bg)', color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
            <Icon name="lock" style={{ width: 28, height: 28 }} />
          </div>
          <h2 className="card-title" style={{ marginBottom: 8 }}>Раздел недоступен для вашей роли</h2>
          <p style={{ color: 'var(--muted)', fontSize: 15, margin: '0 0 22px' }}>Доступ к этому модулю ограничен правами. Обратитесь к администратору или смените роль.</p>
          <Button onClick={() => onNavigate('dashboard')} icon="home">На главную</Button>
        </div>
      </div>
    </>
  );
}

function Breadcrumbs({ route, ctxOrder, onNavigate }) {
  const base = (route || 'dashboard').split('/')[0];
  const crumbs = [{ key: 'dashboard', label: 'Главное' }];
  if (SERVICE_PARENT[base]) crumbs.push({ key: 'services', label: 'Подбор услуг' });
  if (ORDER_OPS_PARENT[base]) crumbs.push({ key: 'orders', label: 'Заказы' });
  if (base !== 'dashboard' && base !== 'services') crumbs.push({ key: base, label: ROUTE_LABELS[base] || base });
  if (base === 'orders' && ctxOrder) crumbs.push({ label: '№ ' + ctxOrder.no + ' · ' + ctxOrder.client });
  return (
    <div className="crumbs">
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1;
        return (
          <React.Fragment key={i}>
            {i > 0 && <Icon name="chevRight" className="crumb-sep" />}
            <span className={'crumb' + (last ? ' cur' : '')}
              onClick={() => { if (!last && !c.noNav && c.key) onNavigate(c.key); }}>{c.label}</span>
          </React.Fragment>
        );
      })}
    </div>
  );
}


const GSEARCH_TONES = {
  person: { bg: 'var(--green-bg)', color: 'var(--green)' },
  employee: { bg: 'var(--blue-soft)', color: 'var(--blue)' },
  company: { bg: 'var(--blue-soft)', color: 'var(--blue)' },
  passenger: { bg: 'var(--amber-bg)', color: 'var(--amber)' },
  order: { bg: 'var(--blue-soft)', color: 'var(--blue)' },
  request: { bg: 'var(--red-bg)', color: 'var(--red)' },
  proposal: { bg: 'var(--amber-bg)', color: 'var(--amber)' },
  ticket: { bg: 'var(--blue-soft)', color: 'var(--blue)' },
  chat: { bg: 'var(--teal-bg)', color: 'var(--teal)' },
  supplier: { bg: 'var(--gray-100)', color: 'var(--muted)' },
  document: { bg: 'var(--gray-100)', color: 'var(--muted)' },
};
function gsSafeArray(v) { return Array.isArray(v) ? v : []; }
function gsNorm(v) { return String(v == null ? '' : v).toLowerCase().replace(/[«»"'№#]/g, '').replace(/\s+/g, ' ').trim(); }
function gsJoin(fields) { return fields.filter((v) => v != null && v !== '').map((v) => String(v)).join(' · '); }
function gsPlural(n, one, few, many) {
  const a = Math.abs(Number(n) || 0) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}
function gsScore(query, fields, weight) {
  const q = gsNorm(query);
  const values = fields.map(gsNorm).filter(Boolean);
  if (!q || !values.length) return 0;
  let best = 0;
  values.forEach((v) => {
    if (v === q) best = Math.max(best, 120);
    else if (v.startsWith(q)) best = Math.max(best, 90);
    else if (v.split(' ').some((p) => p.startsWith(q))) best = Math.max(best, 76);
    else if (v.includes(q)) best = Math.max(best, 54);
  });
  return best ? best + (weight || 0) : 0;
}
function gsOrder(no) { return gsSafeArray(typeof ORDERS !== 'undefined' ? ORDERS : []).find((o) => String(o.no) === String(no)); }
function gsOpenOrderOrRoute(no, onOpenOrder, onNavigate, fallback) {
  const order = gsOrder(no);
  if (order && onOpenOrder) onOpenOrder(order);
  else if (onNavigate) onNavigate(fallback || 'orders');
}
function gsActiveOrdersFor(name) {
  const n = gsNorm(name);
  return gsSafeArray(typeof ORDERS !== 'undefined' ? ORDERS : []).filter((o) => gsNorm(o.client).includes(n) && !['Отменено', 'Оплачено'].includes(o.status));
}
function gsAddResult(list, query, item, fields, weight) {
  const score = gsScore(query, fields, weight);
  if (score) list.push({ ...item, score });
}
function buildGlobalSearchResults(query, handlers) {
  const list = [];
  const onNavigate = handlers.onNavigate;
  const onOpenOrder = handlers.onOpenOrder;
  const onOpenChat = handlers.onOpenChat;
  const clients = gsSafeArray(typeof CLIENTS_DB !== 'undefined' ? CLIENTS_DB : []);
  const companies = gsSafeArray(typeof COMPANIES_DB !== 'undefined' ? COMPANIES_DB : []);
  const orders = gsSafeArray(typeof ORDERS !== 'undefined' ? ORDERS : []);
  const proposals = gsSafeArray(typeof PROPOSALS !== 'undefined' ? PROPOSALS : []);
  const suppliers = gsSafeArray(typeof SUPPLIERS !== 'undefined' ? SUPPLIERS : []);
  const documents = gsSafeArray(typeof DOCUMENTS !== 'undefined' ? DOCUMENTS : []);
  const chats = gsSafeArray(typeof CHAT_THREADS !== 'undefined' ? CHAT_THREADS : []);
  const sla = gsSafeArray(typeof SLA_QUEUE !== 'undefined' ? SLA_QUEUE : []);
  const air = gsSafeArray(typeof AIR_SERVICES !== 'undefined' ? AIR_SERVICES : []);
  const paxGroups = gsSafeArray(typeof PAX_GROUPS !== 'undefined' ? PAX_GROUPS : []);

  clients.forEach((c) => {
    const ordersCount = c.orders || gsActiveOrdersFor(c.name).length;
    gsAddResult(list, query, {
      id: 'client-' + c.id,
      icon: 'user', tone: 'person', title: c.name, type: 'Физическое лицо',
      context: gsJoin([c.phone, c.email]),
      meta: ordersCount + ' ' + gsPlural(ordersCount, 'заказ', 'заказа', 'заказов'),
      action: () => onNavigate && onNavigate('clients'),
    }, [c.name, c.phone, c.email, c.doc, c.id, c.company, c.city, c.type], 18);
  });

  companies.forEach((co) => {
    const debt = co.debt || co.balance || co.limit || '';
    gsAddResult(list, query, {
      id: 'company-' + co.id,
      icon: 'building', tone: 'company', title: co.name, type: 'Компания',
      context: gsJoin([co.city, co.segment || co.type || co.status]),
      meta: debt ? 'Финансы: ' + debt : (co.orders ? ('Заказов: ' + co.orders) : 'Карточка компании'),
      action: () => onNavigate && onNavigate('companies'),
    }, [co.name, co.legalName, co.bin, co.inn, co.phone, co.email, co.city, co.contact, co.director], 16);

    const staff = (typeof companyStaffStore === 'function') ? companyStaffStore(co.id) : null;
    gsSafeArray(staff && staff.employees).forEach((emp, i) => {
      const active = gsActiveOrdersFor(emp.name).length;
      gsAddResult(list, query, {
        id: 'emp-' + co.id + '-' + (emp.id || i),
        icon: 'users', tone: 'employee', title: emp.name, type: 'Сотрудник',
        context: co.name,
        meta: gsJoin([emp.position || emp.role || emp.department, active ? active + ' активн. ' + gsPlural(active, 'заказ', 'заказа', 'заказов') : 'карточка сотрудника']),
        action: () => onNavigate && onNavigate('companies'),
      }, [emp.name, emp.phone, emp.email, emp.doc, emp.docNo, emp.position, emp.department, co.name], 14);
    });
  });

  orders.forEach((o) => {
    gsAddResult(list, query, {
      id: 'order-' + o.no + '-' + o.id,
      icon: 'orders', tone: 'order', title: 'Заказ №' + o.no, type: 'Заказ',
      context: gsJoin([o.client, o.requestType]),
      meta: gsJoin([o.service, o.status, o.sum ? (o.sum + ' ' + (o.currency || '')) : '']),
      action: () => onOpenOrder && onOpenOrder(o),
    }, [o.no, o.id, o.client, o.requestType, o.status, o.service, o.operator], 22);
  });

  sla.forEach((r) => {
    gsAddResult(list, query, {
      id: 'request-' + r.no + '-' + r.operator,
      icon: 'sla', tone: 'request', title: 'Заявка №' + r.no, type: 'Заявка',
      context: r.client,
      meta: 'Ожидает отклик ' + r.waited + ' мин · ответственный ' + r.operator,
      action: () => gsOpenOrderOrRoute(r.no, onOpenOrder, onNavigate, 'orders'),
    }, [r.no, r.client, r.operator, 'заявка ' + r.no], 20);
  });

  proposals.forEach((p) => {
    gsAddResult(list, query, {
      id: 'proposal-' + p.id,
      icon: 'template', tone: 'proposal', title: p.id, type: 'Коммерческое предложение',
      context: gsJoin([p.client, p.order ? 'заказ №' + p.order : '']),
      meta: gsJoin([p.status, p.sum, p.date]),
      action: () => gsOpenOrderOrRoute(p.order, onOpenOrder, onNavigate, 'offers'),
    }, [p.id, p.client, p.order, p.status, p.sum], 19);
  });

  air.forEach((s, i) => {
    const title = s.ticket && s.ticket !== '—' ? 'Билет ' + s.ticket : (s.pnr ? 'Бронь ' + s.pnr : 'Авиасервис №' + (s.no || s.order));
    gsAddResult(list, query, {
      id: 'air-' + (s.id || i),
      icon: 'plane', tone: 'ticket', title, type: 'Билет / бронь',
      context: gsJoin([s.route, s.order ? 'заказ №' + s.order : '']),
      meta: gsJoin([s.supplier, s.dep ? 'вылет ' + s.dep : '', s.status]),
      action: () => gsOpenOrderOrRoute(s.order || s.no, onOpenOrder, onNavigate, 'flights'),
    }, [s.no, s.order, s.ticket, s.pnr, s.route, s.supplier, s.airline, s.client, s.dep], 18);
  });

  paxGroups.forEach((g, gi) => {
    gsSafeArray(g.members).forEach((m, mi) => {
      gsAddResult(list, query, {
        id: 'pax-' + gi + '-' + mi,
        icon: 'user', tone: 'passenger', title: m.name, type: 'Пассажир',
        context: g.name || 'Групповой список',
        meta: gsJoin([m.role, m.dob ? 'д.р. ' + m.dob : '', m.docNo ? 'док. ' + m.docNo : '']),
        action: () => onNavigate && onNavigate('orders'),
      }, [m.name, m.phone, m.docNo, m.docType, m.dob, g.name, g.airline, g.supplier], 15);
    });
  });

  suppliers.forEach((s) => {
    gsAddResult(list, query, {
      id: 'supplier-' + s.name + '-' + s.no,
      icon: 'suppliers', tone: 'supplier', title: s.name, type: 'Поставщик',
      context: gsJoin([s.service, s.orgType || s.type]),
      meta: gsJoin([s.org, s.status, s.currency]),
      action: () => onNavigate && onNavigate('suppliers'),
    }, [s.name, s.org, s.service, s.orgType, s.type, s.no, s.status, s.currency], 13);
  });

  documents.forEach((d, i) => {
    gsAddResult(list, query, {
      id: 'doc-' + d.no + '-' + i,
      icon: 'docs', tone: 'document', title: d.type + ' · заказ №' + d.no, type: 'Документ',
      context: d.client,
      meta: gsJoin([d.org, d.status, d.sum]),
      action: () => gsOpenOrderOrRoute(d.no, onOpenOrder, onNavigate, 'documents'),
    }, [d.no, d.client, d.org, d.stage, d.type, d.sum, d.status], 12);
  });

  chats.forEach((t) => {
    const last = gsSafeArray(t.messages).slice(-1)[0];
    gsAddResult(list, query, {
      id: 'chat-' + t.id,
      icon: 'chat', tone: 'chat', title: t.name, type: 'Чат',
      context: gsJoin([t.order ? 'заказ №' + t.order : '', (typeof CHAT_TYPE_LABEL !== 'undefined' && CHAT_TYPE_LABEL[t.type]) || t.type, t.channel]),
      meta: gsJoin([t.client, last && (last.text || (last.attach && last.attach.name)), t.unread ? 'новых: ' + t.unread : '']),
      action: () => onOpenChat ? onOpenChat() : (onNavigate && onNavigate('chats')),
    }, [t.name, t.client, t.supplier, t.order, t.channel, t.type, t.responsibleOperator, last && last.text], 11);
  });

  const seen = new Set();
  return list
    .sort((a, b) => b.score - a.score || a.type.localeCompare(b.type) || a.title.localeCompare(b.title))
    .filter((r) => { if (seen.has(r.id)) return false; seen.add(r.id); return true; });
}
function GlobalSearch({ onOpenOrder, onNavigate, onOpenChat }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  useEffect(() => {
    const h = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); ref.current && ref.current.querySelector('input').focus(); setOpen(true); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const ql = q.trim();
  const allHits = ql ? buildGlobalSearchResults(ql, { onOpenOrder, onNavigate, onOpenChat }) : [];
  const hits = allHits.slice(0, 7);
  const empty = ql && !allHits.length;
  const pick = (fn) => { if (fn) fn(); setOpen(false); setQ(''); };

  return (
    <div className="gtop-search" ref={ref}>
      <div className="search" style={{ width: '100%' }}>
        <Icon name="search" />
        <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
          placeholder="Глобальный поиск: клиент, заказ, билет, документ…   ⌘K" />
      </div>
      {open && ql && (
        <div className="gsearch-pop scroll">
          {hits.map((r) => {
            const tone = GSEARCH_TONES[r.tone] || GSEARCH_TONES.document;
            return (
              <div key={r.id} className="gsearch-row" onClick={() => pick(r.action)} style={{ alignItems: 'flex-start' }}>
                <span className="gsearch-ic" style={{ background: tone.bg, color: tone.color, marginTop: 2 }}><Icon name={r.icon} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="gsearch-t">{r.title}</div>
                  <div className="gsearch-s"><b style={{ color: 'var(--text)' }}>{r.type}</b>{r.context ? ' · ' + r.context : ''}</div>
                  {r.meta && <div className="gsearch-s" style={{ marginTop: 2 }}>{r.meta}</div>}
                </div>
                <Icon name="arrowRight" style={{ width: 16, height: 16, color: 'var(--faint)', marginTop: 8 }} />
              </div>
            );
          })}
          {allHits.length > hits.length && (
            <div className="gsearch-row" onClick={() => pick(() => onNavigate && onNavigate('orders'))} style={{ justifyContent: 'center', color: 'var(--blue)', fontWeight: 800 }}>
              Показать все результаты · {allHits.length}
            </div>
          )}
          {empty && <div style={{ padding: '18px 16px', color: 'var(--muted)', fontSize: 14 }}>Совпадений не найдено. Проверьте ФИО, № заказа, телефон или документ.</div>}
        </div>
      )}
    </div>
  );
}


function QuickCreate({ onCreateOrder, onCreateClient, onCreateCompany, onCreateKP, onNavigate, role }) {
  const items = [];
  if (roleHasPerm(role, 'Создание и редактирование')) items.push({ icon: 'orders', label: 'Новый заказ', onClick: () => onCreateOrder() });
  items.push({ icon: 'user', label: 'Новый клиент', onClick: () => onCreateClient() });
  items.push({ icon: 'building', label: 'Новая компания', onClick: () => onCreateCompany() });
  if (roleHasPerm(role, 'Коммерческие предложения')) items.push({ icon: 'template', label: 'Новое КП', onClick: () => onCreateKP() });
  if (roleHasPerm(role, 'Поиск и бронирование услуг')) { items.push({ sep: true }); items.push({ icon: 'route', label: 'Подобрать услугу', onClick: () => onNavigate('services') }); }
  return (
    <ActionMenu
      trigger={<button className="btn btn-primary btn-sm" style={{ height: 36 }}><Icon name="plus" />Создать</button>}
      items={items} />
  );
}


function GlobalTopbar({ route, ctxOrder, onNavigate, onOpenOrder, onCreateClient, onCreateCompany, onCreateKP, onOpenChat, onOpenNotif, unreadChat, unreadNotif, role, onRole }) {
  return (
    <div className="gtop">
      <style>{'.topbar .search[style*="width: 220px"],.topbar .search:has(input[placeholder="Поиск"]){display:none!important}'}</style>
      <Breadcrumbs route={route} ctxOrder={ctxOrder} onNavigate={onNavigate} />
      <GlobalSearch onOpenOrder={onOpenOrder} onNavigate={onNavigate} onOpenChat={onOpenChat} />
      <div className="gtop-actions">
        <ShiftControl role={role} onOpenOrder={onOpenOrder} />
        <RoleSwitcher role={role} onRole={onRole} />
        <QuickCreate onCreateOrder={() => onOpenOrder('__create__')} onCreateClient={onCreateClient} onCreateCompany={onCreateCompany} onCreateKP={onCreateKP} onNavigate={onNavigate} role={role} />
        <button className="icon-btn gtop-ic" title="Чат" onClick={onOpenChat}>
          <Icon name="chat" />{unreadChat > 0 && <span className="gtop-badge">{unreadChat}</span>}
        </button>
        <button className="icon-btn gtop-ic" title="Уведомления" onClick={onOpenNotif}>
          <Icon name="bell" />{unreadNotif > 0 && <span className="gtop-badge">{unreadNotif}</span>}
        </button>
      </div>
    </div>
  );
}


function NotificationDrawer({ open, onClose, onNavigate, onOpenOrder }) {
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="drawer-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="shell-drawer" style={{ width: 'min(760px,97vw)' }}>
        <div className="drawer-head" style={{ padding: '20px 26px' }}>
          <h2 className="modal-title" style={{ fontSize: 22 }}>Уведомления</h2>
          <button className="modal-close" onClick={onClose}><Icon name="x" /></button>
        </div>
        <div className="scroll" style={{ flex: 1, overflowY: 'auto', padding: '18px 24px' }}>
          <NotificationsCenter compact
            onNavigate={(r) => { onClose(); onNavigate(r); }}
            onOpenOrder={(o, tab) => { onClose(); onOpenOrder(o, tab); }} />
        </div>
      </div>
    </div>
  );
}


function GlobalChatDrawer({ open, onClose, contextOrder, onOpenOrder }) {
  const [extraThreads, setExtraThreads] = useState([]);
  const threads = [...CHAT_THREADS, ...extraThreads];
  const initialId = contextOrder ? getThreadForOrder(contextOrder).id : threads[0].id;
  const [activeId, setActiveId] = useState(initialId);
  useEffect(() => {
    if (open && contextOrder) setActiveId(getThreadForOrder(contextOrder).id);
  }, [open, contextOrder]);
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;

  const active = threads.find((t) => t.id === activeId) ||
    (contextOrder ? getThreadForOrder(contextOrder) : threads[0]);
  const totalUnread = (t) => threadUnread(t);
  const goOrder = (t) => { const o = ORDERS.find((x) => x.no === t.order); onClose(); o && onOpenOrder(o); };
  const recipients = chatRecipients(active.order, extraThreads);
  const switchThread = (t) => {
    if (t.virtual) { const real = { ...t, virtual: false }; setExtraThreads((cur) => [...cur, real]); setActiveId(real.id); }
    else setActiveId(t.id);
  };

  const ord = ORDERS.find((x) => x.no === active.order);
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
          <ChatThread thread={active} embedded onOpenOrder={() => goOrder(active)} recipients={recipients} onSwitchThread={switchThread} />
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  ROUTE_LABELS, Breadcrumbs, GlobalSearch, QuickCreate,
  GlobalTopbar, NotificationDrawer, GlobalChatDrawer,
  NAV_PERM, roleHasPerm, roleCanSee, RoleSwitcher, AccessDenied,
});



export { SERVICE_LABELS, ORDER_OPS_LABELS, ROUTE_LABELS, SERVICE_PARENT, ORDER_OPS_PARENT, NAV_PERM, roleIdx, roleHasPerm, roleCanSee, RoleSwitcher, AccessDenied, Breadcrumbs, GSEARCH_TONES, gsSafeArray, gsNorm, gsJoin, gsPlural, gsScore, gsOrder, gsOpenOrderOrRoute, gsActiveOrdersFor, gsAddResult, buildGlobalSearchResults, GlobalSearch, QuickCreate, GlobalTopbar, NotificationDrawer, GlobalChatDrawer };
