import { useState } from 'react';
import { Drawer } from '../../shared/ui/Overlays.jsx';
import { Button } from '../../shared/ui/Button.jsx';
import { Icon } from '../../shared/icons/index.jsx';
import { ToastItem, useToastActivity } from '../../shared/ui/Toast.jsx';
import { NotificationsCenter } from '../../modules/notifications/index.js';

function NotificationDrawer({ open, notifications = [], orders, onNotificationsChange, onClose, onNavigate, onOpenOrder }) {
  const [tab, setTab] = useState('notifications');
  const { toasts, remove, clear, nav } = useToastActivity();
  const events = toasts.filter((item) => !String(item.id).startsWith('notification:')).slice().reverse();
  const unread = notifications.filter((item) => !item.read).length;
  const navigate = (route) => { onClose(); onNavigate(route); };
  return <Drawer open={open} title="Уведомления" sub={unread ? `Непрочитанных: ${unread}` : 'Все события в одном месте'} onClose={onClose} width="min(760px,100vw)" className="notification-center-drawer" showDraftNotice={false}
    footer={<Button variant="secondary" iconRight="chevRight" onClick={() => navigate('notifications')}>Все уведомления</Button>}>
    <div className="notification-drawer-tabs" role="tablist" aria-label="Категории уведомлений">
      <button type="button" role="tab" aria-selected={tab === 'notifications'} onClick={() => setTab('notifications')}>Уведомления<span>{unread}</span></button>
      <button type="button" role="tab" aria-selected={tab === 'activity'} onClick={() => setTab('activity')}>Результаты действий<span>{events.length}</span></button>
    </div>
    {tab === 'notifications' ? <section aria-label="Уведомления системы"><NotificationsCenter compact notifications={notifications} orders={orders} onChange={onNotificationsChange} onNavigate={navigate} onOpenOrder={(...args) => { onClose(); onOpenOrder(...args); }} /></section>
      : <section aria-label="Результаты действий"><div className="notification-activity-head"><p>Сообщения о сохранении, поиске и других действиях за текущий сеанс.</p>{events.length > 0 && <Button variant="secondary" size="sm" onClick={clear}>Очистить</Button>}</div>
        {!events.length ? <div className="notification-drawer-empty"><Icon name="bell" /><strong>Пока нет событий</strong><p>Здесь появятся результаты ваших действий.</p></div>
          : <div className="notification-activity-list">{events.map((event) => <ToastItem key={event.id} t={event} paused onAction={onClose} onClose={remove} onNav={nav} />)}</div>}
      </section>}
  </Drawer>;
}

export { NotificationDrawer };
