// Русские подписи для кодов, которые бэкенд хранит латиницей.
// Интерфейс русскоязычный: показывать пользователю 'prepayment' или 'manual'
// нельзя, но и переименовывать поля в API незачем — перевод живёт здесь.

/** Взаиморасчёты с поставщиком (Supplier.settlement_type). */
export const SETTLEMENT_TYPE_LABEL = {
  prepayment: 'Предоплата',
  deposit: 'Депозит',
  credit: 'Отсрочка',
  postpayment: 'По факту',
};

/** Способ оплаты (Payment.method). */
export const PAYMENT_METHOD_LABEL = {
  manual: 'Вручную',
  cash: 'Наличные',
  bank: 'Банковский перевод',
  bank_transfer: 'Банковский перевод',
  card: 'Банковская карта',
  online: 'Онлайн-оплата',
  offset: 'Взаимозачёт',
  deposit: 'С депозита',
  credit: 'В счёт отсрочки',
};

/** Режим поиска у поставщика (automation_capabilities.search_mode). */
export const SEARCH_MODE_LABEL = {
  manual: 'Ручной подбор',
  auto: 'Автоматический',
  hybrid: 'Смешанный',
};

/** Тип организации поставщика (Supplier.organization_type). */
export const ORGANIZATION_TYPE_LABEL = {
  agency: 'Агентство',
  airline: 'Авиакомпания',
  hotel: 'Отель',
  consolidator: 'Консолидатор',
  gds: 'GDS',
  tour_operator: 'Туроператор',
  operator: 'Туроператор',
  partner: 'Партнёр',
  other: 'Другое',
};

/** Направление платежа (Payment.direction). */
export const PAYMENT_DIRECTION_LABEL = { incoming: 'Входящий', outgoing: 'Исходящий' };

/**
 * Перевод кода в русскую подпись. Незнакомый код возвращается как есть —
 * лучше показать сырое значение, чем потерять его.
 */
export function labelFor(map, code, fallback = '') {
  const raw = String(code ?? '').trim();
  if (!raw) return fallback;
  return map[raw] || map[raw.toLowerCase()] || raw;
}
