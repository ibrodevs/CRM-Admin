export function localDay(value) {
  return value instanceof Date && !Number.isNaN(value.getTime())
    ? new Date(value.getFullYear(), value.getMonth(), value.getDate()) : null;
}

export function completeDateRange(start, end, { minDate = null, allowSameDay = false } = {}) {
  const from = localDay(start);
  const to = localDay(end);
  const minimum = localDay(minDate);
  return Boolean(from && to && (!minimum || from >= minimum) && (allowSameDay ? to >= from : to > from));
}
