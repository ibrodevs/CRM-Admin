import { apiPath, apiRequest, queryString } from '../../../shared/api/client.js';
import { list, listAll, get, create, patch, remove } from '../../../shared/api/operations.js';

export const suppliersApi = {
  aviaMarkups: (id) => get(`suppliers/${id}/avia-markups/`),
  saveAviaMarkups: (id, value) => patch(`suppliers/${id}/avia-markups/`, { value }),
  list: (params = {}, signal) => listAll('suppliers/', params, signal),
  settings: (id, signal) => get(`suppliers/${id}/settings/`, signal),
  saveSettings: (id, value) => patch(`suppliers/${id}/settings/`, { value }),
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
