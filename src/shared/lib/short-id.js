// Короткий читаемый код сущности вместо UUID.
// В таблицах и карточках 36-символьный UUID нечитаем и ломает вёрстку, но он же —
// ключ для API. Поэтому UUID остаётся в данных, а пользователю показывается
// стабильный короткий код, выведенный из того же идентификатора.

const SHORT_LENGTH = 6;

/** Короткий код из идентификатора: «CO-4F2A19». Пустое значение → '—'. */
export function shortCode(value, prefix = '') {
  const raw = String(value ?? '').trim();
  if (!raw) return '—';
  // Бэкенд уже может отдавать человекочитаемый номер (ORD-000012) — его не трогаем.
  if (!/^[0-9a-f-]{16,}$/i.test(raw)) return raw;
  const compact = raw.replace(/-/g, '').toUpperCase().slice(0, SHORT_LENGTH);
  return prefix ? `${prefix}-${compact}` : compact;
}

/** Строка для поиска: и короткий код, и полный идентификатор. */
export function shortCodeSearchable(value, prefix = '') {
  const short = shortCode(value, prefix);
  const raw = String(value ?? '');
  return short === raw ? raw : `${short} ${raw}`;
}
