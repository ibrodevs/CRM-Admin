// ===== Layout: sidebar, profile, app shell, page wrapper =====

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Главное', icon: 'home' },
  { key: 'orders', label: 'Заказы', icon: 'orders' },
  { key: 'services', label: 'Подбор услуг', icon: 'route' },
  { key: 'clients', label: 'Клиенты', icon: 'user' },
  { key: 'companies', label: 'Компании', icon: 'building' },
  { key: 'suppliers', label: 'Поставщики', icon: 'suppliers' },
  { key: 'offers', label: 'Ком. предложения', icon: 'template' },
  { key: 'finance', label: 'Финансы', icon: 'finance' },
  { key: 'documents', label: 'Документы', icon: 'docs' },
  { key: 'receipts', label: 'Редактор квитанций', icon: 'route' },
  { key: 'fulfillment', label: 'Оформление', icon: 'clipboard' },
  { key: 'chats', label: 'Чаты', icon: 'chat' },
  { key: 'notifications', label: 'Уведомления', icon: 'bell' },
  { key: 'returns', label: 'Возвраты и обмены', icon: 'refund' },
  { key: 'settings', label: 'Настройки', icon: 'settings' },
];

const SERVICE_KEYS = ['flights', 'rail', 'hotels', 'transfers', 'buses', 'tours'];

function NavGroup({ item, active, onNavigate, collapsed }) {
  const hasActiveChild = item.children.some((c) => c.key === active);
  const isHubActive = active === item.group; // сам раздел «Подбор услуг» открыт
  const [open, setOpen] = useState(hasActiveChild);
  useEffect(() => { if (hasActiveChild) setOpen(true); }, [hasActiveChild]);
  // collapsed: the flyout is shown purely via CSS :hover, so it's always in the DOM
  const showSub = collapsed ? true : open;
  return (
    <div className="nav-group">
      {/* Клик по разделу ведёт на единый экран подбора; каретка раскрывает быстрые ссылки. */}
      <button className={'nav-item' + (isHubActive ? ' active' : (hasActiveChild && !open ? ' has-active' : ''))} title={item.label}
        onClick={() => { onNavigate(item.group); if (!collapsed) setOpen(true); }}>
        <Icon name={item.icon} />
        <span>{item.label}</span>
        {!collapsed && <Icon name="chevDown" className={'nav-caret' + (open ? ' open' : '')}
          onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }} />}
      </button>
      {showSub && (
        <div className="nav-sub">
          {item.children.map((c) => (
            <button key={c.key} title={c.label}
              className={'nav-subitem' + (active === c.key ? ' active' : '')}
              onClick={() => onNavigate(c.key)}>
              <Icon name={c.icon} />
              <span>{c.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Sidebar({ route, onNavigate, onLogout, role, collapsed }) {
  const active = route.split('/')[0];
  const can = (k) => (typeof roleCanSee === 'function' ? roleCanSee(role, k) : true);
  const items = NAV_ITEMS.map((it) => {
    if (it.group) { const children = it.children.filter((c) => can(c.key)); return children.length ? { ...it, children } : null; }
    return can(it.key) ? it : null;
  }).filter(Boolean);
  return (
    <aside className={'sidebar' + (collapsed ? ' collapsed' : '')}>
      <div className="sb-logo" onClick={() => onNavigate('dashboard')}>
        <BrandMark size={26} />
        <span>ПСЦ&nbsp;-&nbsp;Travel&nbsp;Hub</span>
      </div>
      <nav className="nav scroll">
        {items.map((it) => it.group ? (
          <NavGroup key={it.group} item={it} active={active} onNavigate={onNavigate} collapsed={collapsed} />
        ) : (
          <button key={it.key} title={it.label}
            className={'nav-item' + ((active === it.key || (it.key === 'services' && SERVICE_KEYS.includes(active))) ? ' active' : '')}
            onClick={() => onNavigate(it.key)}>
            <Icon name={it.icon} />
            <span>{it.label}</span>
            {it.badge && <span className="nav-badge">{it.badge}</span>}
          </button>
        ))}
      </nav>
      <ProfileCard onLogout={onLogout} onNavigate={onNavigate} collapsed={collapsed} />
    </aside>
  );
}

function ProfileCard({ onLogout, onNavigate, collapsed }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const go = (r) => { setOpen(false); onNavigate && onNavigate(r); };
  return (
    <div style={{ position: 'relative' }} ref={ref}>
      {open && (
        <div className="dropdown" style={collapsed ? { bottom: 74, left: 0, minWidth: 220 } : { bottom: 74, left: 0, right: 0, minWidth: 0 }}>
          <div className="dropdown-item" onClick={() => go('profile')}><Icon name="user" />Мой профиль</div>
          <div className="dropdown-item" onClick={() => go('account')}><Icon name="settings" />Настройки аккаунта</div>
          <div className="dropdown-sep" />
          <div className="dropdown-item danger" onClick={onLogout}><Icon name="logout" />Выйти</div>
        </div>
      )}
      <div className="profile-card" title={CURRENT_USER.name} onClick={() => setOpen((o) => !o)}>
        <Avatar src={CURRENT_USER.avatar} name={CURRENT_USER.name} size={44} />
        <div className="pc-info" style={{ minWidth: 0 }}>
          <div className="pc-name">{CURRENT_USER.name}</div>
          <div className="pc-role">{CURRENT_USER.role}</div>
        </div>
        <Icon name="chevRight" className="chev" />
      </div>
    </div>
  );
}

function AppShell({ route, onNavigate, onLogout, role, topbar, overlays, children, sidebarCollapsed }) {
  return (
    <div className="app">
      <Sidebar route={route} onNavigate={onNavigate} onLogout={onLogout} role={role} collapsed={sidebarCollapsed} />
      <main className="main scroll">
        {topbar}
        {children}
      </main>
      {overlays}
    </div>
  );
}

// Page header (title + optional subtitle + optional right-side controls + filter row)
function Topbar({ title, sub, children }) {
  return (
    <div className="topbar">
      <div style={{ minWidth: 0 }}>
        <h1 className="page-title">{title}</h1>
        {sub && <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 4, fontWeight: 500 }}>{sub}</div>}
      </div>
      {children}
    </div>
  );
}

// Placeholder for modules planned in the next build phases.
// Keeps the full information architecture navigable so the product feels whole.
function ModulePlaceholder({ title, icon = 'inbox', planned = [] }) {
  return (
    <>
      <Topbar title={title} />
      <div className="content">
        <div className="card card-pad fade-in" style={{ maxWidth: 720, margin: '40px auto', textAlign: 'center', padding: '48px 40px' }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: 'var(--blue-soft)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
            <Icon name={icon} style={{ width: 30, height: 30 }} />
          </div>
          <h2 className="card-title" style={{ marginBottom: 8 }}>Модуль «{title}»</h2>
          <p style={{ color: 'var(--muted)', fontSize: 15, margin: '0 0 22px' }}>
            Спроектирован в дизайн-системе и запланирован к реализации в следующей фазе.
          </p>
          {planned.length > 0 && (
            <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 10, textAlign: 'left' }}>
              {planned.map((p) => (
                <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--body)', fontSize: 14 }}>
                  <Icon name="check" style={{ width: 18, height: 18, color: 'var(--green)' }} />{p}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

Object.assign(window, { NAV_ITEMS, SERVICE_KEYS, NavGroup, Sidebar, ProfileCard, AppShell, Topbar, ModulePlaceholder });
