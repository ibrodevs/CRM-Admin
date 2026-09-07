import { workspaceInfoApi } from '../../modules/workspace/api.js';
import { useState, useEffect, useRef } from 'react';
import { Icon } from '../../shared/icons/index.jsx';
import { AIR_SERVICES, CHAT_THREADS, CHAT_TYPE_LABEL, CLIENTS_DB, COMPANIES_DB, DOCUMENTS, ORDERS, PROPOSALS, SUPPLIERS } from '../../legacy/data/index.jsx';
import { SLA_QUEUE, companyStaffStore } from '../../legacy/data/access-control.jsx';
import { PAX_GROUPS } from '../../modules/clients/index.js';

const SEARCH_TYPE_META = {
  order: { icon: 'orders', tone: 'order', label: 'Заказ', route: 'orders' },
  person: { icon: 'user', tone: 'person', label: 'Физическое лицо', route: 'clients' },
  company: { icon: 'building', tone: 'company', label: 'Компания', route: 'companies' },
  supplier: { icon: 'suppliers', tone: 'supplier', label: 'Поставщик', route: 'suppliers' },
};

function backendSearchResultToHit(result, handlers) {
  const meta = SEARCH_TYPE_META[result.type] || { icon: 'search', tone: 'document', label: result.type || 'Результат', route: 'orders' };
  const openOrder = () => {
    const order = gsSafeArray(typeof ORDERS !== 'undefined' ? ORDERS : [])
      .find((item) => String(item.id) === String(result.id) || String(item.no) === String(result.title));
    if (order && handlers.onOpenOrder) handlers.onOpenOrder(order);
    else handlers.onNavigate && handlers.onNavigate(meta.route);
  };
  return {
    id: `backend-${result.type}-${result.id}`,
    icon: meta.icon,
    tone: meta.tone,
    title: result.title || result.id,
    type: meta.label,
    context: result.subtitle || '',
    meta: result.deep_link || '',
    action: result.type === 'order' ? openOrder : () => handlers.onNavigate && handlers.onNavigate(meta.route),
    score: Number(result.score || 0) + 1000,
  };
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
  const [backendHits, setBackendHits] = useState([]);
  const [backendState, setBackendState] = useState('idle');
  const ref = useRef(null);
  const handlersRef = useRef({ onOpenOrder, onNavigate, onOpenChat });
  useEffect(() => {
    handlersRef.current = { onOpenOrder, onNavigate, onOpenChat };
  }, [onOpenOrder, onNavigate, onOpenChat]);
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
  useEffect(() => {
    if (ql.length < 2) {
      setBackendHits([]);
      setBackendState('idle');
      return undefined;
    }
    const controller = new AbortController();
    setBackendState('loading');
    const timer = setTimeout(() => {
      workspaceInfoApi.globalSearch(ql, controller.signal)
        .then((payload) => {
          setBackendHits(gsSafeArray(payload?.results).map((result) => backendSearchResultToHit(result, handlersRef.current)));
          setBackendState('success');
        })
        .catch((error) => {
          if (error.name === 'AbortError') return;
          setBackendHits([]);
          setBackendState('error');
        });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [ql]);
  const localHits = ql ? buildGlobalSearchResults(ql, { onOpenOrder, onNavigate, onOpenChat }) : [];
  const allHits = backendHits.length ? backendHits : localHits;
  const hits = allHits.slice(0, 7);
  const empty = ql && backendState !== 'loading' && !allHits.length;
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
          {backendState === 'loading' && <div style={{ padding: '14px 16px', color: 'var(--muted)', fontSize: 14 }}>Ищем в backend…</div>}
          {backendState === 'error' && <div style={{ padding: '14px 16px', color: 'var(--amber)', fontSize: 14 }}>Backend-поиск временно недоступен, показаны локальные совпадения.</div>}
          {empty && <div style={{ padding: '18px 16px', color: 'var(--muted)', fontSize: 14 }}>Совпадений не найдено. Проверьте ФИО, № заказа, телефон или документ.</div>}
        </div>
      )}
    </div>
  );
}

export { SEARCH_TYPE_META, backendSearchResultToHit, GSEARCH_TONES, gsSafeArray, gsNorm, gsJoin, gsPlural, gsScore, gsOrder, gsOpenOrderOrRoute, gsActiveOrdersFor, gsAddResult, buildGlobalSearchResults, GlobalSearch };
