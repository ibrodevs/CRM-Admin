import { useEffect, useRef } from 'react';
import { useToast } from '../../shared/ui/Toast.jsx';

export const NOTIF_PRIORITY_KIND = { 'Критический': 'err', 'Высокий': 'warn', 'Средний': 'info', 'Информационный': 'ok' };
const PRIORITY_ORDER = ['Критический', 'Высокий', 'Средний', 'Информационный'];

export function DesktopNotifier({ enabled, desktop = false, notifications = [], orders = [], onNavigate, onOpenOrder }) {
  const toast = useToast();
  const sent = useRef(new Set());
  const shown = useRef(new Set());

  useEffect(() => {
    if (!enabled) return undefined;
    const queue = notifications.filter((n) => !n.read && !shown.current.has(n.id))
      .sort((a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority));
    if (!queue.length) return undefined;
    // The bounded in-app stack can accept a batch without filling the screen.
    const timer = setTimeout(() => {
      queue.forEach((n) => {
        if (shown.current.has(n.id)) return;
        shown.current.add(n.id);
        const kind = NOTIF_PRIORITY_KIND[n.priority] || 'info';
        const type = n.link?.type;
        const action = { label: 'Перейти' };
        if (type === 'order' && n.order) {
          const target = orders.find((o) => String(o.no) === String(n.order) || String(o.id) === String(n.order));
          action.onClick = target ? () => onOpenOrder(target, n.tab) : () => toast('Связанный заказ не найден или недоступен', 'warn');
        } else action.route = ({ profile: 'profile', finance: 'finance', documents: 'documents', returns: 'returns', offers: 'offers', order: 'orders' })[type] || 'notifications';
        toast(n.desc, kind, { id: `notification:${n.id}`, title: n.title, action, duration: kind === 'err' || kind === 'warn' ? 8000 : 6000 });
      });
    }, 3000);
    return () => clearTimeout(timer);
  }, [enabled, notifications, orders, onOpenOrder, toast]);

  // Native OS notifications keep their separate delivery limit and spacing.
  useEffect(() => {
    if (!desktop || !('Notification' in window) || Notification.permission !== 'granted') return undefined;
    const queue = notifications.filter((n) => !n.read && !sent.current.has(n.id))
      .sort((a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority)).slice(0, 6);
    if (!queue.length) return undefined;
    const timers = [];
    let index = 0;
    timers.push(setTimeout(function tick() {
      const n = queue[index++];
      if (!sent.current.has(n.id)) {
        sent.current.add(n.id);
        const notice = new Notification(n.title || 'CRM', { body: n.desc || '', tag: String(n.id) });
        notice.onclick = () => { window.focus(); onNavigate('notifications'); notice.close(); };
      }
      if (index < queue.length) timers.push(setTimeout(tick, 22000));
    }, 3000));
    return () => timers.forEach(clearTimeout);
  }, [desktop, notifications, onNavigate]);
  return null;
}
