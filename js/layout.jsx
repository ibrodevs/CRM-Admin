// ===== Layout: sidebar, profile, app shell, page wrapper =====

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Главное', icon: 'home' },
  { key: 'orders', label: 'Заказы', icon: 'orders' },
  { key: 'suppliers', label: 'Поставщики', icon: 'suppliers' },
  { key: 'chats', label: 'Чаты', icon: 'chat', badge: 10 },
  { key: 'finance', label: 'Финансы', icon: 'finance' },
  { key: 'documents', label: 'Документы', icon: 'docs' },
  { key: 'settings', label: 'Настройки', icon: 'settings' },
];

function Sidebar({ route, onNavigate, onLogout }) {
  const active = route.split('/')[0];
  return (
    <aside className="sidebar">
      <div className="sb-logo" onClick={() => onNavigate('dashboard')}>
        <BrandMark size={26} />
        <span>ПСЦ&nbsp;-&nbsp;Travel&nbsp;Hub</span>
      </div>
      <nav className="nav scroll">
        {NAV_ITEMS.map((it) => (
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

function AppShell({ route, onNavigate, onLogout, children }) {
  return (
    <div className="app">
      <Sidebar route={route} onNavigate={onNavigate} onLogout={onLogout} />
      <main className="main scroll">{children}</main>
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

Object.assign(window, { NAV_ITEMS, Sidebar, ProfileCard, AppShell, Topbar });
