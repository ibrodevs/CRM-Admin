import { NextResponse } from 'next/server.js';

import { assertSameOrigin, backendJson } from '../../_lib/backend.js';

export async function POST(request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;
  try {
    const payload = await request.json();
    const { response, data } = await backendJson('/api/v1/auth/password/reset/request/', {
      method: 'POST', body: payload,
    });
    return data === null
      ? new NextResponse(null, { status: response.status })
      : NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: { code: 'BACKEND_UNAVAILABLE', message: 'Не удалось отправить инструкцию' } }, { status: 503 });
  }
}
