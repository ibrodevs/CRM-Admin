// Ссылки на файлы, которые backend отдаёт по своим путям (/api/v1/...).
// Браузер ходит в backend только через серверный прокси Next (/api/backend/...):
// там к запросу добавляется сессия. Прямой путь /api/v1/ из вёрстки не
// авторизован, поэтому картинка молча не грузится.

const BACKEND_PREFIX = '/api/v1/';
const PROXY_PREFIX = '/api/backend/';

/** Путь backend'а, пригодный для <img src>. Пустое значение → null. */
export function proxiedMediaUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return null;
  return raw.startsWith(BACKEND_PREFIX) ? PROXY_PREFIX + raw.slice(BACKEND_PREFIX.length) : raw;
}
