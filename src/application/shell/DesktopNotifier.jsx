

import { useEffect, useRef } from 'react';
import { useToast } from '../../shared/ui/Toast.jsx';

export const NOTIF_PRIORITY_KIND = { 'Критический': 'err', 'Высокий': 'warn', 'Средний': 'info', 'Информационный': 'ok' };
export function DesktopNotifier({ enabled, desktop = false, notifications = [], orders = [], onNavigate, onOpenOrder }) {
  const toast = useToast();
  const sent = useRef(new Set());
  useEffect(() => {
    if (!enabled && !desktop) return;

    const order = ['Критический', 'Высокий', 'Средний', 'Информационный'];
    const queue = notifications
      .filter((n) => !n.read)
      .sort((a, b) => order.indexOf(a.priority) - order.indexOf(b.priority))
      .slice(0, 6);
    if (!queue.length) return;
    let idx = 0;
    const timers = [];
    const push = (n) => {
      if (desktop && 'Notification' in window && Notification.permission === 'granted' && !sent.current.has(n.id)) {
        sent.current.add(n.id);
        const notice = new Notification(n.title || 'CRM', {body: n.desc || '', tag: String(n.id)});
        notice.onclick = () => { window.focus(); onNavigate('notifications'); notice.close(); };
      }
      if (!enabled) return;
      const kind = NOTIF_PRIORITY_KIND[n.priority] || 'info';
      const lt = n.link && n.link.type;
      const action = { label: n.act || 'Открыть' };
      if (lt === 'order' && n.order) {
        const target = orders.find((o) => String(o.no) === String(n.order) || String(o.id) === String(n.order));
        if (target) action.onClick = () => onOpenOrder(target, n.tab);
        else action.onClick = () => toast('Связанный заказ не найден или недоступен', 'warn');
      } else action.route = ({ finance: 'finance', documents: 'documents', returns: 'returns', offers: 'offers', order: 'orders' })[lt] || 'notifications';
      toast(n.desc, kind, { title: n.title, action, duration: kind === 'err' || kind === 'warn' ? 8000 : 6000 });
    };

    timers.push(setTimeout(function tick() {
      push(queue[idx]); idx += 1;
      if (idx < queue.length) timers.push(setTimeout(tick, 22000));
    }, 3000));
    return () => timers.forEach(clearTimeout);
  }, [enabled, desktop, notifications, orders, onOpenOrder, toast]);
  return null;
}
