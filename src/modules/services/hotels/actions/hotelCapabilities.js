import { travelDate } from '../../../../shared/lib/service-presentation.js';

export const isHotelService = (service) => ['hotel', 'Гостиница'].includes(service?.kind);
export const postSaleFlow = (service) => isHotelService(service) ? 'hotel' : 'ticket';
export const HOTEL_BOOKING_STATUS = {
  searching: 'Поиск', proposed: 'Предложено', approval: 'На согласовании', pending: 'Ожидает подтверждения',
  requested: 'Запрос отправлен', processing: 'В обработке', booked: 'Забронировано', confirmed: 'Подтверждено',
  issued: 'Оформлено', cancelled: 'Отменено', canceled: 'Отменено', failed: 'Ошибка', rejected: 'Отклонено',
  unknown: 'Требуется сверка', refund_in_progress: 'Возврат в обработке', refunded: 'Возвращено', completed: 'Завершено',
};
export const hotelStatusLabel = (status) => HOTEL_BOOKING_STATUS[status] || status || 'Не указан';
export const HOTEL_OPERATION_STATUS = {
  created: 'Запрос создан', checking: 'На проверке', awaiting_operator_confirmation: 'Ожидает подтверждения',
  submitted_to_supplier: 'Поставлено в очередь', awaiting_supplier: 'Ожидает поставщика',
  completed: 'Завершено', rejected: 'Отклонено', failed: 'Ошибка', unknown: 'Результат неизвестен — требуется сверка',
};
export const HOTEL_ACTION_LABELS = {
  refresh: 'Обновить данные у поставщика', change_dates: 'Изменить даты проживания', change_room: 'Изменить категорию номера',
  change_guests: 'Изменить состав гостей', add_room: 'Добавить номер', remove_room: 'Удалить номер', change_meal: 'Изменить питание',
  cancel_booking: 'Отменить бронирование', cancel_free: 'Отменить без штрафа', check_policy: 'Проверить условия отмены',
  request_free_cancel: 'Запросить отмену без штрафа', early_checkin: 'Ранний заезд', late_checkout: 'Поздний выезд',
  extra_bed: 'Дополнительная кровать', special_requests: 'Специальные пожелания', contact_supplier: 'Связаться с поставщиком', documents: 'Документы / ваучер',
};
export const allRoomsSelected = (rooms, refs) => rooms.every((room) => refs.includes(room.ref)) && refs.length === rooms.length;
export function hotelActionAvailability(action, data, refs, busy = false) {
  if (busy) return { enabled: false, reason: 'Дождитесь завершения текущего запроса.' };
  if (action === 'check_policy') return { enabled: true, mode: 'local' };
  const cap = data.capabilities?.[action];
  if (!cap || cap.mode === 'unsupported') return { enabled: false, reason: cap?.reason || 'Операция недоступна у этого поставщика.' };
  const permission = action === 'documents' ? 'documents' : action === 'refresh' ? 'view' : ['cancel_booking', 'request_free_cancel', 'cancel_rooms'].includes(action) ? 'cancel' : 'modify';
  if (!data.permissions?.[permission]) return { enabled: false, reason: 'Недостаточно прав для выполнения действия.' };
  if (action === 'cancel_booking' && cap.mode === 'api') {
    if (!allRoomsSelected(data.summary.rooms, refs)) return { enabled: false, reason: 'Доступна только отмена всей брони. Выберите все номера.' };
    if (!data.permissions.financial_confirmation) return { enabled: false, reason: 'Для подтверждения финансовых условий требуется право подтверждения платежей.' };
    if (data.operations.some((op) => op.operation_type === 'cancel_booking' && ['submitted_to_supplier', 'awaiting_supplier', 'unknown', 'checking'].includes(op.status))) return { enabled: false, reason: 'Отмена уже отправлена. Обновите статус у поставщика; повторная отправка запрещена.' };
  }
  return { enabled: true, ...cap };
}
export function policyLines(value) {
  const labels = { cancel: 'Отмена', change: 'Изменение', noShow: 'Незаезд', from: 'С', to: 'До', price: 'Сумма', amount: '', currency: '', info: 'Условия', description: '', text: '', deadline: 'Срок', information: 'Информация об отеле', free_cancel_until: 'Бесплатная отмена до', additional_charges: 'Дополнительные платежи', vat: 'НДС', type: 'Вид услуги', vatRate: 'Ставка НДС', vatType: 'Налогообложение', isIncluded: 'Включено в стоимость', cancellation_rules: 'Правила отмены', cancellation_information: 'Условия отмены' };
  if (value == null || value === '') return [];
  if (Array.isArray(value)) return value.flatMap(policyLines);
  if (typeof value === 'boolean') return [value ? 'Да' : 'Нет'];
  if (typeof value !== 'object') {
    const names = { meal: 'Питание', accommodation: 'Проживание', notTaxed: 'Не облагается налогом', taxed: 'Облагается налогом' };
    const text = String(names[value] || value)
      .replace(/<(?:script|style)\b[^>]*>[\s\S]*?<\/(?:script|style)>/gi, '')
      .replace(/<br\s*\/?\s*>|<\/p>|<\/li>/gi, '\n').replace(/<[^>]*>/g, '')
      .replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/\b\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?)?/g, (date) => travelDate(date, true)).trim();
    return text ? [text] : [];
  }
  if (value.amount != null) return [[value.amount, value.currency].filter((v) => v != null).join(' ')];
  return Object.entries(value).flatMap(([key, item]) => policyLines(item).map((line) => `${labels[key] ?? key}${(labels[key] ?? key) ? ': ' : ''}${line}`));
}
export const hotelMoney = (amount, currency) => amount == null || amount === '' ? 'Не указано' : `${Number(amount).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency || ''}`;
