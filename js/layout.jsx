// ===== Layout: sidebar, profile, app shell, page wrapper =====

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Главное', icon: 'home' },
  { key: 'orders', label: 'Заказы', icon: 'orders' },
  { group: 'services', label: 'Услуги', icon: 'route', children: [
    { key: 'flights',   label: 'Авиабилеты',        icon: 'plane' },
    { key: 'rail',      label: 'ЖД билеты',          icon: 'train' },
    { key: 'hotels',    label: 'Гостиницы',          icon: 'building' },
    { key: 'transfers', label: 'Трансферы',          icon: 'car' },
    { key: 'buses',     label: 'Автобусы',           icon: 'bus' },
    { key: 'tours',     label: 'Групповые поездки',  icon: 'users' },
  ]},
  { key: 'clients', label: 'Клиенты', icon: 'user' },
  { key: 'companies', label: 'Компании', icon: 'building' },
  { key: 'suppliers', label: 'Поставщики', icon: 'suppliers' },
  { key: 'offers', label: 'Ком. предложения', icon: 'template' },
  { key: 'finance', label: 'Финансы', icon: 'finance' },
  { key: 'documents', label: 'Документы', icon: 'docs' },
  { key: 'fulfillment', label: 'Оформление', icon: 'clipboard' },
  { key: 'chats', label: 'Чаты', icon: 'chat' },
  { key: 'notifications', label: 'Уведомления', icon: 'bell' },
  { key: 'returns', label: 'Возвраты и обмены', icon: 'refund' },
  { key: 'settings', label: 'Настройки', icon: 'settings' },
];

const SERVICE_KEYS = ['flights', 'rail', 'hotels', 'transfers', 'buses', 'tours'];

function NavGroup({ item, active, onNavigate }) {
  const hasActiveChild = item.children.some((c) => c.key === active);
  const [open, setOpen] = useState(hasActiveChild);
  useEffect(() => { if (hasActiveChild) setOpen(true); }, [hasActiveChild]);
  return (
    <div className="nav-group">
      <button className={'nav-item' + (hasActiveChild && !open ? ' has-active' : '')} onClick={() => setOpen((o) => !o)}>
        <Icon name={item.icon} />
        <span>{item.label}</span>
        <Icon name="chevDown" className={'nav-caret' + (open ? ' open' : '')} />
      </button>
      {open && (
        <div className="nav-sub">
          {item.children.map((c) => (
            <button key={c.key}
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

function Sidebar({ route, onNavigate, onLogout, role }) {
  const active = route.split('/')[0];
  const can = (k) => (typeof roleCanSee === 'function' ? roleCanSee(role, k) : true);
  const items = NAV_ITEMS.map((it) => {
    if (it.group) { const children = it.children.filter((c) => can(c.key)); return children.length ? { ...it, children } : null; }
    return can(it.key) ? it : null;
  }).filter(Boolean);
  return (
    <aside className="sidebar">
      <div className="sb-logo" onClick={() => onNavigate('dashboard')}>
        <BrandMark size={26} />
        <span>ПСЦ&nbsp;-&nbsp;Travel&nbsp;Hub</span>
      </div>
      <nav className="nav scroll">
        {items.map((it) => it.group ? (
          <NavGroup key={it.group} item={it} active={active} onNavigate={onNavigate} />
        ) : (
          <button key={it.key}
            className={'nav-item' + (active === it.key ? ' active' : '')}
            onClick={() => onNavigate(it.key)}>
            <Icon name={it.icon} />
            <span>{it.label}</span>
            {it.badge && <span className="nav-badge">{it.badge}</span>}
          </button>
        ))}
      </nav>
      <ProfileCard onLogout={onLogout} onNavigate={onNavigate} />
    </aside>
  );
}

function ProfileCard({ onLogout, onNavigate }) {
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
        <div className="dropdown" style={{ bottom: 74, left: 0, right: 0, minWidth: 0 }}>
          <div className="dropdown-item" onClick={() => go('profile')}><Icon name="user" />Мой профиль</div>
          <div className="dropdown-item" onClick={() => go('account')}><Icon name="settings" />Настройки аккаунта</div>
          <div className="dropdown-sep" />
          <div className="dropdown-item danger" onClick={onLogout}><Icon name="logout" />Выйти</div>
        </div>
      )}
      <div className="profile-card" onClick={() => setOpen((o) => !o)}>
        <Avatar src={CURRENT_USER.avatar} name={CURRENT_USER.name} size={44} />
        <div style={{ minWidth: 0 }}>
          <div className="pc-name">{CURRENT_USER.name}</div>
          <div className="pc-role">{CURRENT_USER.role}</div>
        </div>
        <Icon name="chevRight" className="chev" />
      </div>
    </div>
  );
}

function AppShell({ route, onNavigate, onLogout, role, topbar, overlays, children }) {
  return (
    <div className="app">
      <Sidebar route={route} onNavigate={onNavigate} onLogout={onLogout} role={role} />
      <main className="main scroll">
        {topbar}
        {children}
      </main>
      {overlays}
    </div>
  );
}

// Page header (title + optional right-side controls + filter row)
function Topbar({ title, children }) {
  return (
    <div className="topbar">
      <h1 className="page-title">{title}</h1>
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
          <p style={{ color: 'var(--muted)', fontSize: 15.5, margin: '0 0 22px' }}>
            Спроектирован в дизайн-системе и запланирован к реализации в следующей фазе.
          </p>
          {planned.length > 0 && (
            <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 10, textAlign: 'left' }}>
              {planned.map((p) => (
                <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--body)', fontSize: 14.5 }}>
                  <Icon name="check" style={{ width: 17, height: 17, color: 'var(--green)' }} />{p}
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
