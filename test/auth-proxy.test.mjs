import assert from 'node:assert/strict';
import test from 'node:test';

process.env.BACKEND_URL = 'https://backend.example.com/api/v1';

function cookieHeader(response) {
  return response.headers.get('set-cookie') || '';
}

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

function makeRequest({
  method = 'GET',
  url = 'https://crm.example.com/api/session',
  cookies = {},
  headers = {},
  body,
} = {}) {
  const normalizedHeaders = new Headers(headers);
  if (!normalizedHeaders.has('host')) normalizedHeaders.set('host', 'crm.example.com');
  return {
    method,
    url,
    headers: normalizedHeaders,
    cookies: {
      get(name) {
        return cookies[name] ? { name, value: cookies[name] } : undefined;
      },
    },
    async json() {
      return body || {};
    },
    async arrayBuffer() {
      if (body == null) return new ArrayBuffer(0);
      return new TextEncoder().encode(typeof body === 'string' ? body : JSON.stringify(body)).buffer;
    },
  };
}

function mockFetch(handler) {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    return handler(String(url), init, calls.length);
  };
  return calls;
}

test('login sets access and refresh HttpOnly cookies', async () => {
  const { POST } = await import('../app/api/session/login/route.js');
  mockFetch((url) => {
    if (url.endsWith('/api/v1/auth/login/')) {
      return jsonResponse({ access: 'access-token', refresh: 'refresh-token' });
    }
    if (url.endsWith('/api/v1/me/')) return jsonResponse({ id: 'user-1', email: 'admin@example.com' });
    throw new Error(`Unexpected URL ${url}`);
  });

  const response = await POST(makeRequest({
    method: 'POST',
    headers: { origin: 'https://crm.example.com' },
    body: { login: 'admin@example.com', password: 'secret' },
  }));

  assert.equal(response.status, 200);
  const cookies = cookieHeader(response);
  assert.match(cookies, /travelhub_access=access-token/);
  assert.match(cookies, /travelhub_refresh=refresh-token/);
  assert.match(cookies, /HttpOnly/i);
  assert.match(cookies, /SameSite=Lax/i);
  assert.match(cookies, /Path=\//i);
});

test('session returns authenticated with valid access token', async () => {
  const { GET } = await import('../app/api/session/route.js');
  mockFetch((url, init) => {
    assert.equal(init.headers.Authorization, 'Bearer valid-access');
    return jsonResponse({ id: 'user-1', email: 'admin@example.com' });
  });

  const response = await GET(makeRequest({ cookies: { travelhub_access: 'valid-access' } }));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.authenticated, true);
  assert.equal(cookieHeader(response), '');
});

test('session refreshes expired access and keeps old refresh when backend returns access only', async () => {
  const { GET } = await import('../app/api/session/route.js');
  mockFetch((url, init, index) => {
    if (index === 1) return jsonResponse({ error: { code: 'token_not_valid' } }, 401);
    if (url.endsWith('/api/v1/auth/token/refresh/')) return jsonResponse({ access: 'new-access' });
    assert.equal(init.headers.Authorization, 'Bearer new-access');
    return jsonResponse({ id: 'user-1', email: 'admin@example.com' });
  });

  const response = await GET(makeRequest({
    cookies: { travelhub_access: 'expired-access', travelhub_refresh: 'valid-refresh' },
  }));

  assert.equal(response.status, 200);
  const cookies = cookieHeader(response);
  assert.match(cookies, /travelhub_access=new-access/);
  assert.doesNotMatch(cookies, /travelhub_refresh=/);
});

test('session clears cookies when refresh token is invalid', async () => {
  const { GET } = await import('../app/api/session/route.js');
  mockFetch((url) => {
    if (url.endsWith('/api/v1/auth/token/refresh/')) {
      return jsonResponse({ error: { code: 'INVALID_REFRESH_TOKEN' } }, 401);
    }
    return jsonResponse({ error: { code: 'token_not_valid' } }, 401);
  });

  const response = await GET(makeRequest({
    cookies: { travelhub_access: 'expired-access', travelhub_refresh: 'bad-refresh' },
  }));

  assert.equal(response.status, 401);
  const cookies = cookieHeader(response);
  assert.match(cookies, /travelhub_access=/);
  assert.match(cookies, /travelhub_refresh=/);
  assert.match(cookies, /Max-Age=0/i);
});

test('session returns 503 and does not clear cookies when backend is unavailable', async () => {
  const { GET } = await import('../app/api/session/route.js');
  globalThis.fetch = async () => {
    throw new Error('network down');
  };

  const response = await GET(makeRequest({ cookies: { travelhub_access: 'valid-access' } }));
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(body.error.code, 'BACKEND_UNAVAILABLE');
  assert.equal(cookieHeader(response), '');
});

test('backend proxy preserves permission denial without clearing cookies', async () => {
  const { GET } = await import('../app/api/backend/[...path]/route.js');
  mockFetch((url, init) => {
    assert.equal(url, 'https://backend.example.com/api/v1/users/');
    assert.equal(init.headers.get('Authorization'), 'Bearer operator-access');
    return jsonResponse({ error: { code: 'PERMISSION_DENIED', message: 'Недостаточно прав' } }, 403);
  });

  const response = await GET(
    makeRequest({
      url: 'https://crm.example.com/api/backend/users',
      cookies: { travelhub_access: 'operator-access', travelhub_refresh: 'operator-refresh' },
    }),
    { params: { path: ['users'] } },
  );
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.error.code, 'PERMISSION_DENIED');
  assert.equal(cookieHeader(response), '');
});

test('backend proxy refreshes once, preserves body, and forwards authorization', async () => {
  const { POST } = await import('../app/api/backend/[...path]/route.js');
  const calls = mockFetch(async (url, init, index) => {
    if (index === 1) {
      assert.equal(url, 'https://backend.example.com/api/v1/orders/');
      assert.equal(init.headers.get('Authorization'), 'Bearer expired-access');
      assert.equal(new TextDecoder().decode(init.body), '{"hello":"world"}');
      return jsonResponse({ error: { code: 'token_not_valid' } }, 401);
    }
    if (url.endsWith('/api/v1/auth/token/refresh/')) {
      assert.equal(JSON.parse(init.body).refresh, 'valid-refresh');
      return jsonResponse({ access: 'fresh-access', refresh: 'fresh-refresh' });
    }
    assert.equal(url, 'https://backend.example.com/api/v1/orders/');
    assert.equal(init.headers.get('Authorization'), 'Bearer fresh-access');
    assert.equal(new TextDecoder().decode(init.body), '{"hello":"world"}');
    return jsonResponse({ ok: true }, 201, { 'X-Request-ID': 'req-1' });
  });

  const response = await POST(
    makeRequest({
      method: 'POST',
      url: 'https://crm.example.com/api/backend/orders',
      cookies: { travelhub_access: 'expired-access', travelhub_refresh: 'valid-refresh' },
      headers: { origin: 'https://crm.example.com', 'content-type': 'application/json' },
      body: { hello: 'world' },
    }),
    { params: { path: ['orders'] } },
  );

  assert.equal(response.status, 201);
  assert.equal(calls.length, 3);
  assert.match(cookieHeader(response), /travelhub_access=fresh-access/);
  assert.match(cookieHeader(response), /travelhub_refresh=fresh-refresh/);
  assert.equal(response.headers.get('x-request-id'), 'req-1');
});

test('logout clears both cookies', async () => {
  const { DELETE } = await import('../app/api/session/route.js');
  mockFetch((url, init) => {
    assert.equal(url, 'https://backend.example.com/api/v1/auth/logout/');
    assert.equal(init.headers.Authorization, 'Bearer valid-access');
    return new Response(null, { status: 204 });
  });

  const response = await DELETE(makeRequest({
    method: 'DELETE',
    headers: { origin: 'https://crm.example.com' },
    cookies: { travelhub_access: 'valid-access', travelhub_refresh: 'valid-refresh' },
  }));

  assert.equal(response.status, 204);
  const cookies = cookieHeader(response);
  assert.match(cookies, /travelhub_access=/);
  assert.match(cookies, /travelhub_refresh=/);
  assert.match(cookies, /Max-Age=0/i);
});
