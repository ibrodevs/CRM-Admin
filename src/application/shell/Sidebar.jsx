import { useState, useEffect, useRef } from 'react';
import { BrandMark, Icon } from '../../shared/icons/index.jsx';
import { Avatar } from '../../shared/ui/Avatar.jsx';
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


  const can = (k) => (typeof window.roleCanSee === 'function' ? window.roleCanSee(role, k) : true);
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
            className={'nav-item' + ((active === it.key || (it.key === 'services' && SERVICE_KEYS.includes(active)) || (it.key === 'orders' && ORDER_OPS_SECTIONS.some((s) => s.key === active))) ? ' active' : '')}
            onClick={() => onNavigate(it.key)}>
            <Icon name={it.icon} />
            <span>{it.label}</span>
            {it.badge && <span className="nav-badge">{it.badge}</span>}
          </button>
        ))}
      </nav>
      <ProfileCard user={user} onLogout={onLogout} onNavigate={onNavigate} collapsed={collapsed} />
    </aside>
  );
}

function ProfileCard({ user, onLogout, onNavigate, collapsed }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const go = (r) => { setOpen(false); onNavigate && onNavigate(r); };
  const profile = user || { name: 'Пользователь', role: 'CRM', avatar: null };
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
      <div className="profile-card" title={profile.name} onClick={() => setOpen((o) => !o)}>
        <Avatar src={profile.avatar} name={profile.name} size={44} />
        <div className="pc-info" style={{ minWidth: 0 }}>
          <div className="pc-name">{profile.name}</div>
          <div className="pc-role">{profile.role}</div>
        </div>
        <Icon name="chevRight" className="chev" />
      </div>
    </div>
  );
}

export { NavGroup, Sidebar, ProfileCard };
