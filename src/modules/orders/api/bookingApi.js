import { apiPath, apiRequest, queryString } from '../../../shared/api/client.js';
import { list, get, create, patch, remove } from '../../../shared/api/operations.js';

export const bookingApi = {
  create: (body) => create('booking-workflows/', body),
  preflight: (id) => create(`booking-workflows/${id}/preflight/`, {}),
  start: (id, confirm = false) => create(`booking-workflows/${id}/start/`, { confirm }),
  status: (id, signal) => get(`booking-workflows/${id}/status/`, signal),
  issue: (id, body = {}) => create(`booking-workflows/${id}/issue/`, body),
  inquiry: (id, item) => create(`booking-workflows/${id}/status-inquiry/`, { item }),
  cancel: (id, reason) => create(`booking-workflows/${id}/cancel/`, { reason }),
};
