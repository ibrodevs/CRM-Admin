import { asDate } from '../../../shared/lib/adapter-dates.js';
import { RU_DATE_TIME } from '../../../shared/lib/datetime.js';

// В теле уведомления backend сохраняет дамп полезной нагрузки события
// ({'action': 'created', 'order_id': '...'}). Показывать такое оператору нельзя:
// разбираем знакомые поля в короткую русскую фразу, техническое — прячем.
const PAYLOAD_FIELD_LABEL = {
  action: 'Действие', status: 'Статус', reason: 'Причина', comment: 'Комментарий',
  from_status: 'Было', to_status: 'Стало', amount: 'Сумма', currency: 'Валюта',
  number: 'Номер', order_number: 'Заказ', service_kind: 'Услуга', supplier: 'Поставщик',
  error_code: 'Код ошибки', message: 'Сообщение', title: 'Название',
};
const PAYLOAD_VALUE_LABEL = {
  created: 'создан', updated: 'обновлён', cancelled: 'отменён', confirmed: 'подтверждён',
  payment_confirmed: 'платёж подтверждён', refund_executed: 'возврат проведён',
  book: 'бронирование', issue: 'выписка', exchange: 'обмен', refund: 'возврат',
  // статусы заказа и услуги — теми же словами, что и в остальном интерфейсе
  new: 'Новое', in_progress: 'В работе', awaiting_confirmation: 'Ожидает подтверждения',
  awaiting_payment: 'Ожидание оплаты', paid: 'Оплачено', completed: 'Завершено',
  needs_review: 'Требует проверки', on_hold: 'На паузе', data_missing: 'Нет данных',
  booked: 'Забронировано', issued: 'Выписано', refunded: 'Возвращено',
};
const looksLikePayloadDump = (value) => /^\s*[{[]/.test(value) && /['"][\w_]+['"]\s*:/.test(value);

function readablePayload(body) {
  const raw = String(body || '').trim();
  if (!raw) return '';
  if (!looksLikePayloadDump(raw)) return raw;
  const parts = [];
  // Python-репр использует одинарные кавычки, поэтому разбираем регулярным выражением,
  // а не JSON.parse: строгий парсер на таком дампе просто упадёт.
  for (const match of raw.matchAll(/['"]([\w_]+)['"]\s*:\s*(?:['"]([^'"]*)['"]|([\d.]+)|(True|False|None))/g)) {
    const key = match[1];
    const label = PAYLOAD_FIELD_LABEL[key];
    if (!label) continue;
    const value = match[2] ?? match[3] ?? ({ True: 'да', False: 'нет', None: '—' }[match[4]] || '');
    if (!value) continue;
    parts.push(`${label}: ${PAYLOAD_VALUE_LABEL[value] || value}`);
  }
  return parts.join(' · ');
}

/** Код ошибки интеграции, если он есть в событии или теле уведомления. */
function errorCodeOf(notification) {
  const direct = String(notification.error_code || '').trim();
  if (direct) return direct;
  const fromBody = String(notification.body || '').match(/['"]error_code['"]\s*:\s*['"]([^'"]+)['"]/);
  return fromBody?.[1] || '';
}

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
    desc: readablePayload(notification.body),
    errCode: errorCodeOf(notification),
    read: Boolean(notification.read_at),
    pinned: Boolean(notification.pinned_at),
    date: notification.created_at,
    created: created ? created.toLocaleString('ru-RU', RU_DATE_TIME) : 'Время не указано',
    time: created ? created.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '',
    resp: notification.responsible_name || 'Не назначен',
    order: deepOrder?.[1] || (resourceType === 'order' ? notification.resource_id : null),
    link,
    act: section ? 'Перейти к разделу' : null,
  };
}

export { toUiNotification };
