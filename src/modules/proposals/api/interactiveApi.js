import { apiPath, apiRequest } from '../../../shared/api/client.js';
export const interactiveApi = {
  get: (id, signal) => apiRequest(apiPath(`proposals/${id}/workspace/`), { signal }),
  save: (id, version, draft, order) => apiRequest(apiPath(`proposals/${id}/workspace/`), { method: 'PUT', body: { version, draft, order } }),
  prepareServices: (id, version) => apiRequest(apiPath(`proposals/${id}/prepare-services/`), { method: 'POST', body: { version } }),
  publish: (id, version, final = false) => apiRequest(apiPath(`proposals/${id}/publish/`), { method: 'POST', body: { version, final } }),
};
export async function publicQuote(token, action = '', body, signal) {
  const response = await fetch(`/api/quotes/${encodeURIComponent(token)}${action ? `/${action}` : ''}`, {
    method: body ? 'POST' : 'GET', cache: 'no-store', signal,
    headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || data.detail || 'Не удалось загрузить предложение');
  return data;
}
