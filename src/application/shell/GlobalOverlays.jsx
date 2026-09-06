

























import { GlobalChatDrawer, NotificationDrawer } from './GlobalControls';



import { DesktopNotifier } from './DesktopNotifier';

export function GlobalOverlays({ workspace, orders, navigate, openOrder, notifOpen, setNotifOpen, chatOpen, setChatOpen, setChatTarget, chatTarget, ctxOrder, auth }) {
  const overlays = (
    <>
      <DesktopNotifier enabled notifications={workspace.notifications} orders={orders} onNavigate={navigate} onOpenOrder={openOrder} />
      <NotificationDrawer open={notifOpen} notifications={workspace.notifications} orders={orders} onNotificationsChange={(next) => workspace.update('notifications', next)} onClose={() => setNotifOpen(false)} onNavigate={navigate} onOpenOrder={openOrder} />
      <GlobalChatDrawer open={chatOpen} onClose={() => { setChatOpen(false); setChatTarget(null); }} contextOrder={chatTarget || ctxOrder} initialThreads={workspace.chats} orders={orders} currentUserId={auth.user.id} onOpenOrder={openOrder} />
    </>
  );

  return overlays;
}
