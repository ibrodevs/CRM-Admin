import { AppProviders } from './providers';
import { ROUTE_RESOURCE } from './routing/routes';
import { WorkspaceResourceGate } from './routing/WorkspaceResourceGate';
import { RouteRenderer } from './routing/RouteRenderer';
import { useAppNavigation } from './routing/useAppNavigation';
import { useOrderActions } from './model/useOrderActions';
import { GlobalOverlays } from './shell/GlobalOverlays';
import { DesktopNotifier, NOTIF_PRIORITY_KIND } from './shell/DesktopNotifier';
import html2canvas from 'html2canvas';
import * as jspdf from 'jspdf';
if (typeof window !== 'undefined') { window.html2canvas = html2canvas; window.jspdf = jspdf; }

import { useEffect } from 'react';
import { useToast } from '../shared/ui/index';

import { useAuth } from '../shared/auth/auth-context';
import { useWorkspace } from '../legacy/compatibility/workspace-provider';
import { AppShell } from './shell/AppShell';
import { LoginScreen } from '../shared/auth/LoginScreen';












import { threadUnread } from '../modules/chats/ui/ChatsPage';




import { AccessDenied, GlobalTopbar, roleCanSee } from './shell/GlobalControls';

import { workspaceSettingsApi } from '../legacy/compatibility/resources';

function App() {
  const auth = useAuth();
  const workspace = useWorkspace();
  const toast = useToast();
  const { route, setRoute, intent, setIntent, svcSearch, setSvcSearch, chatOpen, setChatOpen, chatTarget, setChatTarget, focusedChat, setFocusedChat, notifOpen, setNotifOpen, ctxOrder, setCtxOrder, navigate, openChat, openChatThread, openOrder, createOrder, createClient, createCompany, createKP, openServiceSearch } = useAppNavigation();
  useEffect(() => {
    const controller = new AbortController();
    workspaceSettingsApi.getTenant('service-cards', controller.signal).then(({ value = {} }) => {
      if (value.scenarios && window.CARD_SCENARIOS) Object.keys(value.scenarios).forEach((key) => Object.assign(window.CARD_SCENARIOS[key] || (window.CARD_SCENARIOS[key] = {}), value.scenarios[key]));
      if (value.kinds && window.CARD_KINDS_ENABLED) Object.assign(window.CARD_KINDS_ENABLED, value.kinds);
      if (value.channels && window.CARD_CHANNELS_ENABLED) Object.assign(window.CARD_CHANNELS_ENABLED, value.channels);
      if (value.emails && window.CARD_EMAIL_TEMPLATES) Object.keys(value.emails).forEach((key) => Object.assign(window.CARD_EMAIL_TEMPLATES[key] || (window.CARD_EMAIL_TEMPLATES[key] = {}), value.emails[key]));
      if (value.visibility && window.CARD_CLIENT_VISIBILITY) Object.assign(window.CARD_CLIENT_VISIBILITY, value.visibility);
    }).catch((error) => { if (error.name !== 'AbortError') toast(error.message || 'Не удалось загрузить настройки карточек услуг', 'err'); });
    return () => controller.abort();
  }, []);

  const orders = workspace.orders;
  const suppliers = workspace.suppliers;

  const role = auth.user?.role || 'Оператор';

  const unreadChat = workspace.chats.reduce((s, t) => s + threadUnread(t), 0);
  const unreadNotif = workspace.notifications.filter((n) => !n.read).length;

  const blocked = !roleCanSee(role, route.split('/')[0]);

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
      role={role} />
  );
  const isServicePage = ['flights', 'rail', 'hotels', 'transfers', 'buses', 'tours'].includes(route.split('/')[0]);

  const currentResource = workspace.resources?.[ROUTE_RESOURCE[route.split('/')[0]]];
  const gatedPage = (
    <WorkspaceResourceGate resource={currentResource} onRetry={() => workspace.reload()}>
      <RouteRenderer {...{ route, role, auth, orders, suppliers, workspace, navigate, createOrder, openOrder, createOrderFromPicker, openChat, intent, setIntent, addOrder, setCtxOrder, openServiceSearch, svcSearch, setSvcSearch, addSupplier, openChatThread, focusedChat, createReceiptOrder, toast }} />
    </WorkspaceResourceGate>
  );

  return (
    <AppShell route={route} onNavigate={navigate} onLogout={async () => { await auth.logout(); setRoute('dashboard'); }}
      role={role} user={auth.user} topbar={topbar} overlays={<GlobalOverlays {...{ workspace, orders, navigate, openOrder, notifOpen, setNotifOpen, chatOpen, setChatOpen, setChatTarget, chatTarget, ctxOrder, auth }} />} sidebarCollapsed={!!ctxOrder || route.split('/')[0] === 'chats'}>
      {blocked && <AccessDenied onNavigate={navigate} />}
      {!blocked && (isServicePage ? <div className="svc-zoom">{gatedPage}</div> : gatedPage)}
    </AppShell>
  );
}

export default function CRMRoot() {
  return <AppProviders><App /></AppProviders>;
}

export { NOTIF_PRIORITY_KIND, DesktopNotifier, App, CRMRoot };
