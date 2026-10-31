export function cloneSearchValues(value) {
  if (value instanceof Date) return new Date(value);
  if (Array.isArray(value)) return value.map(cloneSearchValues);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, cloneSearchValues(entry)]));
  return value;
}

export function searchHeaderDate(value) {
  const date = value instanceof Date ? value : value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return 'Не выбрано';
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export function searchHeaderValue(field, values) {
  const value = values[field.k];
  if (field.t === 'daterange') return `${searchHeaderDate(value?.s)} — ${searchHeaderDate(value?.e)}`;
  if (field.t === 'date') return searchHeaderDate(value) + (values.trip === 'rt' && values.retDate ? ` — ${searchHeaderDate(values.retDate)}` : '');
  if (field.t === 'select') {
    const selected = value ?? (typeof field.o?.[0] === 'object' ? field.o[0].value : field.o?.[0]);
    const option = field.o?.find((entry) => typeof entry === 'object' ? entry.value === selected : entry === selected);
    return typeof option === 'object' ? option.label : selected || 'Не выбрано';
  }
  if (field.t === 'stepper') return String(value ?? 1);
  return value == null || value === '' ? 'Не указано' : String(value);
}

export function searchPassengerCount(pax = {}) {
  return [pax.adt, pax.chd, pax.infNoSeat, pax.infSeat].reduce((sum, value) => sum + Number(value || 0), 0);
}
