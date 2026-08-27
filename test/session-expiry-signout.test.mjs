import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const client = await readFile(new URL('../js/api/client.js', import.meta.url), 'utf8');
const auth = await readFile(new URL('../js/core/auth-context.jsx', import.meta.url), 'utf8');
const authApi = await readFile(new URL('../js/api/auth.js', import.meta.url), 'utf8');
const app = await readFile(new URL('../js/app.jsx', import.meta.url), 'utf8');
const login = await readFile(new URL('../js/login.jsx', import.meta.url), 'utf8');

function loadClientHooks() {
  const start = client.indexOf('const unauthorizedHandlers = new Set();');
  const end = client.indexOf('export async function apiRequest');
  assert.ok(start >= 0 && end > start, 'unauthorized hooks must exist');
  const source = client.slice(start, end).replace(/export function/g, 'function');
  return Function(`${source}\nreturn { onUnauthorized, notifyUnauthorized };`)();
}

test('any 401 from a working request is broadcast to the auth layer', () => {
  assert.match(client, /const unauthorizedHandlers = new Set\(\);/);
  assert.match(client, /export function onUnauthorized\(handler\)/);
  assert.match(client, /if \(response\.status === 401 && options\.handlesUnauthorized !== true\) notifyUnauthorized\(path\);/);
});

test('session endpoints handle their own 401 and never trigger a sign-out loop', () => {
  // Их 401 — нормальный ответ «не авторизован», а не потеря рабочей сессии.
  assert.match(authApi, /session: \(signal\) => apiRequest\('\/api\/session', \{ signal, handlesUnauthorized: true \}\)/);
  assert.match(authApi, /body: \{ login, password \}, idempotent: false, handlesUnauthorized: true/);
  assert.match(authApi, /body: \{ challenge_token: challengeToken, code \}, idempotent: false, handlesUnauthorized: true/);
  assert.match(authApi, /logout: \(\) => apiRequest\('\/api\/session', \{ method: 'DELETE', idempotent: false, handlesUnauthorized: true \}\)/);
});

test('subscribers are notified and can unsubscribe', () => {
  const { onUnauthorized, notifyUnauthorized } = loadClientHooks();
  const seen = [];
  const off = onUnauthorized((path) => seen.push(path));
  notifyUnauthorized('/api/backend/orders/');
  assert.deepEqual(seen, ['/api/backend/orders/']);
  off();
  notifyUnauthorized('/api/backend/orders/');
  assert.deepEqual(seen, ['/api/backend/orders/']);
});

test('a throwing subscriber cannot break the original request', () => {
  const { onUnauthorized, notifyUnauthorized } = loadClientHooks();
  const seen = [];
  onUnauthorized(() => { throw new Error('boom'); });
  onUnauthorized(() => seen.push('second'));
  notifyUnauthorized('/api/backend/orders/');
  assert.deepEqual(seen, ['second']);
});

test('an expired session drops the operator to the login screen', () => {
  assert.match(auth, /useEffect\(\(\) => onUnauthorized\(endSession\), \[endSession\]\)/);
  assert.match(auth, /const endSession = useCallback\(\(\) => \{/);
  assert.match(auth, /setStatus\(\(current\) => \{\n\s+if \(current === 'authenticated'\) setExpired\(true\);\n\s+return 'anonymous';/);
  // Приложение показывает рабочий экран только авторизованным.
  assert.match(app, /if \(auth\.status !== 'authenticated'\) return <LoginScreen expired=\{auth\.expired\}/);
  assert.match(login, /Сессия истекла — войдите снова, чтобы продолжить работу/);
});

test('the session is revalidated in the background, not only on the next click', () => {
  assert.match(auth, /const SESSION_REVALIDATE_MS = 60_000;/);
  assert.match(auth, /setInterval\(revalidate, SESSION_REVALIDATE_MS\)/);
  assert.match(auth, /document\.addEventListener\('visibilitychange', onVisible\)/);
  assert.match(auth, /window\.addEventListener\('online', revalidate\)/);
  assert.match(auth, /window\.addEventListener\('focus', onVisible\)/);
  // Скрытая вкладка backend не дёргает.
  assert.match(auth, /if \(cancelled \|\| \(typeof document !== 'undefined' && document\.hidden\)\) return;/);
  // Подписки снимаются вместе с сессией.
  assert.match(auth, /clearInterval\(timer\);\n\s+document\.removeEventListener\('visibilitychange', onVisible\);/);
});

test('a fresh login clears the expired notice', () => {
  assert.match(auth, /setStatus\('authenticated'\);\n\s+setExpired\(false\);\n\s+return \{ authenticated: true \};/);
  assert.match(auth, /setExpired\(false\);\n\s+\}, \[challengeToken\]\)/);
  assert.match(auth, /setChallengeToken\(''\);\n\s+setExpired\(false\);/);
});
