// Единый формат даты и времени в интерфейсе.
// По умолчанию toLocaleString('ru-RU') дописывает секунды («11.09.2026, 09:20:58»),
// которые оператору не нужны и ломают выравнивание колонок. Везде, где показываем
// момент времени, используем эти опции.

/** Дата и время: «11.09.2026, 09:20». */
export const RU_DATE_TIME = { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' };

/** Только время: «09:20». */
export const RU_TIME = { hour: '2-digit', minute: '2-digit' };

/** Только дата: «11.09.2026». */
export const RU_DATE = { day: '2-digit', month: '2-digit', year: 'numeric' };

function asDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** «11.09.2026, 09:20» либо запасное значение, если даты нет. */
export function formatDateTime(value, fallback = '—') {
  const date = asDate(value);
  return date ? date.toLocaleString('ru-RU', RU_DATE_TIME) : fallback;
}

/** «09:20» либо запасное значение. */
export function formatTime(value, fallback = '—') {
  const date = asDate(value);
  return date ? date.toLocaleTimeString('ru-RU', RU_TIME) : fallback;
}

/** «11.09.2026» либо запасное значение. */
export function formatDate(value, fallback = '—') {
  const date = asDate(value);
  return date ? date.toLocaleDateString('ru-RU', RU_DATE) : fallback;
}
