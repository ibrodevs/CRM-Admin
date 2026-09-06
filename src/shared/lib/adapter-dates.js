

function asDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value) {
  const parsed = asDate(value);
  return parsed ? parsed.toLocaleDateString('ru-RU') : '';
}

function formatTime(value) {
  const parsed = asDate(value);
  return parsed ? parsed.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '';
}

export { asDate, formatDate, formatTime };
