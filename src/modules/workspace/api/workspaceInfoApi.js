import { apiPath, apiRequest, queryString } from '../../../shared/api/client.js';
import { list, get, create, patch, remove } from '../../../shared/api/operations.js';

export const workspaceInfoApi = {
  meta: (signal) => get('meta/', signal),
  globalSearch: (q, signal) => list('search/', { q }, signal),
};
