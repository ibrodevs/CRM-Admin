import { NextResponse } from 'next/server.js';

import { assertSameOrigin, backendJson, setSessionCookies } from '../../_lib/backend.js';

export async function POST(request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;
  try {
    const payload = await request.json();
    const { response, data } = await backendJson('/api/v1/auth/2fa/verify/', {
      method: 'POST', body: payload,
    });
    if (!response.ok) return NextResponse.json(data, { status: response.status });
    const me = await backendJson('/api/v1/me/', { access: data.access });
    const result = NextResponse.json({ authenticated: true, user: me.data });
    return setSessionCookies(result, data);
  } catch {
    return NextResponse.json({ error: { code: 'BACKEND_UNAVAILABLE', message: 'Не удалось подтвердить вход' } }, { status: 503 });
  }
}
