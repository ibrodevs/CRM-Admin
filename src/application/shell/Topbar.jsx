import React from 'react';
import { Icon } from '../../shared/icons/index.jsx';
import { ActionMenu } from '../../shared/ui/ActionMenu.jsx';
import { ShiftControl } from '../../modules/workforce/index.js';
import { ROUTE_LABELS, SERVICE_PARENT, ORDER_OPS_PARENT } from '../routing/labels.js';
import { roleHasPerm, RoleSwitcher } from '../../shared/auth/permissions.jsx';
import { GlobalSearch } from './GlobalSearch.jsx';

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

function GlobalTopbar({ route, ctxOrder, onNavigate, onOpenOrder, onCreateClient, onCreateCompany, onCreateKP, onOpenChat, onOpenNotif, unreadChat, unreadNotif, role, onRole, sidebarCollapsed, onToggleSidebar }) {
  const [theme, setTheme] = React.useState(() => (typeof document !== 'undefined' ? document.documentElement.dataset.theme || 'light' : 'light'));
  React.useEffect(() => {
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
  return (
    <div className="gtop">
      <style>{'.topbar .search[style*="width: 220px"],.topbar .search:has(input[placeholder="Поиск"]){display:none!important}'}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        {onToggleSidebar && (
          <button
            type="button"
            className="icon-btn gtop-ic gtop-sidebar-btn"
            title={sidebarCollapsed ? "Развернуть боковое меню" : "Свернуть боковое меню"}
            onClick={onToggleSidebar}
            aria-label={sidebarCollapsed ? "Развернуть боковое меню" : "Свернуть боковое меню"}
          >
            <Icon name="menu" />
          </button>
        )}
        <Breadcrumbs route={route} ctxOrder={ctxOrder} onNavigate={onNavigate} />
      </div>
      <GlobalSearch onOpenOrder={onOpenOrder} onNavigate={onNavigate} onOpenChat={onOpenChat} />
      <div className="gtop-actions">
        <ShiftControl role={role} onOpenOrder={onOpenOrder} />
        <RoleSwitcher role={role} onRole={onRole} />
        <QuickCreate onCreateOrder={() => onOpenOrder('__create__')} onCreateClient={onCreateClient} onCreateCompany={onCreateCompany} onCreateKP={onCreateKP} onNavigate={onNavigate} role={role} />
        <button className="icon-btn gtop-ic" title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'} onClick={toggleTheme}>
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
        </button>
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

export { Breadcrumbs, QuickCreate, GlobalTopbar };
