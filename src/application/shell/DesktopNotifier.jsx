

import { useEffect } from 'react';
import { useToast } from '../../shared/ui/Toast.jsx';


























export const NOTIF_PRIORITY_KIND = { 'Критический': 'err', 'Высокий': 'warn', 'Средний': 'info', 'Информационный': 'ok' };
export function DesktopNotifier({ enabled, notifications = [], orders = [], onNavigate, onOpenOrder }) {
  const toast = useToast();
  useEffect(() => {
    if (!enabled) return;

    const order = ['Критический', 'Высокий', 'Средний', 'Информационный'];
    const queue = notifications
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
  }, [enabled, notifications, orders, onOpenOrder, toast]);
  return null;
}

