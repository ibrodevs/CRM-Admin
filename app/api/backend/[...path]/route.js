import { proxyToBackend } from '../../_lib/backend';

export const dynamic = 'force-dynamic';

function handler(request, { params }) {
  const path = Array.isArray(params.path) ? params.path.join('/') : '';
  return proxyToBackend(request, `/api/v1/${path}${path.endsWith('/') ? '' : '/'}`);
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
