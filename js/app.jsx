// ===== Main App: auth, routing, shared state =====

function App() {
  const [authed, setAuthed] = useState(false);
  const [route, setRoute] = useState('dashboard');
  const [intent, setIntent] = useState(null); // cross-page intents for orders/suppliers

  // shared mutable data
  const [orders, setOrders] = useState(ORDERS);
  const [suppliers, setSuppliers] = useState(SUPPLIERS);

  // global shell state
  const [chatOpen, setChatOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [ctxOrder, setCtxOrder] = useState(null); // context for breadcrumbs + chat drawer
  const [role, setRole] = useState(CURRENT_USER.role); // active role — drives §6 access

  const unreadChat = CHAT_THREADS.reduce((s, t) => s + threadUnread(t), 0);
  const unreadNotif = NOTIFICATIONS.filter((n) => !n.read).length;

  const navigate = (r) => { setRoute(r); if (r.split('/')[0] !== 'orders') setCtxOrder(null); };
  // switching role: if current section is now forbidden, fall back to dashboard
  const changeRole = (r) => { setRole(r); if (!roleCanSee(r, route.split('/')[0])) { setRoute('dashboard'); setCtxOrder(null); } };
  const blocked = !roleCanSee(role, route.split('/')[0]);

  const openOrder = (o, tab) => {
    if (o === '__create__') { setRoute('orders'); setIntent({ type: 'create' }); setCtxOrder(null); return; }
    setRoute('orders'); setIntent({ type: 'open', order: o, tab }); setCtxOrder(o);
  };
  const createOrder = () => { setRoute('orders'); setIntent({ type: 'create' }); setCtxOrder(null); };
  const createClient = () => { setRoute('clients'); setIntent({ type: 'create' }); setCtxOrder(null); };
  const createKP = () => { setRoute('offers'); setIntent({ type: 'create' }); setCtxOrder(null); };
  const addOrder = (o) => setOrders((cur) => [o, ...cur]);
  const addSupplier = (s) => setSuppliers((cur) => [s, ...cur]);

  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />;

  const topbar = (
    <GlobalTopbar
      route={route} ctxOrder={ctxOrder}
      onNavigate={navigate} onOpenOrder={openOrder}
      onCreateClient={createClient} onCreateKP={createKP}
      onOpenChat={() => setChatOpen(true)} onOpenNotif={() => setNotifOpen(true)}
      unreadChat={unreadChat} unreadNotif={unreadNotif}
      role={role} onRole={changeRole} />
  );
  const overlays = (
    <>
      <NotificationDrawer open={notifOpen} onClose={() => setNotifOpen(false)} onNavigate={navigate} onOpenOrder={openOrder} />
      <GlobalChatDrawer open={chatOpen} onClose={() => setChatOpen(false)} contextOrder={ctxOrder} onOpenOrder={openOrder} />
    </>
  );

  return (
    <AppShell route={route} onNavigate={navigate} onLogout={() => { setAuthed(false); setRoute('dashboard'); }}
      role={role} topbar={topbar} overlays={overlays} sidebarCollapsed={!!ctxOrder || route.split('/')[0] === 'chats'}>
      {blocked && <AccessDenied onNavigate={navigate} />}
      {!blocked && <>
      {route === 'dashboard' && <DashboardPage onNavigate={navigate} onAddOrder={createOrder} onOpenOrder={openOrder} />}
      {route === 'orders' && <OrdersPage intent={intent} onConsume={() => setIntent(null)} orders={orders} addOrder={addOrder} onDetailChange={setCtxOrder} onOpenChat={() => setChatOpen(true)} />}
      {route === 'flights' && <FlightsPage />}
      {route === 'suppliers' && <SuppliersPage intent={intent} onConsume={() => setIntent(null)} suppliers={suppliers} addSupplier={addSupplier} />}
      {route === 'chats' && <ChatsPage onOpenOrder={openOrder} />}
      {route === 'finance' && <FinancePageNew />}
      {route === 'documents' && <DocCenterPage />}
      {route === 'fulfillment' && <FulfillmentPage onOpenOrder={openOrder} />}
      {route === 'settings' && <SettingsPage />}
      {route === 'profile' && <ProfilePage onNavigate={navigate} />}
      {route === 'account' && <AccountSettingsPage onNavigate={navigate} />}

      {/* Service modules — shared framework on the avia template */}
      {route === 'rail' && <ServiceFlow routeKey="rail" />}
      {route === 'hotels' && <ServiceFlow routeKey="hotels" />}
      {route === 'transfers' && <ServiceFlow routeKey="transfers" />}
      {route === 'buses' && <ServiceFlow routeKey="buses" />}
      {route === 'tours' && <ServiceFlow routeKey="tours" />}

      {route === 'clients' && <ClientsPage onOpenOrder={openOrder} intent={intent} onConsume={() => setIntent(null)} />}
      {route === 'companies' && <CompaniesPage onOpenOrder={openOrder} />}
      {route === 'offers' && <OffersPage onOpenOrder={openOrder} intent={intent} onConsume={() => setIntent(null)} />}
      {route === 'notifications' && <NotificationsPage onNavigate={navigate} onOpenOrder={openOrder} />}
      {route === 'returns' && <ReturnsPage onOpenOrder={openOrder} />}
      </>}
    </AppShell>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ToastProvider><App /></ToastProvider>
);
