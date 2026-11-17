import { serviceSummary } from './service-presentation.js';

const same = (a, b) => a != null && a !== '' && b != null && b !== '' && String(a) === String(b);
const text = (value) => typeof value === 'string' && value.trim() && value !== '—' ? value.trim() : '';
export function notificationPresentation(notification, { orders = [], services = [], documents = [], chats = [] } = {}) {
  const type = String(notification.resource_type || notification.link?.resourceType || '').toLowerCase();
  const id = notification.resource_id || notification.link?.resourceId;
  const service = type.includes('service') ? services.find((row) => same(row.id, id)) : null;
  const document = type.includes('document') ? documents.find((row) => same(row.id, id) || same(row.serverId, id)) : null;
  const thread = type.includes('thread') || type.includes('message') ? chats.find((row) => same(row.id, id) || same(row.id, notification.thread_id)) : null;
  const orderRef = notification.order || notification.order_id || service?.orderId || service?.order || document?.orderId || document?.order || thread?.orderId || thread?.order || (type === 'order' ? id : null);
  const order = orders.find((row) => same(row.id, orderRef) || same(row.no || row.number, orderRef));
  const orderNumber = order?.no || order?.number || notification.order_number || (/^(?:ORD[- ]|[0-9]+$)/i.test(String(orderRef || '')) ? String(orderRef) : '');
  const context = [...new Set([
    text(order?.client || notification.client_name || thread?.client),
    orderNumber ? `Заказ № ${orderNumber}` : '',
    document ? text(document.name || document.title || document.number) : text(notification.document_name),
    service ? serviceSummary(service).title : text(notification.service_title || notification.route),
    thread ? text(thread.name) : '',
  ].filter(Boolean))];
  const event = `${notification.event_type || ''} ${notification.title || ''}`;
  const ticketing = /ticket|issu|выписк|service\.deadline/i.test(event);
  const payment = /pay|оплат/i.test(event);
  const response = /response|reply|ответ|sla/i.test(event);
  const deadline = notification.deadline_at || notification.due_at || notification.deadline || notification.payload?.deadline_at
    || (ticketing ? service?.ticketing_deadline : payment ? service?.payment_deadline : response ? thread?.response_deadline || notification.response_deadline : document?.signing_deadline);
  // Older deadline events store an explicit timestamp only in their body.
  const bodyDeadline = /(?:выписка до|дедлайн был)\s+(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2}))/i.exec(notification.body || '');
  const parsed = deadline || bodyDeadline?.[1];
  const deadlineAt = parsed && Number.isFinite(new Date(parsed).getTime()) ? new Date(parsed).toISOString() : null;
  const deadlineLabel = ticketing ? 'До выписки' : payment ? 'До оплаты' : response ? 'До ответа' : /sign|подпис/i.test(event) ? 'До подписания' : 'До срока';
  const actionLabel = document || type.includes('document') ? order ? 'Документы заказа' : 'К документам' : thread || notification.source === 'Чаты' ? 'Открыть чат' : service ? 'Услуги заказа' : order ? 'Открыть заказ' : 'Подробнее';
  return { context, order, orderNumber, service, document, thread, deadlineAt, deadlineLabel, actionLabel };
}

export function notificationCountdown(deadlineAt, now = Date.now()) {
  const deadline = new Date(deadlineAt).getTime();
  if (!deadlineAt || !Number.isFinite(deadline)) return null;
  const remaining = deadline - now;
  const seconds = Math.floor(Math.abs(remaining) / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor(seconds / 3600) % 24;
  const minutes = Math.floor(seconds / 60) % 60;
  const value = [hours, minutes, seconds % 60].map((part) => String(part).padStart(2, '0')).join(':');
  return { overdue: remaining <= 0, text: `${days ? `${days} д. ` : ''}${value}` };
}
