import { apiPath, apiRequest, queryString } from '../../../shared/api/client.js';
import { list, get, create, patch, remove } from '../../../shared/api/operations.js';

export const workspaceApi = {
  dashboard: (params = {}, signal) => list('dashboard/', params, signal),
  calendar: (params = {}, signal) => list('calendar/feed/', params, signal),
  proposals: (params = {}, signal) => list('proposals/', { page_size: 100, ...params }, signal),
  documents: (params = {}, signal) => list('documents/', { page_size: 100, ...params }, signal),
  returns: (params = {}, signal) => list('after-sales/', { page_size: 100, ...params }, signal),
  financeOverview: (signal) => get('finance/overview/', signal),
  transactions: (params = {}, signal) => list('finance/transactions/', { page_size: 100, ...params }, signal),
  users: (params = {}, signal) => list('users/', { page_size: 100, ...params }, signal),
  meta: (signal) => get('meta/', signal),
  globalSearch: (q, signal) => list('search/', { q }, signal),
};
