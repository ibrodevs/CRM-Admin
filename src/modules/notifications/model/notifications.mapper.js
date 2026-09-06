import { asDate } from '../../../shared/lib/adapter-dates.js';

function toUiNotification(notification) {
  const priority = { critical: 'Критический', high: 'Высокий', medium: 'Средний', info: 'Информационный', low: 'Информационный' }[notification.priority] || notification.priority;
  const source = { system: 'Система', orders: 'Заказы', finance: 'Финансы', documents: 'Документы', integrations: 'Интеграции', communications: 'Чаты', services: 'Услуги' }[notification.source] || notification.source || 'Система';
  const created = asDate(notification.created_at);
  const deepLink = String(notification.deep_link || '');
  const deepOrder = deepLink.match(/\/orders\/([^/?#]+)/);
  const resourceType = String(notification.resource_type || '').toLowerCase();
  const section = resourceType.includes('document') ? 'documents'
    : resourceType.includes('return') || resourceType.includes('aftersale') ? 'returns'
      : resourceType.includes('finance') || resourceType.includes('payment') ? 'finance'
        : resourceType.includes('service') ? 'services'
          : resourceType.includes('order') ? 'order' : null;
  const link = { type: section, resourceType: notification.resource_type || '', resourceId: notification.resource_id || '' };
  return {
    ...notification,
    priority, source,
    desc: notification.body,
    read: Boolean(notification.read_at),
    pinned: Boolean(notification.pinned_at),
    date: notification.created_at,
    created: created ? created.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Время не указано',
    time: created ? created.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '',
    resp: notification.responsible_name || 'Не назначен',
    order: deepOrder?.[1] || (resourceType === 'order' ? notification.resource_id : null),
    link,
    act: section ? 'Перейти к разделу' : null,
  };
}

export { toUiNotification };
