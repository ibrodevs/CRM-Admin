import { useToastActivity } from '../../shared/ui/Toast.jsx';
import React from 'react';
import { ProfileCard } from './Sidebar.jsx';
import { Icon } from '../../shared/icons/index.jsx';
import { Button } from '../../shared/ui/Button.jsx';
import { ActionMenu } from '../../shared/ui/ActionMenu.jsx';
import { ShiftControl } from '../../modules/workforce/index.js';
import { ROUTE_LABELS, SERVICE_PARENT, ORDER_OPS_PARENT } from '../routing/labels.js';
import { roleHasPerm } from '../../shared/auth/permissions.jsx';
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
            <span className={'crumb' + (last ? ' cur' : '')} title={c.label}
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
      trigger={<Button type="button" icon="plus">Создать</Button>}
      items={items} />
  );
}

function GlobalTopbar({ route, ctxOrder, onNavigate, onOpenOrder, onCreateClient, onCreateCompany, onCreateKP, onOpenChat, onOpenNotif, unreadNotif = 0, notifOpen = false, role, user, onLogout, sidebarCollapsed, onToggleSidebar }) {
  const { toasts } = useToastActivity();
  const notificationCount = unreadNotif + toasts.filter((item) => !String(item.id).startsWith('notification:')).length;
  return (
    <div className="gtop">
      <style>{'.topbar .search[style*="width: 220px"],.topbar .search:has(input[placeholder="Поиск"]){display:none!important}'}</style>
      <div className="gtop-nav">
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
      <div className="gtop-tools">
        <div className="gtop-shift"><ShiftControl role={role} onOpenOrder={onOpenOrder} /></div>
        <div className="gtop-search-create">
          <GlobalSearch onOpenOrder={onOpenOrder} onNavigate={onNavigate} onOpenChat={onOpenChat} />
          <div className="gtop-actions">
            <QuickCreate onCreateOrder={() => onOpenOrder('__create__')} onCreateClient={onCreateClient} onCreateCompany={onCreateCompany} onCreateKP={onCreateKP} onNavigate={onNavigate} role={role} />
          </div>
        </div>
        <button type="button" className="gtop-notifications" onClick={onOpenNotif} aria-label={`Уведомления${notificationCount ? `: ${notificationCount}` : ''}`} title="Уведомления" aria-haspopup="dialog" aria-expanded={notifOpen}><Icon name="bell" />{notificationCount > 0 && <span className="gtop-notification-count" aria-live="polite" aria-atomic="true">{notificationCount > 99 ? '99+' : notificationCount}</span>}</button>
        <ProfileCard user={user} onLogout={onLogout} onNavigate={onNavigate} />
      </div>
    </div>
  );
}

export { Breadcrumbs, QuickCreate, GlobalTopbar };
