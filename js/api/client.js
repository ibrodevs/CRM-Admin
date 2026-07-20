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

function errorFrom(response, payload) {
  const error = payload?.error || payload || {};
  return new ApiError(error.message || `Ошибка запроса (${response.status})`, {
    status: response.status,
    code: error.code || 'REQUEST_FAILED',
    fields: error.fields || {},
    details: error.details || {},
    requestId: error.request_id || response.headers.get('x-request-id') || '',
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
  if (!response.ok) throw errorFrom(response, payload);
  return payload;
}

export function apiPath(path) {
  const normalized = path.startsWith('/') ? path.slice(1) : path;
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

