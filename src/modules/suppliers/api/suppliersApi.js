import { apiPath, apiRequest, queryString } from '../../../shared/api/client.js';
import { list, get, create, patch, remove } from '../../../shared/api/operations.js';

export const suppliersApi = {
  list: (params = {}, signal) => list('suppliers/', { page_size: 100, ...params }, signal),
  create: (body) => create('suppliers/', body),
  update: (id, body) => patch(`suppliers/${id}/`, body),
  credentials: (id, signal) => get(`suppliers/${id}/credentials/`, signal),
  saveCredential: (id, body) => create(`suppliers/${id}/credentials/`, body),
  checkConnection: (id) => create(`suppliers/${id}/check-connection/`, {}),
  markupRules: (id, signal) => get(`suppliers/${id}/markup-rules/`, signal),
  createMarkupRule: (id, body) => create(`suppliers/${id}/markup-rules/`, body),
  searchPriorities: (signal) => get('supplier-search-priorities/', signal),
  saveSearchPriority: (body) => create('supplier-search-priorities/', body),
};
