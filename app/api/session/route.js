import { NextResponse } from 'next/server.js';

import {
  assertSameOrigin,
  authenticatedJson,
  backendJson,
  clearSessionCookies,
  sessionTokens,
  setSessionCookies,
} from '../_lib/backend.js';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const result = await authenticatedJson(request, '/api/v1/me/');
    if (result.status === 200) {
      const response = NextResponse.json({ authenticated: true, user: result.data });
      return result.tokens ? setSessionCookies(response, result.tokens) : response;
    }
    if (result.status === 401) {
      return clearSessionCookies(NextResponse.json({ authenticated: false }, { status: 401 }));
    }
    if (result.status === 503) {
      return NextResponse.json(
        result.data || { error: { code: 'BACKEND_UNAVAILABLE', message: 'Backend временно недоступен' } },
        { status: 503 },
      );
    }
    return NextResponse.json(result.data || { authenticated: false }, { status: result.status || 500 });
  } catch {
    return NextResponse.json({ error: { code: 'BACKEND_UNAVAILABLE', message: 'Backend временно недоступен' } }, { status: 503 });
  }
}

export async function DELETE(request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;
  const { access } = sessionTokens(request);
  try {
    if (access) await backendJson('/api/v1/auth/logout/', { method: 'POST', access });
  } finally {
    return clearSessionCookies(new NextResponse(null, { status: 204 }));
  }
}
