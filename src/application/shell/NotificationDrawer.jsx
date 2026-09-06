import { useEffect } from 'react';
import { Icon } from '../../shared/icons/index';
import { NotificationsCenter } from '../../modules/notifications/ui/NotificationsPage';

function NotificationDrawer({ open, notifications, orders, onNotificationsChange, onClose, onNavigate, onOpenOrder }) {
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="drawer-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="shell-drawer" style={{ width: 'min(760px,97vw)' }}>
        <div className="drawer-head" style={{ padding: '20px 26px' }}>
          <h2 className="modal-title" style={{ fontSize: 22 }}>Уведомления</h2>
          <button className="modal-close" onClick={onClose}><Icon name="x" /></button>
        </div>
        <div className="scroll" style={{ flex: 1, overflowY: 'auto', padding: '18px 24px' }}>
          <NotificationsCenter compact notifications={notifications} orders={orders} onChange={onNotificationsChange}
            onNavigate={(r) => { onClose(); onNavigate(r); }}
            onOpenOrder={(o, tab) => { onClose(); onOpenOrder(o, tab); }} />
        </div>
      </div>
    </div>
  );
}

export { NotificationDrawer };
