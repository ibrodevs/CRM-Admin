import { formatDate, formatTime } from '../../../shared/lib/adapter-dates.js';

function toUiThread(thread) {
  return {
    ...thread,
    orderId: thread.order,
    order: thread.order_number || thread.order,
    name: thread.title,
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

function toUiMessage(message, currentUserId) {
  return {
    id: message.id,
    from: message.author_user === currentUserId ? 'me' : message.author_user ? 'operator' : 'external',
    author: message.author_name || message.author_external || '',
    text: message.body || '',
    internal: Boolean(message.is_internal),
    time: formatTime(message.created_at),
    read: ['read', 'delivered'].includes(message.delivery_state),
    attach: message.attachment ? {
      id: message.attachment,
      documentId: message.attachment_document,
      name: message.attachment_name || 'Вложение',
      size: message.attachment_size ? `${Math.max(1, Math.round(message.attachment_size / 1024))} КБ` : '',
    } : null,
  };
}

export { toUiThread, toUiMessage };
