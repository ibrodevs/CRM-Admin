export function localDay(value) {
  return value instanceof Date && !Number.isNaN(value.getTime())
    ? new Date(value.getFullYear(), value.getMonth(), value.getDate()) : null;
}

export function completeDateRange(start, end, { minDate = null, maxDate = null, allowSameDay = false } = {}) {
  const from = localDay(start);
  const to = localDay(end);
  const minimum = localDay(minDate);
  return Boolean(from && to && (!minimum || from >= minimum) && dateWithinBounds(to, null, maxDate) && (allowSameDay ? to >= from : to > from));
}

export function parseCalendarDate(value) {
  if (value instanceof Date) return localDay(value);
  const text = String(value || '');
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const dotted = text.match(/^(\d{2})\.(\d{2})\.(\d{2}|\d{4})$/);
  if (!iso && !dotted) return null;
  const yearText = iso ? iso[1] : dotted[3];
  const year = Number(yearText) + (yearText.length === 2 ? 2000 : 0);
  const month = Number(iso ? iso[2] : dotted[2]) - 1;
  const day = Number(iso ? iso[3] : dotted[1]);
  const date = new Date(0);
  date.setFullYear(year, month, day);
  date.setHours(0, 0, 0, 0);
  return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day ? date : null;
}

export function dateWithinBounds(value, minDate = null, maxDate = null) {
  const date = parseCalendarDate(value);
  const minimum = parseCalendarDate(minDate);
  const maximum = parseCalendarDate(maxDate);
  return Boolean(date && (!minimum || date >= minimum) && (!maximum || date <= maximum));
}
