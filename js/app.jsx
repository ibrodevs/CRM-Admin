// ===== Main App: auth, routing, shared state =====

function App() {
  const [authed, setAuthed] = useState(false);
  const [route, setRoute] = useState('dashboard');
  const [intent, setIntent] = useState(null); // cross-page intents for orders/suppliers

  // shared mutable data
  const [orders, setOrders] = useState(ORDERS);
  const [suppliers, setSuppliers] = useState(SUPPLIERS);

  const navigate = (r) => { setRoute(r); };

  const openOrder = (o) => { setRoute('orders'); setIntent({ type: 'open', order: o }); };
  const createOrder = () => { setRoute('orders'); setIntent({ type: 'create' }); };
  const addOrder = (o) => setOrders((cur) => [o, ...cur]);
  const addSupplier = (s) => setSuppliers((cur) => [s, ...cur]);

  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />;

  return (
    <AppShell route={route} onNavigate={navigate} onLogout={() => { setAuthed(false); setRoute('dashboard'); }}>
      {route === 'dashboard' && <DashboardPage onNavigate={navigate} onAddOrder={createOrder} onOpenOrder={openOrder} />}
      {route === 'orders' && <OrdersPage intent={intent} onConsume={() => setIntent(null)} orders={orders} addOrder={addOrder} />}
      {route === 'suppliers' && <SuppliersPage intent={intent} onConsume={() => setIntent(null)} suppliers={suppliers} addSupplier={addSupplier} />}
      {route === 'chats' && <ChatsPage />}
      {route === 'finance' && <FinancePage finance={FINANCE} />}
      {route === 'documents' && <DocsPage documents={DOCUMENTS} />}
      {route === 'settings' && <SettingsPage />}
      {route === 'profile' && <ProfilePage onNavigate={navigate} />}
      {route === 'account' && <AccountSettingsPage onNavigate={navigate} />}
    </AppShell>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ToastProvider><App /></ToastProvider>
);
