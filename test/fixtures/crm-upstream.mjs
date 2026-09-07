// Local, synthetic upstream for visual and BFF smoke checks. This is not a backend emulator.
// Run explicitly: node test/fixtures/crm-upstream.mjs
import http from 'node:http';

const user = { id: 1, full_name: 'Тестовый Оператор', email: 'architecture@example.test', roles: ['admin'], is_active: true };
const tokens = { access: 'fixture-access', refresh: 'fixture-refresh' };
const port = Number(process.env.FIXTURE_PORT || 3199);
http.createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
    let text = '';
    for await (const chunk of request) text += chunk;
    const input = text ? JSON.parse(text) : {};
    let result = { count: 0, results: [] };
    let status = 200;
    if (request.headers.authorization === 'Bearer fixture-expired') {
      status = 401;
      result = { detail: 'Synthetic expired access token' };
    } else if (pathname.endsWith('/auth/login/')) {
      result = input.login === '2fa@example.test' ? { two_factor_required: true, challenge_token: 'fixture-challenge' } : tokens;
    } else if (pathname.endsWith('/auth/refresh/') || pathname.endsWith('/auth/token/refresh/') || pathname.endsWith('/auth/2fa/verify/')) result = tokens;
    else if (pathname.endsWith('/me/')) result = user;
    else if (pathname.includes('/workspace-settings/')) result = { value: {} };
    else if (pathname.endsWith('/shifts/current/')) result = { shift: null };
    else if (pathname.endsWith('/dashboard/') || pathname.endsWith('/finance/overview/') || pathname.endsWith('/meta/') || pathname.endsWith('/me/preferences/')) result = {};
    else if (pathname.endsWith('/calendar/feed/')) result = { trips: [], events: [], conflicts: [] };
    else if (pathname.endsWith('/auth/2fa/status/')) result = { enabled: false };
    else if (pathname.endsWith('/users/')) result = { count: 1, results: [user] };
    else if (request.method !== 'GET') result = { ...input, id: 100 };
    response.writeHead(status, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(result));
  } catch {
    response.writeHead(422, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ detail: 'This fixture accepts JSON only' }));
  }
}).listen(port, '127.0.0.1', () => console.log(`Synthetic CRM upstream: http://127.0.0.1:${port}`));
