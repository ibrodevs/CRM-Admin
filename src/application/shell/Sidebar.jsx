import { useState, useEffect, useRef } from 'react';
import { BrandMark, Icon } from '../../shared/icons/index.jsx';
import { Avatar } from '../../shared/ui/Avatar.jsx';
import { Drawer } from '../../shared/ui/Overlays.jsx';
import { ToastDock } from '../../shared/ui/Toast.jsx';
import { ORDER_OPS_SECTIONS, SERVICE_KEYS } from '../../shared/constants/navigation.js';
import { NAV_ITEMS } from '../routing/navigation.js';

function NavGroup({ item, active, onNavigate, collapsed }) {
  const hasActiveChild = item.children.some((c) => c.key === active);
  const isHubActive = active === item.group;
  const [open, setOpen] = useState(hasActiveChild);
  useEffect(() => { if (hasActiveChild) setOpen(true); }, [hasActiveChild]);

  const showSub = collapsed ? true : open;
  return (
    <div className="nav-group">

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

function Sidebar({ route, onNavigate, onLogout, role, user, collapsed }) {
  const active = route.split('/')[0];

  const can = (k) => k === 'settings' ? (user?.permissions || []).some((code) => ['users.manage', 'roles.manage', 'settings.manage', 'integrations.manage'].includes(code)) : (typeof window.roleCanSee === 'function' ? window.roleCanSee(role, k) : true);
  const items = NAV_ITEMS.map((it) => {
    if (it.group) { const children = it.children.filter((c) => can(c.key)); return children.length ? { ...it, children } : null; }
    return can(it.key) ? it : null;
  }).filter(Boolean);
  return (
    <aside className={'sidebar' + (collapsed ? ' collapsed' : '')}>
      <div className="sb-header">
        <div className="sb-logo" onClick={() => onNavigate('dashboard')} title="Главное">
          <BrandMark size={26} />
          <span className="sb-logo-text">ПСЦ&nbsp;-&nbsp;Travel&nbsp;Hub</span>
        </div>
      </div>
      <nav className="nav scroll">
        {items.map((it) => it.group ? (
          <NavGroup key={it.group} item={it} active={active} onNavigate={onNavigate} collapsed={collapsed} />
        ) : (
          <button key={it.key} title={it.label}
            className={'nav-item' + ((active === it.key || (it.key === 'services' && SERVICE_KEYS.includes(active)) || (it.key === 'orders' && ORDER_OPS_SECTIONS.some((s) => s.key === active))) ? ' active' : '')}
            onClick={() => onNavigate(it.key)}>
            <Icon name={it.icon} />
            <span>{it.label}</span>
            {it.badge && <span className="nav-badge">{it.badge}</span>}
          </button>
        ))}
      </nav>
      <ToastDock />
    </aside>
  );
}

function ProfileCard({ user, onLogout, onNavigate, collapsed }) {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState(() => (typeof document !== 'undefined' ? document.documentElement.dataset.theme || 'light' : 'light'));
  const ref = useRef(null);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.dataset.theme || 'light');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('crm_theme', next); } catch {}
  };
  const go = (r) => { setOpen(false); onNavigate && onNavigate(r); };
  const profile = user || { name: 'Пользователь', role: 'CRM', avatar: null };
  const close = () => { setOpen(false); ref.current?.focus(); };
  return <>
    <button ref={ref} type="button" className="profile-trigger" title={`Личный кабинет: ${profile.name}`} aria-label="Открыть личный кабинет" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
      <Avatar src={profile.avatar} name={profile.name} size={42} />
    </button>
    <Drawer open={open} title="Личный кабинет" onClose={close} width="min(420px,100vw)" className="account-panel">
      <div className="account-panel-person"><Avatar src={profile.avatar} name={profile.name} size={64} /><div><strong>{profile.name}</strong><span>{profile.role}</span>{profile.email && <span>{profile.email}</span>}</div></div>
      <div className="account-panel-actions">
        <button type="button" className="btn btn-secondary" onClick={() => go('profile')}><Icon name="user" />Мой профиль<Icon name="chevRight" /></button>
        <button type="button" className="btn btn-secondary" onClick={() => go('account')}><Icon name="settings" />Настройки аккаунта<Icon name="chevRight" /></button>
        <button type="button" className="btn btn-secondary" onClick={toggleTheme}><Icon name={theme === 'dark' ? 'sun' : 'moon'} />{theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}</button>
        <button type="button" className="btn btn-secondary account-panel-logout" onClick={() => { setOpen(false); onLogout?.(); }}><Icon name="logout" />Выйти из аккаунта</button>
      </div>
    </Drawer>
  </>;
}

export { NavGroup, Sidebar, ProfileCard };
