import { NextResponse } from 'next/server.js';

const ACCESS_COOKIE = 'travelhub_access';
const REFRESH_COOKIE = 'travelhub_refresh';
const ACCESS_MAX_AGE = 15 * 60;
const REFRESH_MAX_AGE = 30 * 24 * 60 * 60;

const refreshLocks = new Map();

function backendOrigin() {
  const value = process.env.BACKEND_URL || 'http://127.0.0.1:8000';
  return value.replace(/\/+$/, '').replace(/\/api\/v1$/, '');
}

function backendUrl(pathname, search = '') {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${backendOrigin()}${path}${search}`;
}

function cookieOptions(maxAge) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
  };
}

export function setSessionCookies(response, tokens) {
  if (tokens.access) {
    response.cookies.set(ACCESS_COOKIE, tokens.access, cookieOptions(ACCESS_MAX_AGE));
  }
  if (tokens.refresh) {
    response.cookies.set(REFRESH_COOKIE, tokens.refresh, cookieOptions(REFRESH_MAX_AGE));
  }
  return response;
}

export function clearSessionCookies(response) {
  response.cookies.set(ACCESS_COOKIE, '', cookieOptions(0));
  response.cookies.set(REFRESH_COOKIE, '', cookieOptions(0));
  return response;
}

export function sessionTokens(request) {
  return {
    access: request.cookies.get(ACCESS_COOKIE)?.value || '',
    refresh: request.cookies.get(REFRESH_COOKIE)?.value || '',
  };
}

export function assertSameOrigin(request) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return null;
  const origin = request.headers.get('origin');
  if (!origin) return null;
  const originUrl = new URL(origin);
  const requestHost = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (!requestHost || originUrl.host !== requestHost) {
    return NextResponse.json(
      { error: { code: 'INVALID_ORIGIN', message: 'Запрос отклонён политикой безопасности' } },
      { status: 403 },
    );
  }
  return null;
}

async function parseBody(response) {
  if (response.status === 204) return null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return response.json();
  return response.arrayBuffer();
}

async function refreshTokens(refresh) {
  if (!refresh) return { tokens: null, status: 401, clear: true };
  if (refreshLocks.has(refresh)) return refreshLocks.get(refresh);

  const pending = (async () => {
    try {
      const response = await fetch(backendUrl('/api/v1/auth/token/refresh/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refresh }),
        cache: 'no-store',
      });
      if (!response.ok) {
        return {
          tokens: null,
          status: response.status,
          clear: response.status === 400 || response.status === 401,
          unavailable: response.status >= 500,
        };
      }
      return { tokens: await response.json(), status: response.status, clear: false };
    } catch {
      return { tokens: null, status: 503, clear: false, unavailable: true };
    } finally {
      refreshLocks.delete(refresh);
    }
  })();
  refreshLocks.set(refresh, pending);
  return pending;
}

function forwardedHeaders(request, access, contentType) {
  const headers = new Headers();
  headers.set('Accept', request.headers.get('accept') || 'application/json');
  if (contentType) headers.set('Content-Type', contentType);
  if (access) headers.set('Authorization', `Bearer ${access}`);
  const idempotencyKey = request.headers.get('idempotency-key');
  if (idempotencyKey) headers.set('Idempotency-Key', idempotencyKey);
  const requestId = request.headers.get('x-request-id');
  if (requestId) headers.set('X-Request-ID', requestId);
  return headers;
}

async function perform(request, pathname, access, body) {
  const contentType = request.headers.get('content-type') || undefined;
  return fetch(backendUrl(pathname, new URL(request.url).search), {
    method: request.method,
    headers: forwardedHeaders(request, access, contentType),
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : body,
    cache: 'no-store',
    redirect: 'manual',
  });
}

export async function proxyToBackend(request, pathname) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const tokens = sessionTokens(request);
  const body = ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer();
  let freshTokens = null;

  try {
    let backendResponse = await perform(request, pathname, tokens.access, body);
    let refreshResult = null;
    if (backendResponse.status === 401 && tokens.refresh) {
      refreshResult = await refreshTokens(tokens.refresh);
      freshTokens = refreshResult.tokens;
      if (refreshResult.unavailable) {
        return NextResponse.json(
          { error: { code: 'BACKEND_UNAVAILABLE', message: 'Backend временно недоступен' } },
          { status: 503 },
        );
      }
      if (freshTokens?.access) {
        backendResponse = await perform(request, pathname, freshTokens.access, body);
      }
    }

    const responseBody = await parseBody(backendResponse);
    const headers = new Headers();
    const contentType = backendResponse.headers.get('content-type');
    const disposition = backendResponse.headers.get('content-disposition');
    if (contentType) headers.set('Content-Type', contentType);
    if (disposition) headers.set('Content-Disposition', disposition);
    const requestId = backendResponse.headers.get('x-request-id');
    if (requestId) headers.set('X-Request-ID', requestId);

    const response = responseBody === null
      ? new NextResponse(null, { status: backendResponse.status, headers })
      : responseBody instanceof ArrayBuffer
        ? new NextResponse(responseBody, { status: backendResponse.status, headers })
        : NextResponse.json(responseBody, { status: backendResponse.status, headers });

    if (freshTokens) setSessionCookies(response, freshTokens);
    if (backendResponse.status === 401 && (!tokens.refresh || refreshResult?.clear || freshTokens?.access)) {
      clearSessionCookies(response);
    }
    return response;
  } catch {
    return NextResponse.json(
      { error: { code: 'BACKEND_UNAVAILABLE', message: 'Backend временно недоступен' } },
      { status: 503 },
    );
  }
}

export async function backendJson(pathname, { method = 'GET', body, access } = {}) {
  const response = await fetch(backendUrl(pathname), {
    method,
    headers: {
      Accept: 'application/json',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(access ? { Authorization: `Bearer ${access}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  const data = await parseBody(response);
  return { response, data };
}

export async function authenticatedJson(request, pathname) {
  const tokens = sessionTokens(request);
  if (!tokens.access && !tokens.refresh) return { status: 401, data: null, tokens: null };

  let result = await backendJson(pathname, { access: tokens.access });
  let freshTokens = null;
  let refreshClear = false;
  if (result.response.status === 401 && tokens.refresh) {
    const refreshResult = await refreshTokens(tokens.refresh);
    freshTokens = refreshResult.tokens;
    refreshClear = refreshResult.clear;
    if (refreshResult.unavailable) {
      return {
        status: 503,
        data: { error: { code: 'BACKEND_UNAVAILABLE', message: 'Backend временно недоступен' } },
        tokens: null,
        refreshClear: false,
      };
    }
    if (freshTokens?.access) result = await backendJson(pathname, { access: freshTokens.access });
  }
  return { status: result.response.status, data: result.data, tokens: freshTokens, refreshClear };
}

export const __authProxyInternals = {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  backendOrigin,
  backendUrl,
  cookieOptions,
  refreshTokens,
};
