import { NextResponse } from 'next/server';
import { assertSameOrigin, backendJson } from '../../../../../src/server/bff/backend.js';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
async function handle(request, { params }) {
  const { token, action = [] } = await params;
  const name = action.join('/');
  if (!/^[A-Za-z0-9_-]{30,64}$/.test(token) || !['', 'respond', 'refresh'].includes(name) || (request.method === 'GET' && name) || (request.method === 'POST' && !name)) return NextResponse.json({ error: { message: 'Страница не найдена' } }, { status: 404 });
  const denied = assertSameOrigin(request);
  if (denied) return denied;
  try {
    const body = request.method === 'POST' ? await request.json() : undefined;
    const result = await backendJson(`/api/v1/public/proposals/${token}/${name ? `${name}/` : ''}`, { method: request.method, body });
    return NextResponse.json(result.data, { status: result.response.status, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex' } });
  } catch {
    return NextResponse.json({ error: { message: 'Не удалось связаться с CRM. Повторите позже.' } }, { status: 502 });
  }
}
export const GET = handle;
export const POST = handle;
