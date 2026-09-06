








import { DashboardPage } from '../../modules/dashboard/ui/DashboardPage';
import { FlightsPage } from '../../modules/services/flights/FlightsPage';
import { OrdersPage } from '../../modules/orders/ui/OrdersPage';
import { OffersPage } from '../../modules/proposals/ui/OffersPage';
import { DocCenterPage, FulfillmentPage, ReceiptEditorPage } from '../../modules/receipts/ui/FulfillmentPages';
import { FinancePage } from '../../modules/finance/ui/FinancePage';
import { ReturnsPage } from '../../modules/returns/ui/ReturnsPage';
import { NotificationsPage } from '../../modules/notifications/ui/NotificationsPage';
import { ServiceFlow, ServicesHubPage } from '../../modules/services/ui/ServicesPage';
import { HotelsPage } from '../../modules/services/hotels/HotelsPage';
import { ClientsPage, CompaniesPage } from '../../modules/clients/ui/PeoplePages';
import { SuppliersPage } from '../../modules/suppliers/ui/SuppliersPage';
import { ChatsPage } from '../../modules/chats/ui/ChatsPage';
import { SettingsPage } from '../../modules/settings/ui/SettingsPage';
import { TripCalendarPage } from '../../modules/calendar/ui/TripCalendarPage';
import { ProfilePage } from '../../modules/profile/ui/ProfilePage';
import { AccountSettingsPage } from '../../modules/account/ui/AccountSettingsPage';




export function RouteRenderer({ route, role, auth, orders, suppliers, workspace, navigate, createOrder, openOrder, createOrderFromPicker, openChat, intent, setIntent, addOrder, setCtxOrder, openServiceSearch, svcSearch, setSvcSearch, addSupplier, openChatThread, focusedChat, createReceiptOrder, toast }) {
  const page = (
      <>
      {route === 'dashboard' && <DashboardPage role={role} user={auth.user} orders={orders} orderServices={workspace.orderServices} clients={workspace.clients} companies={workspace.companies} proposals={workspace.proposals} returns={workspace.returns} notifications={workspace.notifications} chats={workspace.chats} dashboard={workspace.dashboard} finance={workspace.finance} incidents={workspace.integrationIncidents} operations={workspace.integrationOperations} slaQueue={workspace.slaQueue} currentShift={workspace.currentShift} motivationAccruals={workspace.motivationAccruals} users={workspace.users} suppliers={workspace.suppliers} onNavigate={navigate} onAddOrder={createOrder} onOpenOrder={openOrder} onCreateOrder={createOrderFromPicker} onOpenChat={openChat} />}
      {route === 'calendar' && <TripCalendarPage role={role} feed={workspace.calendar} orders={orders} clients={workspace.clients} companies={workspace.companies} users={workspace.users} suppliers={workspace.suppliers} onCreateOrder={workspace.createOrder} onOpenOrder={(no) => { const target = orders.find((o) => String(o.no) === String(no) || String(o.id) === String(no)); if (target) openOrder(target); else toast('Заказ не найден или недоступен', 'warn'); }} />}
      {route === 'orders' && <OrdersPage intent={intent} onConsume={() => setIntent(null)} orders={orders} clients={workspace.clients} companies={workspace.companies} addOrder={addOrder} onDetailChange={setCtxOrder} onOpenChat={openChat} onNavigate={navigate} currentUser={auth.user} />}
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
      {route === 'hotels' && <HotelsPage orders={orders} />}
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
  return page;
}
