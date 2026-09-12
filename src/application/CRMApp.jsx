import '../legacy/compatibility/shell-globals.js';
import '../legacy/compatibility/receipt-globals.js';
import '../legacy/compatibility/people-globals.js';
import { useApplicationWorkspace } from './model/useApplicationWorkspace.js';
import { AppProviders } from './providers.jsx';
import { ROUTE_RESOURCE } from './routing/routes.js';
import { WorkspaceResourceGate } from './routing/WorkspaceResourceGate.jsx';
import { RouteRenderer } from './routing/RouteRenderer.jsx';
import { useAppNavigation } from './routing/useAppNavigation.js';
import { useOrderActions } from './model/useOrderActions.js';
import { GlobalOverlays } from './shell/GlobalOverlays.jsx';
import { DesktopNotifier, NOTIF_PRIORITY_KIND } from './shell/DesktopNotifier.jsx';
import html2canvas from 'html2canvas';
import * as jspdf from 'jspdf';
if (typeof window !== 'undefined') { window.html2canvas = html2canvas; window.jspdf = jspdf; }

import { useState, useEffect } from 'react';
import { useToast } from '../shared/ui/Toast.jsx';

import { useAuth } from '../shared/auth/auth-context.jsx';
import { useWorkspace } from '../shared/workspace/context.jsx';
import { AppShell } from './shell/AppShell.jsx';
import { LoginScreen } from '../shared/auth/LoginScreen.jsx';

import { threadUnread } from '../modules/chats/index.js';

import { AccessDenied, roleCanSee } from '../shared/auth/permissions.jsx';
import { GlobalTopbar } from './shell/Topbar.jsx';

import { workspaceSettingsApi } from '../modules/settings/api.js';

function App() {
  const auth = useAuth();
  const workspace = useApplicationWorkspace();
  const toast = useToast();
  const { route, setRoute, intent, setIntent, svcSearch, setSvcSearch, chatOpen, setChatOpen, chatTarget, setChatTarget, focusedChat, setFocusedChat, notifOpen, setNotifOpen, ctxOrder, setCtxOrder, navigate, openChat, openChatThread, openOrder, createOrder, createClient, createCompany, createKP, openServiceSearch } = useAppNavigation();

  const [userCollapsed, setUserCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('crm_sidebar_collapsed');
        if (saved !== null) return saved === 'true';
      } catch {}
    }
    return null;
  });

  const sidebarCollapsed = userCollapsed !== null
    ? userCollapsed
    : (!!ctxOrder || route.split('/')[0] === 'chats');

  const toggleSidebar = () => {
    setUserCollapsed((prev) => {
      const current = prev !== null ? prev : (!!ctxOrder || route.split('/')[0] === 'chats');
      const next = !current;
      try { localStorage.setItem('crm_sidebar_collapsed', String(next)); } catch {}
      return next;
    });
  };
  useEffect(() => {
    if (auth.status !== 'authenticated') return;
    const controller = new AbortController();
    workspaceSettingsApi.getTenant('service-cards', controller.signal).then(({ value = {} }) => {
      if (value.scenarios && window.CARD_SCENARIOS) Object.keys(value.scenarios).forEach((key) => Object.assign(window.CARD_SCENARIOS[key] || (window.CARD_SCENARIOS[key] = {}), value.scenarios[key]));
      if (value.kinds && window.CARD_KINDS_ENABLED) Object.assign(window.CARD_KINDS_ENABLED, value.kinds);
      if (value.channels && window.CARD_CHANNELS_ENABLED) Object.assign(window.CARD_CHANNELS_ENABLED, value.channels);
      if (value.emails && window.CARD_EMAIL_TEMPLATES) Object.keys(value.emails).forEach((key) => Object.assign(window.CARD_EMAIL_TEMPLATES[key] || (window.CARD_EMAIL_TEMPLATES[key] = {}), value.emails[key]));
      if (value.visibility && window.CARD_CLIENT_VISIBILITY) Object.assign(window.CARD_CLIENT_VISIBILITY, value.visibility);
    }).catch((error) => { if (error.name !== 'AbortError') toast(error.message || 'Не удалось загрузить настройки карточек услуг', 'err'); });
    return () => controller.abort();
  }, [auth.status, auth.user?.id]);

  const orders = workspace.orders;
  const suppliers = workspace.suppliers;

  const role = auth.user?.role || 'Оператор';

  const unreadChat = workspace.chats.reduce((s, t) => s + threadUnread(t), 0);
  const unreadNotif = workspace.notifications.filter((n) => !n.read).length;

  const blocked = route === 'settings' ? !(auth.user?.permissions || []).some((code) => ['users.manage', 'roles.manage', 'settings.manage', 'integrations.manage'].includes(code)) : !roleCanSee(role, route.split('/')[0]);

  const { addOrder, createOrderFromPicker, createReceiptOrder } = useOrderActions({ workspace, toast, openOrder });

  const addSupplier = async (supplier) => {
    workspace.update('suppliers', (current) => [
      supplier,
      ...current.filter((item) => String(item.id) !== String(supplier.id)),
    ]);
    return supplier;
  };

  useEffect(() => {
    window.__toastNav = navigate;
    window.__addOrder = addOrder;
    window.__openOrder = openOrder;
    return () => {
      delete window.__toastNav;
      delete window.__addOrder;
      delete window.__openOrder;
    };
  });

  if (auth.status === 'loading') return <div className="app-boot"><span className="spinner" />Загрузка Travel Hub…</div>;
  if (auth.status !== 'authenticated') return <LoginScreen expired={auth.expired} onLogin={auth.login} onVerifyTwoFactor={auth.verifyTwoFactor} onPasswordReset={auth.requestPasswordReset} />;

  const topbar = (
    <GlobalTopbar
      route={route} ctxOrder={ctxOrder}
      onNavigate={navigate} onOpenOrder={openOrder}
      onCreateClient={createClient} onCreateCompany={createCompany} onCreateKP={createKP}
      onOpenChat={() => openChat(ctxOrder)} onOpenNotif={() => setNotifOpen(true)}
      unreadChat={unreadChat} unreadNotif={unreadNotif}
      role={role}
      sidebarCollapsed={sidebarCollapsed}
      onToggleSidebar={toggleSidebar} />
  );
  const isServicePage = ['flights', 'rail', 'hotels', 'transfers', 'buses', 'tours'].includes(route.split('/')[0]);

  const currentResource = route === 'settings' ? undefined : workspace.resources?.[ROUTE_RESOURCE[route.split('/')[0]]];
  // Валюту по умолчанию модули читают при рендере, но часть страниц раскладывает
  // её по своему состоянию при монтировании. Без пересборки на некоторых экранах
  // оставалась бы старая валюта до перезагрузки страницы.
  const currencyKey = auth.user?.preferences?.base_currency || '';
  const gatedPage = (
    <WorkspaceResourceGate key={currencyKey} resource={currentResource} onRetry={() => workspace.reload()}>
      <RouteRenderer {...{ route, role, auth, orders, suppliers, workspace, navigate, createOrder, openOrder, createOrderFromPicker, openChat, intent, setIntent, addOrder, setCtxOrder, openServiceSearch, svcSearch, setSvcSearch, addSupplier, openChatThread, focusedChat, createReceiptOrder, toast }} />
    </WorkspaceResourceGate>
  );

  return (
    <AppShell route={route} onNavigate={navigate} onLogout={async () => { await auth.logout(); setRoute('dashboard'); }}
      role={role} user={auth.user} topbar={topbar} overlays={<GlobalOverlays {...{ workspace, orders, navigate, openOrder, notifOpen, setNotifOpen, chatOpen, setChatOpen, setChatTarget, chatTarget, ctxOrder, auth }} />} sidebarCollapsed={sidebarCollapsed} onToggleSidebar={toggleSidebar}>
      {blocked && <AccessDenied onNavigate={navigate} />}
      {!blocked && (isServicePage ? <div className="svc-zoom">{gatedPage}</div> : gatedPage)}
    </AppShell>
  );
}

export default function CRMRoot() {
  return <AppProviders><App /></AppProviders>;
}

export { NOTIF_PRIORITY_KIND, DesktopNotifier, App, CRMRoot };
