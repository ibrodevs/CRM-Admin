import { NextResponse } from 'next/server.js';

import { assertSameOrigin, backendJson, setSessionCookies } from '../../_lib/backend.js';

export async function POST(request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  try {
    const credentials = await request.json();
    const { response, data } = await backendJson('/api/v1/auth/login/', {
      method: 'POST',
      body: { login: credentials.login, password: credentials.password },
    });
    if (!response.ok || data?.two_factor_required) {
      return NextResponse.json(data, { status: response.status });
    }

    const me = await backendJson('/api/v1/me/', { access: data.access });
    const result = NextResponse.json({ authenticated: true, user: me.data }, { status: 200 });
    return setSessionCookies(result, data);
  } catch {
    return NextResponse.json(
      { error: { code: 'BACKEND_UNAVAILABLE', message: 'Не удалось связаться с backend' } },
      { status: 503 },
    );
  }
}
