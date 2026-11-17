

import { GlobalChatDrawer } from './ChatDrawer.jsx';
import { NotificationDrawer } from './NotificationDrawer.jsx';

import { DesktopNotifier } from './DesktopNotifier.jsx';

export function GlobalOverlays({ workspace, orders, navigate, openOrder, notifOpen, setNotifOpen, chatOpen, setChatOpen, setChatTarget, chatTarget, ctxOrder, auth }) {
  const overlays = (
    <>
      <DesktopNotifier services={workspace.orderServices} documents={workspace.documents} chats={workspace.chats} onOpenChat={(thread) => { setChatTarget(thread); setChatOpen(true); }} enabled={auth.user?.preferences?.notification_channels?.incrm !== false} desktop={auth.user?.preferences?.notification_channels?.desktop === true} notifications={workspace.notifications} orders={orders} onNavigate={navigate} onOpenOrder={openOrder} />
      <NotificationDrawer open={notifOpen} notifications={workspace.notifications} orders={orders} onNotificationsChange={(next) => workspace.update('notifications', next)} onClose={() => setNotifOpen(false)} onNavigate={navigate} onOpenOrder={openOrder} />
      <GlobalChatDrawer open={chatOpen} users={workspace.users} onClose={() => { setChatOpen(false); setChatTarget(null); }} contextOrder={chatTarget || ctxOrder} initialThreads={workspace.chats} orderServices={workspace.orderServices} orders={orders} currentUserId={auth.user.id} onOpenOrder={openOrder} />
    </>
  );

  return overlays;
}
