// ===== Main App: auth, routing, shared state =====

/* Десктопные уведомления (ТЗ-2 п.8): всплывают в рамке с цветовой пометкой
   важности и ссылкой на нужный раздел. Источник — лента NOTIFICATIONS.
   Приоритет → тон рамки: Критический=red, Высокий=amber, Средний=blue, Инфо=green. */
const NOTIF_PRIORITY_KIND = { 'Критический': 'err', 'Высокий': 'warn', 'Средний': 'info', 'Информационный': 'ok' };
function DesktopNotifier({ enabled, onNavigate, onOpenOrder }) {
  const toast = useToast();
  useEffect(() => {
    if (!enabled) return;
    // очередь: непрочитанные, сначала по важности (крит → инфо)
    const order = ['Критический', 'Высокий', 'Средний', 'Информационный'];
    const queue = (typeof NOTIFICATIONS !== 'undefined' ? NOTIFICATIONS : [])
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
      if (lt === 'order' && n.order) action.onClick = () => onOpenOrder((typeof ORDERS !== 'undefined' && ORDERS.find((o) => o.no === n.order)) || { no: n.order }, n.tab);
      else action.route = ({ finance: 'finance', documents: 'documents', returns: 'returns', offers: 'offers', order: 'orders' })[lt] || 'notifications';
      toast(n.desc, kind, { title: n.title, action, duration: kind === 'err' || kind === 'warn' ? 8000 : 6000 });
    };
    // первое — вскоре после входа, далее с интервалом (живая лента)
    timers.push(setTimeout(function tick() {
      push(queue[idx]); idx += 1;
      if (idx < queue.length) timers.push(setTimeout(tick, 22000));
    }, 3000));
    return () => timers.forEach(clearTimeout);
  }, [enabled]);
  return null;
}

function App() {
  const [authed, setAuthed] = useState(false);
  const [route, setRoute] = useState('dashboard');
  const [intent, setIntent] = useState(null); // cross-page intents for orders/suppliers
  const [svcSearch, setSvcSearch] = useState(null); // { key, form } — маска подбора из хаба услуг

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
  // ссылки-переходы из десктопных уведомлений (тостов)
  useEffect(() => { window.__toastNav = navigate; }, []);
  // switching role: if current section is now forbidden, fall back to dashboard
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
  // Подбор услуг из хаба: боковая маска → переход в выдачу выбранного раздела с параметрами
  const openServiceSearch = (key, form) => { setRoute(key); setSvcSearch({ key, form }); setCtxOrder(null); };
  const addOrder = (o) => setOrders((cur) => [o, ...cur]);
  // Создание заказа из свободного подбора: добавить в список и сразу открыть (ТЗ #17)
  const createOrderFromPicker = (o) => { addOrder(o); openOrder(o); };
  const addSupplier = (s) => setSuppliers((cur) => [s, ...cur]);

  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />;

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
      <DesktopNotifier enabled={authed} onNavigate={navigate} onOpenOrder={openOrder} />
      <NotificationDrawer open={notifOpen} onClose={() => setNotifOpen(false)} onNavigate={navigate} onOpenOrder={openOrder} />
      <GlobalChatDrawer open={chatOpen} onClose={() => setChatOpen(false)} contextOrder={ctxOrder} onOpenOrder={openOrder} />
    </>
  );

  // «Услуги» pages render 3% smaller than the rest of the app (on top of the global scale)
  const isServicePage = ['flights', 'rail', 'hotels', 'transfers', 'buses', 'tours'].includes(route.split('/')[0]);

  const page = (
      <>
      {route === 'dashboard' && <DashboardPage role={role} onNavigate={navigate} onAddOrder={createOrder} onOpenOrder={openOrder} onCreateOrder={createOrderFromPicker} />}
      {route === 'orders' && <OrdersPage intent={intent} onConsume={() => setIntent(null)} orders={orders} addOrder={addOrder} onDetailChange={setCtxOrder} onOpenChat={() => setChatOpen(true)} onNavigate={navigate} />}
      {route === 'services' && <ServicesHubPage onNavigate={navigate} onAddOrder={createOrder} onSearch={openServiceSearch} onOpenOrder={openOrder} onCreateOrder={createOrderFromPicker} />}
      {route === 'flights' && <FlightsPage searchIntent={svcSearch && svcSearch.key === 'flights' ? svcSearch : null} onConsumeSearch={() => setSvcSearch(null)} />}
      {route === 'suppliers' && <SuppliersPage intent={intent} onConsume={() => setIntent(null)} suppliers={suppliers} addSupplier={addSupplier} />}
      {route === 'chats' && <ChatsPage onOpenOrder={openOrder} />}
      {route === 'finance' && <FinancePageNew />}
      {route === 'documents' && <DocCenterPage />}
      {route === 'receipts' && <ReceiptEditorPage />}
      {route === 'fulfillment' && <FulfillmentPage onOpenOrder={openOrder} />}
      {route === 'settings' && <SettingsPage />}
      {route === 'profile' && <ProfilePage onNavigate={navigate} />}
      {route === 'account' && <AccountSettingsPage onNavigate={navigate} />}

      {/* Service modules — shared framework on the avia template */}
      {route === 'rail' && <ServiceFlow routeKey="rail" searchIntent={svcSearch && svcSearch.key === 'rail' ? svcSearch : null} onConsumeSearch={() => setSvcSearch(null)} />}
      {route === 'hotels' && <HotelsPage />}
      {route === 'transfers' && <ServiceFlow routeKey="transfers" searchIntent={svcSearch && svcSearch.key === 'transfers' ? svcSearch : null} onConsumeSearch={() => setSvcSearch(null)} />}
      {route === 'buses' && <ServiceFlow routeKey="buses" searchIntent={svcSearch && svcSearch.key === 'buses' ? svcSearch : null} onConsumeSearch={() => setSvcSearch(null)} />}
      {route === 'tours' && <ServiceFlow routeKey="tours" searchIntent={svcSearch && svcSearch.key === 'tours' ? svcSearch : null} onConsumeSearch={() => setSvcSearch(null)} />}

      {route === 'clients' && <ClientsPage onOpenOrder={openOrder} intent={intent} onConsume={() => setIntent(null)} />}
      {route === 'companies' && <CompaniesPage onOpenOrder={openOrder} intent={intent} onConsume={() => setIntent(null)} />}
      {route === 'offers' && <OffersPage onOpenOrder={openOrder} intent={intent} onConsume={() => setIntent(null)} />}
      {route === 'notifications' && <NotificationsPage onNavigate={navigate} onOpenOrder={openOrder} />}
      {route === 'returns' && <ReturnsPage onOpenOrder={openOrder} />}
      </>
  );

  return (
    <AppShell route={route} onNavigate={navigate} onLogout={() => { setAuthed(false); setRoute('dashboard'); }}
      role={role} topbar={topbar} overlays={overlays} sidebarCollapsed={!!ctxOrder || route.split('/')[0] === 'chats'}>
      {blocked && <AccessDenied onNavigate={navigate} />}
      {!blocked && (isServicePage ? <div className="svc-zoom">{page}</div> : page)}
    </AppShell>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ToastProvider><App /></ToastProvider>
);
