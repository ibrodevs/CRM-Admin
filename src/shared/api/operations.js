import { apiPath, apiRequest, queryString } from './client.js';

export const list = (path, params, signal) => apiRequest(apiPath(path) + queryString(params), { signal });
export const get = (path, signal) => apiRequest(apiPath(path), { signal });
export const create = (path, body, options) => apiRequest(apiPath(path), { method: 'POST', body, ...options });
export const patch = (path, body) => apiRequest(apiPath(path), { method: 'PATCH', body });
export const remove = (path) => apiRequest(apiPath(path), { method: 'DELETE' });
