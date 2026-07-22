const BASE_URL = (process.env.SMOKE_BASE_URL || 'https://crm-admin-theta.vercel.app').replace(/\/+$/, '');
const LOGIN = process.env.SMOKE_LOGIN;
const PASSWORD = process.env.SMOKE_PASSWORD;
const EXPIRED_ACCESS = process.env.SMOKE_EXPIRED_ACCESS;
const SKIP_LOGOUT = process.env.SMOKE_SKIP_LOGOUT === '1';

const DEFAULT_ENDPOINTS = [
  '/api/backend/me',
  '/api/backend/orders',
  '/api/backend/clients',
  '/api/backend/persons',
  '/api/backend/companies',
  '/api/backend/suppliers',
  '/api/backend/services',
  '/api/backend/proposals',
  '/api/backend/documents',
  '/api/backend/after-sales',
  '/api/backend/finance/overview',
  '/api/backend/finance/transactions',
  '/api/backend/users',
  '/api/backend/notifications',
  '/api/backend/chat/threads',
  '/api/backend/calendar/feed',
  '/api/backend/dashboard',
  '/api/backend/meta',
];

const ENDPOINTS = (process.env.SMOKE_ENDPOINTS || DEFAULT_ENDPOINTS.join(','))
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const jar = new Map();

function splitSetCookie(value) {
  if (!value) return [];
  return value.split(/,(?=\s*[^;,\s]+=)/g).map((item) => item.trim()).filter(Boolean);
}

function setCookiesFrom(response) {
  const values = typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : splitSetCookie(response.headers.get('set-cookie'));
  for (const cookie of values) {
    const [pair] = cookie.split(';');
    const index = pair.indexOf('=');
    if (index === -1) continue;
    const name = pair.slice(0, index).trim();
    const value = pair.slice(index + 1);
    if (value) jar.set(name, value);
    else jar.delete(name);
  }
  return values;
}

function cookieHeader() {
  return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
}

async function request(method, path, body) {
  const headers = { Accept: 'application/json' };
  const cookies = cookieHeader();
  if (cookies) headers.Cookie = cookies;
  const init = { method, headers, cache: 'no-store', redirect: 'manual' };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  const response = await fetch(`${BASE_URL}${path}`, init);
  const setCookie = setCookiesFrom(response);
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  return { response, data, setCookie };
}

function assertStatus(label, actual, expected) {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`);
}

function assertCookie(setCookie, name) {
  const cookie = setCookie.find((item) => item.toLowerCase().startsWith(`${name.toLowerCase()}=`));
  if (!cookie) throw new Error(`Missing Set-Cookie for ${name}`);
  if (!/httponly/i.test(cookie)) throw new Error(`${name} is not HttpOnly`);
  if (!/samesite=lax/i.test(cookie)) throw new Error(`${name} does not use SameSite=Lax`);
  if (BASE_URL.startsWith('https://') && !/secure/i.test(cookie)) throw new Error(`${name} is not Secure on HTTPS`);
}

async function main() {
  if (!LOGIN || !PASSWORD) {
    throw new Error('Set SMOKE_LOGIN and SMOKE_PASSWORD for a production login smoke.');
  }

  console.log(`Smoke base: ${BASE_URL}`);
  const login = await request('POST', '/api/session/login', { login: LOGIN, password: PASSWORD });
  assertStatus('login', login.response.status, 200);
  assertCookie(login.setCookie, 'travelhub_access');
  assertCookie(login.setCookie, 'travelhub_refresh');
  console.log('login 200, cookies set');

  const session = await request('GET', '/api/session');
  assertStatus('session', session.response.status, 200);
  if (!session.data?.authenticated) throw new Error('session did not return authenticated=true');
  console.log('session 200 authenticated');

  if (EXPIRED_ACCESS) {
    jar.set('travelhub_access', EXPIRED_ACCESS);
    const refreshed = await request('GET', '/api/backend/orders');
    assertStatus('refresh via orders', refreshed.response.status, 200);
    if (jar.get('travelhub_access') === EXPIRED_ACCESS) {
      throw new Error('refresh smoke did not replace expired access cookie');
    }
    console.log('refresh 200, access cookie rotated');
  }

  for (const endpoint of ENDPOINTS) {
    const result = await request('GET', endpoint);
    assertStatus(endpoint, result.response.status, 200);
    console.log(`${endpoint} 200`);
  }

  if (!SKIP_LOGOUT) {
    const logout = await request('DELETE', '/api/session');
    assertStatus('logout', logout.response.status, 204);
    const afterLogout = await request('GET', '/api/session');
    assertStatus('session after logout', afterLogout.response.status, 401);
    console.log('logout 204, session 401');
  }

  console.log('Production smoke passed.');
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
