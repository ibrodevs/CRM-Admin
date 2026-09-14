import { formatDate, formatTime } from '../../../shared/lib/adapter-dates.js';

const UUID_EXACT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_ANYWHERE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

function isUuid(value) {
  return UUID_EXACT.test(String(value || ''));
}

function shortUuid(id) {
  return id.slice(0, 8).toUpperCase();
}

// Номер заказа для показа. Когда номера нет, вместо полного UUID выводим
// короткий фрагмент, чтобы шапка чата не растягивалась на всю ширину.
function orderRef(value) {
  const text = value == null ? '' : String(value).trim();
  if (!text) return '—';
  return text.replace(UUID_ANYWHERE, shortUuid);
}

// Треды, открытые из карточки заказа, раньше могли получить заголовок
// «Заказ № <UUID>»: подставляем номер заказа вместо идентификатора.
function threadTitle(title, orderNumber) {
  const text = String(title || '').trim();
  if (!text) return orderNumber ? `Заказ № ${orderNumber}` : 'Чат';
  return text.replace(UUID_ANYWHERE, (id) => orderNumber || shortUuid(id));
}

// Тред в формате сервера (ещё не прошёл через toUiThread).
function isBackendThread(value) {
  return Boolean(value && value.id
    && Object.prototype.hasOwnProperty.call(value, 'order_number')
    && !Object.prototype.hasOwnProperty.call(value, 'orderId'));
}

function toUiThread(thread) {
  return {
    ...thread,
    orderId: thread.order,
    order: thread.order_number || thread.order,
    name: threadTitle(thread.title, thread.order_number),
    unread: thread.unread_count || 0,
    last: thread.last_message?.body || '',
    time: thread.last_message?.created_at || thread.created_at,
    channel: thread.external_channel || 'CRM',
    pinned: Boolean(thread.pinned),
    connectionStatus: thread.status === 'active' ? 'Подключено' : thread.status,
    createdAt: formatDate(thread.created_at),
    messages: [], internal: [], participants: [], relatedServices: thread.service ? [thread.service] : [],
  };
}

// Подпись под своим сообщением: доставка во внешний канал разбирается воркером,
// поэтому «queued» — это ещё не «отправлено», а «failed» означает, что клиент
// сообщения не получил. Раньше обе ситуации выглядели как обычная отправка.
const DELIVERY_HINTS = {
  queued: 'В очереди отправки',
  sent: 'Отправлено',
  delivered: 'Доставлено',
  read: 'Прочитано',
  failed: 'Не доставлено — проверьте настройку канала',
};

function toUiMessage(message, currentUserId) {
  return {
    id: message.id,
    from: message.author_user === currentUserId ? 'me' : message.author_user ? 'operator' : 'external',
    author: message.author_name || message.author_external || '',
    text: message.body || '',
    internal: Boolean(message.is_internal),
    time: formatTime(message.created_at),
    read: ['read', 'delivered'].includes(message.delivery_state),
    deliveryState: message.delivery_state || 'sent',
    deliveryHint: DELIVERY_HINTS[message.delivery_state] || '',
    attach: message.attachment ? {
      id: message.attachment,
      documentId: message.attachment_document,
      name: message.attachment_name || 'Вложение',
      size: message.attachment_size ? `${Math.max(1, Math.round(message.attachment_size / 1024))} КБ` : '',
    } : null,
  };
}

export { isBackendThread, isUuid, orderRef, toUiThread, toUiMessage };
