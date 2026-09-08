export const SERVICE_KIND_CODES = { 'Авиа': 'avia', 'ЖД': 'rail', 'Гостиницы': 'hotel', 'Трансферы': 'transfer', 'Визы': 'visa', 'Страхование': 'insurance' };
export const SERVICE_ACTION_CODES = { 'Просмотр': 'view', 'Поиск': 'search', 'Бронирование': 'book', 'Выписка': 'issue', 'Обмен': 'exchange', 'Возврат': 'refund', 'Отмена': 'cancel', 'Корректировка документов': 'correct_document', 'Отправка документов клиенту': 'send_document' };
export function serviceAccessToUi(rows = []) {
  const kinds = {};
  for (const row of rows) {
    const kind = Object.keys(SERVICE_KIND_CODES).find((key) => SERVICE_KIND_CODES[key] === row.service_kind);
    if (kind) kinds[kind] = Object.fromEntries(Object.entries(SERVICE_ACTION_CODES).map(([label, code]) => [label, row.allowed_actions.includes(code)]));
  }
  return { fullAccess: rows.length === 0, kinds };
}
export function serviceAccessFromUi(access, previous = []) {
  if (access.fullAccess) return [];
  // Empty backend list means unrestricted; retain explicit empty rows for denied kinds.
  const rows = Object.entries(SERVICE_KIND_CODES).map(([kind, code]) => ({ service_kind: code,
    allowed_actions: Object.entries(SERVICE_ACTION_CODES).filter(([label]) => access.kinds[kind]?.[label]).map(([, action]) => action).concat((previous.find((row) => row.service_kind === code)?.allowed_actions || []).filter((action) => !Object.values(SERVICE_ACTION_CODES).includes(action))) }));
  return [...rows, ...previous.filter((row) => !Object.values(SERVICE_KIND_CODES).includes(row.service_kind))];
}
