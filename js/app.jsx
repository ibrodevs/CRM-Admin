import html2canvas from 'html2canvas';
import * as jspdf from 'jspdf';
if (typeof window !== 'undefined') { window.html2canvas = html2canvas; window.jspdf = jspdf; }

import { useState, useEffect } from 'react';
import { Button, EmptyState, ToastProvider, useToast } from './ui';
import { messageForApiError } from './api/client';
import { AuthProvider, useAuth } from './core/auth-context';
import { WorkspaceProvider, useWorkspace } from './core/workspace-context';
import { AppShell } from './layout';
import { LoginScreen } from './login';
import { DashboardPage } from './page_dashboard';
import { FlightsPage } from './page_flights';
import { OrdersPage } from './page_orders';
import { OffersPage } from './page_offers';
import { DocCenterPage, FulfillmentPage, ReceiptEditorPage } from './page_fulfillment';
import { FinancePage } from './page_finance';
import { ReturnsPage } from './page_returns';
import { NotificationsPage } from './page_notifications';
import { ServiceFlow, ServicesHubPage } from './page_services';
import { HotelsPage } from './page_hotel_picker';
import { ClientsPage, CompaniesPage } from './page_people';
import { SuppliersPage } from './page_suppliers';
import { ChatsPage, threadUnread } from './page_chats';
import { SettingsPage } from './page_settings';
import { TripCalendarPage } from './page_trip_calendar';
import { ProfilePage } from './page_profile';
import { AccountSettingsPage } from './page_account';
import { AccessDenied, GlobalChatDrawer, GlobalTopbar, NotificationDrawer, roleCanSee } from './shell';
import { toUiThread } from './api/adapters';

const NOTIF_PRIORITY_KIND = { 'Критический': 'err', 'Высокий': 'warn', 'Средний': 'info', 'Информационный': 'ok' };
const ROUTE_RESOURCE = {
  dashboard: 'dashboard',
  calendar: 'calendar',
  orders: 'orders',
  suppliers: 'suppliers',
  chats: 'chats',
  finance: 'finance',
  documents: 'documents',
  receipts: 'documents',
  fulfillment: 'documents',
  settings: 'users',
  clients: 'clients',
  companies: 'companies',
  offers: 'proposals',
  notifications: 'notifications',
  returns: 'returns',
  services: 'orderServices',
  flights: 'orderServices',
  rail: 'orderServices',
  hotels: 'orderServices',
  transfers: 'orderServices',
  buses: 'orderServices',
  tours: 'orderServices',
};

function WorkspaceResourceGate({ resource, onRetry, children }) {
  if (!resource) return children;
  if (resource.status === 'loading' || resource.status === 'idle') {
    return <div className="card card-pad"><div className="sk" style={{ height: 44, marginBottom: 12 }} /><div className="sk" style={{ height: 180 }} /></div>;
  }
  if (resource.status === 'forbidden') {
    return <EmptyState icon="lock" title="У вас нет доступа к этому разделу" />;
  }
  if (resource.status === 'error') {
    return (
      <EmptyState
        icon="alertCircle"
        title="Не удалось загрузить данные"
        sub={messageForApiError(resource.error)}
        action={<Button variant="secondary" icon="loader" onClick={() => onRetry && onRetry()}>Повторить</Button>}
      />
    );
  }
  return children;
}

function DesktopNotifier({ enabled, notifications = [], orders = [], onNavigate, onOpenOrder }) {
  const toast = useToast();
  useEffect(() => {
    if (!enabled) return;

    const order = ['Критический', 'Высокий', 'Средний', 'Информационный'];
    const queue = notifications
      .filter((n) => !n.read)
      .sort((a, b) => order.indexOf(a.priority) - order.indexOf(b.priority))
      .slice(0, 6);
    if (!queue.length) return;
    let idx = 0;
    const timers = [];
    const push = (n) => {
      const kind = NOTIF_PRIORITY_KIND[n.priority] || 'info';
      const lt = n.link && n.link.type;
      const action = { label: n.act || 'Открыть' };
      if (lt === 'order' && n.order) {
        const target = orders.find((o) => String(o.no) === String(n.order) || String(o.id) === String(n.order));
        if (target) action.onClick = () => onOpenOrder(target, n.tab);
        else action.onClick = () => toast('Связанный заказ не найден или недоступен', 'warn');
      } else action.route = ({ finance: 'finance', documents: 'documents', returns: 'returns', offers: 'offers', order: 'orders' })[lt] || 'notifications';
      toast(n.desc, kind, { title: n.title, action, duration: kind === 'err' || kind === 'warn' ? 8000 : 6000 });
    };

    timers.push(setTimeout(function tick() {
      push(queue[idx]); idx += 1;
      if (idx < queue.length) timers.push(setTimeout(tick, 22000));
    }, 3000));
    return () => timers.forEach(clearTimeout);
  }, [enabled, notifications, orders, onOpenOrder, toast]);
  return null;
}

function App() {
  const auth = useAuth();
  const workspace = useWorkspace();
  const toast = useToast();
  const [route, setRoute] = useState('dashboard');
  const [intent, setIntent] = useState(null);
  const [svcSearch, setSvcSearch] = useState(null);

  const orders = workspace.orders;
  const suppliers = workspace.suppliers;

  const [chatOpen, setChatOpen] = useState(false);
  const [focusedChat, setFocusedChat] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [ctxOrder, setCtxOrder] = useState(null);
  const [role, setRole] = useState(auth.user?.role || 'Оператор');

  useEffect(() => { if (auth.user?.role) setRole(auth.user.role); }, [auth.user?.role]);

  const unreadChat = workspace.chats.reduce((s, t) => s + threadUnread(t), 0);
  const unreadNotif = workspace.notifications.filter((n) => !n.read).length;

  const navigate = (r) => {
    const b = r.split('/')[0];
    setRoute(r);
    setCtxOrder(null);
    if (b === 'orders') setIntent({ type: 'list' });
  };
  const openChatThread = (thread) => {
    if (thread) setFocusedChat(thread.id ? toUiThread(thread) : thread);
    setRoute('chats');
    setCtxOrder(null);
  };

  const changeRole = (r) => { setRole(r); if (!roleCanSee(r, route.split('/')[0])) { setRoute('dashboard'); setCtxOrder(null); } };
  const blocked = !roleCanSee(role, route.split('/')[0]);

  const openOrder = (o, tab, svc) => {
    if (o === '__create__') { setRoute('orders'); setIntent({ type: 'create' }); setCtxOrder(null); return; }
    setRoute('orders'); setIntent({ type: 'open', order: o, tab, svc }); setCtxOrder(o);
  };
  const createOrder = () => { setRoute('orders'); setIntent({ type: 'create' }); setCtxOrder(null); };
  const createClient = () => { setRoute('clients'); setIntent({ type: 'create' }); setCtxOrder(null); };
  const createCompany = () => { setRoute('companies'); setIntent({ type: 'create' }); setCtxOrder(null); };
  const createKP = () => { setRoute('offers'); setIntent({ type: 'create' }); setCtxOrder(null); };

  const openServiceSearch = (key, form) => { setRoute(key); setSvcSearch({ key, form }); setCtxOrder(null); };

  const addOrder = async (draft) => {
    try {
      const created = await workspace.createOrder(draft);
      toast(`Заказ № ${created.no} сохранён в backend`, 'ok');
      return created;
    } catch (error) {
      toast(error.message || 'Не удалось сохранить заказ', 'err');
      throw error;
    }
  };

  const createOrderFromPicker = async (draft) => {
    const created = await addOrder(draft);
    openOrder(created);
    return created;
  };
  // Заказ по маршрут-квитанциям: клиента выбирает оператор в окне импорта,
  // маршрут, даты и участники уже распознаны в бланках. Шага поиска услуг
  // здесь нет — услуги создаются самими квитанциями.
  const createReceiptOrder = async (draft) => {
    try {
      let clientPersonId = draft.clientPersonId || null;
      if (draft.clientMode === 'new') {
        const client = await workspace.createPersonClient({
          source: draft.person,
          client_type: 'individual',
        });
        clientPersonId = client.id;
      }
      const plan = draft.plan || {};
      const created = await workspace.createOrder({
        request_type: draft.clientMode === 'company' ? 'Корпоративная' : 'Индивидуальная',
        client_person: draft.clientMode === 'company' ? null : clientPersonId,
        client_company: draft.clientMode === 'company' ? draft.companyId : null,
        base_currency: plan.currency || 'RUB',
        planned_start: plan.plannedStart || null,
        planned_end: plan.plannedEnd || null,
        purpose: plan.serviceKinds?.length ? `Заказ по бланкам: ${plan.serviceKinds.join(', ')}` : 'Заказ по бланкам поставщика',
        route: plan.points?.length >= 2 ? { kind: plan.kind, points: plan.points } : null,
        participants: (draft.passengers || []).map((passenger, index) => ({
          guest_snapshot: {
            full_name: passenger.name,
            birth_date: passenger.dob || '',
            document: passenger.document || '',
            ticket_no: passenger.ticketNo || '',
          },
          role: 'passenger',
          is_contact: index === 0,
        })),
        receipt_services: plan.receiptServices || [],
      });
      toast(`Заказ № ${created.no} создан по бланкам`, 'ok');
      return created;
    } catch (error) {
      toast(error.message || 'Не удалось создать заказ по бланкам', 'err');
      return null;
    }
  };

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
      onOpenChat={() => setChatOpen(true)} onOpenNotif={() => setNotifOpen(true)}
      unreadChat={unreadChat} unreadNotif={unreadNotif}
      role={role} onRole={changeRole} />
  );
  const overlays = (
    <>
      <DesktopNotifier enabled notifications={workspace.notifications} orders={orders} onNavigate={navigate} onOpenOrder={openOrder} />
      <NotificationDrawer open={notifOpen} notifications={workspace.notifications} orders={orders} onNotificationsChange={(next) => workspace.update('notifications', next)} onClose={() => setNotifOpen(false)} onNavigate={navigate} onOpenOrder={openOrder} />
      <GlobalChatDrawer open={chatOpen} onClose={() => setChatOpen(false)} contextOrder={ctxOrder} initialThreads={workspace.chats} orders={orders} currentUserId={auth.user.id} onOpenOrder={openOrder} />
    </>
  );

  const isServicePage = ['flights', 'rail', 'hotels', 'transfers', 'buses', 'tours'].includes(route.split('/')[0]);

  const page = (
      <>
      {route === 'dashboard' && <DashboardPage role={role} orders={orders} clients={workspace.clients} companies={workspace.companies} proposals={workspace.proposals} returns={workspace.returns} notifications={workspace.notifications} chats={workspace.chats} dashboard={workspace.dashboard} finance={workspace.finance} onNavigate={navigate} onAddOrder={createOrder} onOpenOrder={openOrder} onCreateOrder={createOrderFromPicker} />}
      {route === 'calendar' && <TripCalendarPage role={role} feed={workspace.calendar} orders={orders} clients={workspace.clients} companies={workspace.companies} users={workspace.users} onOpenOrder={(no) => { const target = orders.find((o) => String(o.no) === String(no) || String(o.id) === String(no)); if (target) openOrder(target); else toast('Заказ не найден или недоступен', 'warn'); }} />}
      {route === 'orders' && <OrdersPage intent={intent} onConsume={() => setIntent(null)} orders={orders} clients={workspace.clients} companies={workspace.companies} addOrder={addOrder} onDetailChange={setCtxOrder} onOpenChat={() => setChatOpen(true)} onNavigate={navigate} currentUser={auth.user} />}
      {route === 'services' && <ServicesHubPage onNavigate={navigate} onAddOrder={createOrder} onSearch={openServiceSearch} onOpenOrder={openOrder} onCreateOrder={createOrderFromPicker} />}
      {route === 'flights' && <FlightsPage searchIntent={svcSearch && svcSearch.key === 'flights' ? svcSearch : null} onConsumeSearch={() => setSvcSearch(null)} orders={orders} clients={workspace.clients} companies={workspace.companies} />}
      {route === 'suppliers' && <SuppliersPage intent={intent} onConsume={() => setIntent(null)} suppliers={suppliers} addSupplier={addSupplier} onNavigate={navigate} onOpenChat={openChatThread} />}
      {route === 'chats' && <ChatsPage initialThreads={workspace.chats} focusThread={focusedChat} orders={orders} currentUserId={auth.user.id} onOpenOrder={openOrder} />}
      {route === 'finance' && <FinancePage overview={workspace.finance} transactions={workspace.transactions} clients={workspace.clients} companies={workspace.companies} suppliers={workspace.suppliers} orders={orders} meta={workspace.meta} />}
      {route === 'documents' && <DocCenterPage documents={workspace.documents} orders={orders} />}
      {route === 'receipts' && <ReceiptEditorPage documents={workspace.documents} orders={orders}
        services={workspace.orderServices} companies={workspace.companies} clients={workspace.clients}
        onChanged={() => workspace.reload()} onOpenOrder={openOrder} onCreateOrder={createReceiptOrder} />}
      {route === 'fulfillment' && <FulfillmentPage onOpenOrder={openOrder} orders={orders} documents={workspace.documents} returns={workspace.returns} />}
      {route === 'settings' && <SettingsPage users={workspace.users} onUsersChange={(next) => workspace.update('users', next)} />}
      {route === 'profile' && <ProfilePage user={auth.user} onNavigate={navigate} />}
      {route === 'account' && <AccountSettingsPage user={auth.user} onNavigate={navigate} />}

      {route === 'rail' && <ServiceFlow routeKey="rail" searchIntent={svcSearch && svcSearch.key === 'rail' ? svcSearch : null} onConsumeSearch={() => setSvcSearch(null)} orders={orders} clients={workspace.clients} companies={workspace.companies} services={workspace.orderServices} />}
      {route === 'hotels' && <HotelsPage persons={workspace.persons} />}
      {route === 'transfers' && <ServiceFlow routeKey="transfers" searchIntent={svcSearch && svcSearch.key === 'transfers' ? svcSearch : null} onConsumeSearch={() => setSvcSearch(null)} orders={orders} clients={workspace.clients} companies={workspace.companies} services={workspace.orderServices} />}
      {route === 'buses' && <ServiceFlow routeKey="buses" searchIntent={svcSearch && svcSearch.key === 'buses' ? svcSearch : null} onConsumeSearch={() => setSvcSearch(null)} orders={orders} clients={workspace.clients} companies={workspace.companies} services={workspace.orderServices} />}
      {route === 'tours' && <ServiceFlow routeKey="tours" searchIntent={svcSearch && svcSearch.key === 'tours' ? svcSearch : null} onConsumeSearch={() => setSvcSearch(null)} orders={orders} clients={workspace.clients} companies={workspace.companies} services={workspace.orderServices} />}

      {route === 'clients' && <ClientsPage initialClients={workspace.clients} orders={orders} onClientsChange={(next) => workspace.update('clients', next)} onOpenOrder={openOrder} onCreateOrder={createOrder} intent={intent} onConsume={() => setIntent(null)} />}
      {route === 'companies' && <CompaniesPage initialCompanies={workspace.companies} orders={orders} onCompaniesChange={(next) => workspace.update('companies', next)} onOpenOrder={openOrder} onCreateOrder={createOrder} intent={intent} onConsume={() => setIntent(null)} />}
      {route === 'offers' && <OffersPage proposals={workspace.proposals} orders={orders} onOpenOrder={openOrder} intent={intent} onConsume={() => setIntent(null)}
        onChanged={(proposal) => workspace.update('proposals', (current) => [
          proposal,
          ...current.filter((item) => String(item.serverId) !== String(proposal.serverId)),
        ])} />}
      {route === 'notifications' && <NotificationsPage notifications={workspace.notifications} orders={orders} onChange={(next) => workspace.update('notifications', next)} onNavigate={navigate} onOpenOrder={openOrder} />}
      {route === 'returns' && <ReturnsPage cases={workspace.returns} orders={orders} onOpenOrder={openOrder} />}
      </>
  );
  const currentResource = workspace.resources?.[ROUTE_RESOURCE[route.split('/')[0]]];
  const gatedPage = (
    <WorkspaceResourceGate resource={currentResource} onRetry={() => workspace.reload()}>
      {page}
    </WorkspaceResourceGate>
  );

  return (
    <AppShell route={route} onNavigate={navigate} onLogout={async () => { await auth.logout(); setRoute('dashboard'); }}
      role={role} user={auth.user} topbar={topbar} overlays={overlays} sidebarCollapsed={!!ctxOrder || route.split('/')[0] === 'chats'}>
      {blocked && <AccessDenied onNavigate={navigate} />}
      {!blocked && (isServicePage ? <div className="svc-zoom">{gatedPage}</div> : gatedPage)}
    </AppShell>
  );
}

export default function CRMRoot() {
  return <ToastProvider><AuthProvider><WorkspaceProvider><App /></WorkspaceProvider></AuthProvider></ToastProvider>;
}

export { NOTIF_PRIORITY_KIND, DesktopNotifier, App, CRMRoot };
