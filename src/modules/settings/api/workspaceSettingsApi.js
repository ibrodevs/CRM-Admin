import { apiPath, apiRequest, queryString } from '../../../shared/api/client.js';
import { list, get, create, patch, remove } from '../../../shared/api/operations.js';

export const workspaceSettingsApi = {
  get: (namespace, signal) => get(`workspace-settings/${namespace}/`, signal),
  save: (namespace, value) => patch(`workspace-settings/${namespace}/`, { value }),
  getTenant: (namespace, signal) => get(`workspace-settings/${namespace}/${queryString({ scope: 'tenant' })}`, signal),
  saveTenant: (namespace, value) => apiRequest(apiPath(`workspace-settings/${namespace}/`) + queryString({ scope: 'tenant' }), { method: 'PATCH', body: { value } }),
};
