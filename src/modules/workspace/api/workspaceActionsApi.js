import { apiPath, apiRequest, queryString } from '../../../shared/api/client.js';
import { list, get, create, patch, remove } from '../../../shared/api/operations.js';

export const workspaceActionsApi = {
  list: (params = {}, signal) => get(`workspace-actions/${queryString(params)}`, signal),
  execute: (action, { resourceType = '', resourceId = '', payload = {} } = {}) => create('workspace-actions/', {
    action, resource_type: resourceType, resource_id: resourceId, payload,
  }),
};
