import { apiPath, apiRequest, queryString } from '../../../shared/api/client.js';
import { list, get, create, patch, remove } from '../../../shared/api/operations.js';

export const groupsApi = {
  list: (params = {}, signal) => list('group-orders/', { page_size: 100, ...params }, signal),
  create: (body) => create('group-orders/', body),
  detail: (id, signal) => get(`group-orders/${id}/`, signal),
  transition: (id, targetStatus) => create(`group-orders/${id}/transition/`, { target_status: targetStatus }),
  blocks: (id, body) => create(`group-orders/${id}/blocks/`, body),
  matrix: (id, signal) => get(`group-orders/${id}/matrix/`, signal),
  massAction: (id, body) => create(`group-orders/${id}/mass-actions/`, body),
  requests: (id, body) => create(`group-orders/${id}/requests/`, body),
  responses: (id, signal) => get(`group-orders/${id}/supplier-responses/`, signal),
};
