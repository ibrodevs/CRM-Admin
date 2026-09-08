import { apiPath, apiRequest, queryString } from '../../../shared/api/client.js';
import { list, listAll, get, create, patch, remove } from '../../../shared/api/operations.js';

export const usersApi = {
  all: (signal) => listAll('users/', {}, signal),
  list: (params = {}, signal) => list('users/', { page_size: 100, ...params }, signal),
  create: (body) => create('users/', body),
  update: (id, body) => patch(`users/${id}/`, body),
  invite: (id) => create(`users/${id}/invite/`, {}),
  activate: (id) => create(`users/${id}/activate/`, {}),
  suspend: (id, reason = '') => create(`users/${id}/suspend/`, { reason }),
  roles: (signal) => get('roles/', signal),
  updateRole: (id, permissions) => apiRequest(apiPath(`roles/${id}/`), { method: 'PUT', body: { permissions } }),
  userRoles: (id, signal) => get(`users/${id}/roles/`, signal),
  setRoles: (id, roles) => apiRequest(apiPath(`users/${id}/roles/`), { method: 'PUT', body: { roles } }),
  serviceAccess: (id, signal) => get(`users/${id}/service-access/`, signal),
  setServiceAccess: (id, body) => apiRequest(apiPath(`users/${id}/service-access/`), { method: 'PUT', body }),
  sla: (id, signal) => get(`users/${id}/sla/`, signal),
  setSla: (id, minutes) => apiRequest(apiPath(`users/${id}/sla/`), { method: 'PUT', body: { sla_response_minutes: minutes } }),
};
