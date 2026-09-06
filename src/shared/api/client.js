export class ApiError extends Error {
  constructor(message, { status = 0, code = 'REQUEST_FAILED', fields = {}, details = {}, requestId = '' } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
    this.details = details;
    this.requestId = requestId;
  }
}

const STATUS_MESSAGE = {
  400: 'Проверьте поля формы',
  401: 'Сессия истекла. Войдите снова',
  403: 'Недостаточно прав для выполнения действия',
  404: 'Объект не найден или был удалён',
  409: 'Данные были изменены другим пользователем. Обновите карточку и повторите действие.',
  422: 'Операция отклонена бизнес-правилом',
  429: 'Слишком много запросов. Повторите позже.',
  500: 'Не удалось выполнить операцию. Попробуйте позже.',
  502: 'Поставщик или backend временно недоступен',
  503: 'Backend временно недоступен',
};

function errorFrom(response, payload) {
  const error = payload?.error || payload || {};
  return new ApiError(error.message || error.detail || STATUS_MESSAGE[response.status] || `Ошибка запроса (${response.status})`, {
    status: response.status,
    code: error.code || 'REQUEST_FAILED',
    fields: error.fields || {},
    details: error.details || {},
    requestId: error.request_id || response.headers.get('x-request-id') || '',
  });
}

// ——— Истёкшая сессия ————————————————————————————————————————————————————
// Сессия может закончиться в любой момент работы: backend начинает отвечать
// 401, данные перестают приходить, но приложение об этом не знает и оставляет
// оператора на рабочем экране с пустыми списками. Любой 401 поднимается сюда,
// и слой авторизации сразу переводит приложение на экран входа.
const unauthorizedHandlers = new Set();

export function onUnauthorized(handler) {
  unauthorizedHandlers.add(handler);
  return () => unauthorizedHandlers.delete(handler);
}

function notifyUnauthorized(path) {
  unauthorizedHandlers.forEach((handler) => {
    try { handler(path); } catch { /* обработчик выхода не должен ломать запрос */ }
  });
}

export async function apiRequest(path, options = {}) {
  const method = options.method || (options.body === undefined ? 'GET' : 'POST');
  const headers = new Headers(options.headers || {});
  headers.set('Accept', options.accept || 'application/json');
  let body = options.body;

  if (body !== undefined && !(body instanceof FormData) && typeof body !== 'string') {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(body);
  }
  if (!['GET', 'HEAD'].includes(method) && options.idempotent !== false) {
    headers.set('Idempotency-Key', options.idempotencyKey || crypto.randomUUID());
  }

  const response = await fetch(path, {
    method,
    headers,
    body,
    credentials: 'same-origin',
    cache: 'no-store',
    signal: options.signal,
  });
  const contentType = response.headers.get('content-type') || '';
  const payload = response.status === 204
    ? null
    : contentType.includes('application/json')
      ? await response.json()
      : await response.blob();
  if (!response.ok) {
    // Собственные эндпоинты сессии разбирает сам слой авторизации: их 401 —
    // это нормальный ответ «не авторизован», а не потеря сессии.
    if (response.status === 401 && options.handlesUnauthorized !== true) notifyUnauthorized(path);
    throw errorFrom(response, payload);
  }
  return payload;
}

export function resourceStatusFromError(error) {
  if (error?.status === 403) return 'forbidden';
  return 'error';
}

export function messageForApiError(error) {
  if (!error) return '';
  return STATUS_MESSAGE[error.status] || error.message || 'Не удалось выполнить запрос';
}

export function apiPath(path) {
  const normalized = path.replace(/^\/+|\/+$/g, '');
  return `/api/backend/${normalized}`;
}

export function queryString(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  });
  const value = search.toString();
  return value ? `?${value}` : '';
}

export function resultsOf(payload) {
  return Array.isArray(payload) ? payload : payload?.results || [];
}
