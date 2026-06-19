// ===== Global Shell: Topbar (breadcrumbs · search · quick-create · bell · chat)
//        + Notification slide-over + Global Chat slide-over =====
// P0 of the blueprint: the unifying chrome so the user never loses context.

/* ---------- route → label + breadcrumbs ---------- */
const ROUTE_LABELS = (() => {
  const m = { dashboard: 'Главное', profile: 'Мой профиль', account: 'Настройки аккаунта' };
  NAV_ITEMS.forEach((it) => {
    if (it.group) it.children.forEach((c) => { m[c.key] = c.label; });
    else m[it.key] = it.label;
  });
  return m;
})();
const SERVICE_PARENT = { flights: 1, rail: 1, hotels: 1, transfers: 1, buses: 1, tours: 1 };

/* ---------- role-based access (§6) ---------- */
const NAV_PERM = {
  orders: 'Просмотр заказов',
  flights: 'Поиск и бронирование услуг', rail: 'Поиск и бронирование услуг', hotels: 'Поиск и бронирование услуг',
  transfers: 'Поиск и бронирование услуг', buses: 'Поиск и бронирование услуг', tours: 'Поиск и бронирование услуг',
  offers: 'Коммерческие предложения',
  finance: 'Просмотр финансов',
  documents: 'Просмотр документов',
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
  if (SERVICE_PARENT[base]) crumbs.push({ label: 'Услуги', noNav: true });
  if (base !== 'dashboard') crumbs.push({ key: base, label: ROUTE_LABELS[base] || base });
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

/* ---------- global search ---------- */
function GlobalSearch({ onOpenOrder, onNavigate }) {
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

  const ql = q.trim().toLowerCase();
  const orderHits = ql ? ORDERS.filter((o) => String(o.no).includes(ql) || o.client.toLowerCase().includes(ql)).slice(0, 5) : [];
  const clientHits = ql ? CLIENTS_DB.filter((c) => c.name.toLowerCase().includes(ql)).slice(0, 4) : [];
  const kpHits = ql ? PROPOSALS.filter((p) => p.id.toLowerCase().includes(ql) || (p.client || '').toLowerCase().includes(ql) || String(p.order).includes(ql)).slice(0, 3) : [];
  const empty = ql && !orderHits.length && !clientHits.length && !kpHits.length;

  const pick = (fn) => { fn(); setOpen(false); setQ(''); };
  const openKP = (p) => { const o = ORDERS.find((x) => x.no === p.order); o ? onOpenOrder(o) : onNavigate('offers'); };

  return (
    <div className="gtop-search" ref={ref}>
      <div className="search" style={{ width: '100%' }}>
        <Icon name="search" />
        <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
          placeholder="Поиск: заказы, клиенты, КП…   ⌘K" />
      </div>
      {open && ql && (
        <div className="gsearch-pop scroll">
          {orderHits.length > 0 && <div className="gsearch-grp">Заказы</div>}
          {orderHits.map((o) => (
            <div key={'o' + o.no + o.id} className="gsearch-row" onClick={() => pick(() => onOpenOrder(o))}>
              <span className="gsearch-ic" style={{ background: 'var(--blue-soft)', color: 'var(--blue)' }}><Icon name="orders" /></span>
              <div style={{ flex: 1, minWidth: 0 }}><div className="gsearch-t">№ {o.no} · {o.client}</div><div className="gsearch-s">{o.requestType} · {o.status}</div></div>
              <Icon name="arrowRight" style={{ width: 15, height: 15, color: 'var(--faint)' }} />
            </div>
          ))}
          {clientHits.length > 0 && <div className="gsearch-grp">Клиенты</div>}
          {clientHits.map((c) => (
            <div key={c.id} className="gsearch-row" onClick={() => pick(() => onNavigate('clients'))}>
              <span className="gsearch-ic" style={{ background: 'var(--green-bg)', color: 'var(--green)' }}><Icon name="user" /></span>
              <div style={{ flex: 1, minWidth: 0 }}><div className="gsearch-t">{c.name}</div><div className="gsearch-s">{c.type} · {c.city} · заказов: {c.orders}</div></div>
              <Icon name="arrowRight" style={{ width: 15, height: 15, color: 'var(--faint)' }} />
            </div>
          ))}
          {kpHits.length > 0 && <div className="gsearch-grp">Ком. предложения</div>}
          {kpHits.map((p) => (
            <div key={p.id} className="gsearch-row" onClick={() => pick(() => openKP(p))}>
              <span className="gsearch-ic" style={{ background: 'var(--amber-bg)', color: 'var(--amber)' }}><Icon name="template" /></span>
              <div style={{ flex: 1, minWidth: 0 }}><div className="gsearch-t">{p.id} · {p.client}</div><div className="gsearch-s">Заказ № {p.order} · {p.status}</div></div>
              <Icon name="arrowRight" style={{ width: 15, height: 15, color: 'var(--faint)' }} />
            </div>
          ))}
          {empty && <div style={{ padding: '18px 16px', color: 'var(--muted)', fontSize: 14 }}>Ничего не найдено по «{q}»</div>}
        </div>
      )}
    </div>
  );
}

/* ---------- quick create (role-gated) ---------- */
function QuickCreate({ onCreateOrder, onCreateClient, onCreateKP, onNavigate, role }) {
  const items = [];
  if (roleHasPerm(role, 'Создание и редактирование')) items.push({ icon: 'orders', label: 'Новый заказ', onClick: () => onCreateOrder() });
  items.push({ icon: 'user', label: 'Новый клиент', onClick: () => onCreateClient() });
  if (roleHasPerm(role, 'Коммерческие предложения')) items.push({ icon: 'template', label: 'Новое КП', onClick: () => onCreateKP() });
  if (roleHasPerm(role, 'Поиск и бронирование услуг')) { items.push({ sep: true }); items.push({ icon: 'route', label: 'Подобрать услугу', onClick: () => onNavigate('flights') }); }
  return (
    <ActionMenu
      trigger={<button className="btn btn-primary btn-sm" style={{ height: 36 }}><Icon name="plus" />Создать</button>}
      items={items} />
  );
}

/* ---------- the global topbar ---------- */
function GlobalTopbar({ route, ctxOrder, onNavigate, onOpenOrder, onCreateClient, onCreateKP, onOpenChat, onOpenNotif, unreadChat, unreadNotif, role, onRole }) {
  return (
    <div className="gtop">
      <Breadcrumbs route={route} ctxOrder={ctxOrder} onNavigate={onNavigate} />
      <div style={{ flex: 1 }} />
      <GlobalSearch onOpenOrder={onOpenOrder} onNavigate={onNavigate} />
      <div className="gtop-actions">
        <RoleSwitcher role={role} onRole={onRole} />
        <QuickCreate onCreateOrder={() => onOpenOrder('__create__')} onCreateClient={onCreateClient} onCreateKP={onCreateKP} onNavigate={onNavigate} role={role} />
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

/* ---------- notification slide-over ---------- */
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
      <div className="shell-drawer" style={{ width: 'min(580px,96vw)' }}>
        <div className="drawer-head" style={{ padding: '20px 26px' }}>
          <h2 className="modal-title" style={{ fontSize: 22 }}>Уведомления</h2>
          <button className="modal-close" onClick={onClose}><Icon name="x" /></button>
        </div>
        <div className="scroll" style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>
          <NotificationsCenter
            onNavigate={(r) => { onClose(); onNavigate(r); }}
            onOpenOrder={(o, tab) => { onClose(); onOpenOrder(o, tab); }} />
        </div>
      </div>
    </div>
  );
}

/* ---------- global chat slide-over (context-aware) ---------- */
function GlobalChatDrawer({ open, onClose, contextOrder, onOpenOrder }) {
  const threads = CHAT_THREADS;
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

  const ord = ORDERS.find((x) => x.no === active.order);
  const meta = [
    active.client || active.name,
    ord && ord.requestType,
    (ord && ord.operator) && ('отв. ' + ord.operator),
  ].filter(Boolean);

  return (
    <div className="drawer-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="shell-drawer" style={{ width: 'min(480px,96vw)' }}>
        <div className="drawer-head" style={{ padding: '14px 22px', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
              <h2 className="modal-title" style={{ fontSize: 20 }}>Чат</h2>
              <ActionMenu
                trigger={<button className="chip" style={{ height: 34 }}>№ {active.order}<Icon name="chevDown" /></button>}
                items={threads.map((t) => ({
                  icon: 'chat',
                  label: '№ ' + t.order + ' · ' + t.name + (totalUnread(t) ? '  (' + totalUnread(t) + ')' : ''),
                  onClick: () => setActiveId(t.id),
                }))} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button className="icon-btn" title="Открыть заказ" onClick={() => goOrder(active)}><Icon name="orders" /></button>
              <button className="modal-close" onClick={onClose}><Icon name="x" /></button>
            </div>
          </div>
          {meta.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 13, color: 'var(--muted)' }}>
              {meta.map((m, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span style={{ color: 'var(--faint)' }}>·</span>}
                  <span>{m}</span>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <ChatThread thread={active} embedded onOpenOrder={() => goOrder(active)} />
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
