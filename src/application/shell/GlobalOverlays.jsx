

import { GlobalChatDrawer } from './ChatDrawer.jsx';
import { NotificationDrawer } from './NotificationDrawer.jsx';

import { DesktopNotifier } from './DesktopNotifier.jsx';

export function GlobalOverlays({ workspace, orders, navigate, openOrder, notifOpen, setNotifOpen, chatOpen, setChatOpen, setChatTarget, chatTarget, ctxOrder, auth }) {
  const overlays = (
    <>
      <DesktopNotifier enabled={auth.user?.preferences?.notification_channels?.incrm !== false} desktop={auth.user?.preferences?.notification_channels?.desktop === true} notifications={workspace.notifications} orders={orders} onNavigate={navigate} onOpenOrder={openOrder} />
      <NotificationDrawer open={notifOpen} notifications={workspace.notifications} orders={orders} onNotificationsChange={(next) => workspace.update('notifications', next)} onClose={() => setNotifOpen(false)} onNavigate={navigate} onOpenOrder={openOrder} />
      <GlobalChatDrawer open={chatOpen} onClose={() => { setChatOpen(false); setChatTarget(null); }} contextOrder={chatTarget || ctxOrder} initialThreads={workspace.chats} orders={orders} currentUserId={auth.user.id} onOpenOrder={openOrder} />
    </>
  );

  return overlays;
}
